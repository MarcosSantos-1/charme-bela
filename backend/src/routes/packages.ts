import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { assertStartTimeOnSchedule } from '../utils/scheduleValidation'
import { newPaymentHoldExpiration, countActivePaymentHolds, PAYMENT_HOLD_MINUTES } from '../utils/paymentHolds'
import { notifyAdminNewAppointmentRequest, createNotification } from '../utils/notifications'
import { refundPayment } from '../lib/asaas'
import {
  PACKAGE_PURCHASE_INCLUDE,
  PackageError,
  findPaidActivePurchase,
  loadPackageService,
  nextSessionIndexes,
  refreshPurchaseStatus,
  remainingSessions,
  snapshotFromItems,
} from '../utils/packages'

class SlotTakenError extends Error {
  constructor() {
    super('Slot ocupado')
    this.name = 'SlotTakenError'
  }
}

class CapacityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CapacityError'
  }
}

type SlotInput = { startTime: string }

function parseSlots(raw: unknown): Date[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const value = typeof item === 'string' ? item : item?.startTime
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      throw new PackageError('Data/hora de sessão inválida')
    }
    return date
  })
}

export async function packagesRoutes(app: FastifyInstance) {
  app.get('/packages/purchases', async (request, reply) => {
    logger.route('GET', '/packages/purchases')
    try {
      const { userId, status } = request.query as { userId?: string; status?: string }
      const purchases = await prisma.packagePurchase.findMany({
        where: {
          ...(userId && { userId }),
          ...(status && { status: status.toUpperCase() as any }),
        },
        include: PACKAGE_PURCHASE_INCLUDE,
        orderBy: { createdAt: 'desc' },
      })
      return reply.status(200).send({
        success: true,
        data: purchases.map(serializePurchase),
      })
    } catch (error) {
      logger.error('Erro ao listar compras de pacote:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao listar pacotes' })
    }
  })

  app.get('/packages/purchases/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/packages/purchases/${id}`)
    try {
      const purchase = await prisma.packagePurchase.findUnique({
        where: { id },
        include: PACKAGE_PURCHASE_INCLUDE,
      })
      if (!purchase) {
        return reply.status(404).send({ success: false, error: 'Compra de pacote não encontrada' })
      }
      return reply.status(200).send({ success: true, data: serializePurchase(purchase) })
    } catch (error) {
      logger.error('Erro ao buscar pacote:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao buscar pacote' })
    }
  })

  // Cliente: primeira compra (slots opcionais) → hold Asaas
  // Admin: paidAtClinic=true cria purchase ACTIVE, slots opcionais
  app.post('/packages/purchases', async (request, reply) => {
    logger.route('POST', '/packages/purchases')
    try {
      const body = request.body as {
        userId: string
        serviceId: string
        slots?: SlotInput[] | string[]
        paidAtClinic?: boolean
        notes?: string
      }

      const { userId, serviceId, paidAtClinic, notes } = body
      if (!userId || !serviceId) {
        return reply.status(400).send({ success: false, error: 'userId e serviceId são obrigatórios' })
      }

      const slots = parseSlots(body.slots)

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { anamnesisForm: true },
      })
      if (!user) {
        return reply.status(404).send({ success: false, error: 'Usuário não encontrado' })
      }

      const hasAppointments = await prisma.appointment.count({
        where: { userId, status: { not: 'CANCELED' } },
      })
      if (hasAppointments === 0 && !user.anamnesisForm?.termsAccepted) {
        return reply.status(400).send({
          success: false,
          error: 'É necessário preencher a ficha de anamnese antes do primeiro agendamento',
        })
      }

      const service = await loadPackageService(serviceId)
      const existingPaid = await findPaidActivePurchase(userId, serviceId)
      if (existingPaid && remainingSessions(existingPaid) > 0) {
        return reply.status(409).send({
          success: false,
          error: 'Você já tem este pacote ativo. Continue pelas sessões restantes.',
          data: serializePurchase(existingPaid),
        })
      }

      const pendingPurchase = await prisma.packagePurchase.findFirst({
        where: {
          userId,
          packageServiceId: serviceId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
      })
      if (pendingPurchase) {
        return reply.status(409).send({
          success: false,
          error: 'Já existe uma compra deste pacote aguardando pagamento. Conclua ou cancele o checkout.',
          data: { id: pendingPurchase.id },
        })
      }

      if (slots.length > service.packageSessionCount!) {
        return reply.status(400).send({
          success: false,
          error: `Este pacote tem ${service.packageSessionCount} sessões. Escolha no máximo essa quantidade de datas.`,
        })
      }

      if (!paidAtClinic && slots.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Escolha pelo menos uma data para iniciar o pacote',
        })
      }

      if (!paidAtClinic) {
        const activeHolds = await countActivePaymentHolds(userId)
        if (activeHolds >= 2) {
          return reply.status(429).send({
            success: false,
            error: 'Você já tem reservas aguardando pagamento. Conclua ou cancele uma antes de comprar o pacote.',
          })
        }
      }

      const duration = service.duration
      const config = await prisma.systemConfig.findFirst()
      const maxSimultaneous = config?.maxSimultaneous || 1
      const paymentExpiresAt = paidAtClinic ? null : newPaymentHoldExpiration()
      const origin = paidAtClinic ? 'ADMIN_CREATED' : 'PACKAGE'
      const snapshot = snapshotFromItems(service.packageItems)

      for (const start of slots) {
        const scheduleCheck = await assertStartTimeOnSchedule(start, duration, {
          adminExtended: Boolean(paidAtClinic),
          machineKind: service.machineKind,
        })
        if (!scheduleCheck.ok) {
          return reply.status(400).send({ success: false, error: scheduleCheck.error })
        }
      }

      const uniqueTimes = new Set(slots.map((s) => s.getTime()))
      if (uniqueTimes.size !== slots.length) {
        return reply.status(400).send({ success: false, error: 'As sessões não podem ser no mesmo horário' })
      }

      let purchase
      try {
        purchase = await prisma.$transaction(async (tx) => {
          for (const start of slots) {
            const end = new Date(start.getTime() + duration * 60000)
            const overlapping = await tx.appointment.count({
              where: {
                status: { not: 'CANCELED' },
                startTime: { lt: end },
                endTime: { gt: start },
              },
            })
            if (overlapping >= maxSimultaneous) {
              throw new SlotTakenError()
            }
          }

          const created = await tx.packagePurchase.create({
            data: {
              userId,
              packageServiceId: serviceId,
              sessionCount: service.packageSessionCount!,
              sessionsScheduled: slots.length,
              pricePaid: service.price,
              paymentStatus: paidAtClinic ? 'PAID' : 'PENDING',
              status: paidAtClinic
                ? slots.length >= service.packageSessionCount!
                  ? 'COMPLETED'
                  : 'ACTIVE'
                : 'PENDING',
              itemsSnapshot: snapshot as any,
              installmentsAllowed: service.installmentsAllowed,
              paymentExpiresAt,
            },
          })

          for (let i = 0; i < slots.length; i++) {
            const start = slots[i]
            const end = new Date(start.getTime() + duration * 60000)
            await tx.appointment.create({
              data: {
                userId,
                serviceId,
                startTime: start,
                endTime: end,
                status: 'PENDING',
                origin: origin as any,
                paymentStatus: paidAtClinic ? 'PAID' : 'PENDING',
                paymentAmount: i === 0 ? service.price : 0,
                paymentExpiresAt,
                notes,
                packagePurchaseId: created.id,
                packageSessionIndex: i + 1,
              },
            })
          }

          return tx.packagePurchase.findUniqueOrThrow({
            where: { id: created.id },
            include: PACKAGE_PURCHASE_INCLUDE,
          })
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (txError: any) {
        if (txError instanceof SlotTakenError || txError?.code === 'P2034') {
          return reply.status(409).send({
            success: false,
            error: 'Um dos horários acabou de ser reservado. Escolha outras datas.',
          })
        }
        throw txError
      }

      if (!paidAtClinic && purchase.appointments[0]) {
        await notifyAdminNewAppointmentRequest({
          clientName: user.name,
          serviceName: service.name,
          startTime: purchase.appointments[0].startTime,
          appointmentId: purchase.appointments[0].id,
        })
        if (paymentExpiresAt) {
          await createNotification({
            userId,
            type: 'SYSTEM_MESSAGE',
            title: 'Pagamento do pacote pendente ⏳',
            message: `Seu pacote ${service.name} está reservado por ${PAYMENT_HOLD_MINUTES} minutos. Conclua o pagamento para confirmar as sessões.`,
            icon: 'CARD',
            priority: 'URGENT',
            actionUrl: '/cliente/agenda',
            actionLabel: 'Pagar agora',
            metadata: {
              packagePurchaseId: purchase.id,
              appointmentId: purchase.appointments[0].id,
              paymentExpiresAt: paymentExpiresAt.toISOString(),
            },
            expiresAt: paymentExpiresAt,
          })
        }
      }

      logger.success(`Pacote comprado: ${purchase.id} (${service.name})`)
      return reply.status(201).send({
        success: true,
        data: serializePurchase(purchase),
        message: paidAtClinic
          ? 'Pacote registrado. Sessões restantes podem ser agendadas.'
          : 'Reserva criada. Conclua o pagamento para confirmar o pacote.',
      })
    } catch (error) {
      if (error instanceof PackageError) {
        return reply.status(error.statusCode).send({ success: false, error: error.message })
      }
      logger.error('Erro ao comprar pacote:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao comprar pacote' })
    }
  })

  // Agendar sessões restantes de um pacote já pago
  app.post('/packages/purchases/:id/sessions', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('POST', `/packages/purchases/${id}/sessions`)
    try {
      const body = request.body as { slots?: SlotInput[] | string[]; notes?: string; adminExtended?: boolean }
      const slots = parseSlots(body.slots)
      if (slots.length === 0) {
        return reply.status(400).send({ success: false, error: 'Escolha pelo menos uma data' })
      }

      const purchase = await prisma.packagePurchase.findUnique({
        where: { id },
        include: PACKAGE_PURCHASE_INCLUDE,
      })
      if (!purchase) {
        return reply.status(404).send({ success: false, error: 'Compra de pacote não encontrada' })
      }
      if (purchase.paymentStatus !== 'PAID' || purchase.status === 'CANCELED' || purchase.status === 'REFUNDED') {
        return reply.status(400).send({ success: false, error: 'Este pacote ainda não está pago' })
      }

      const remaining = remainingSessions(purchase)
      if (slots.length > remaining) {
        return reply.status(400).send({
          success: false,
          error: `Restam ${remaining} sessão(ões) neste pacote`,
        })
      }

      const duration = purchase.packageService.duration
      const config = await prisma.systemConfig.findFirst()
      const maxSimultaneous = config?.maxSimultaneous || 1
      const indexes = nextSessionIndexes(purchase, slots.length)
      if (indexes.length < slots.length) {
        return reply.status(400).send({ success: false, error: 'Não há sessões livres suficientes' })
      }

      const uniqueTimes = new Set(slots.map((s) => s.getTime()))
      if (uniqueTimes.size !== slots.length) {
        return reply.status(400).send({ success: false, error: 'As sessões não podem ser no mesmo horário' })
      }

      for (const start of slots) {
        const scheduleCheck = await assertStartTimeOnSchedule(start, duration, {
          adminExtended: Boolean(body.adminExtended),
          machineKind: purchase.packageService.machineKind,
        })
        if (!scheduleCheck.ok) {
          return reply.status(400).send({ success: false, error: scheduleCheck.error })
        }
      }

      let updated
      try {
        updated = await prisma.$transaction(async (tx) => {
          const locked = await tx.packagePurchase.findUnique({ where: { id } })
          if (!locked) throw new PackageError('Compra de pacote não encontrada', 404)
          if (locked.sessionsScheduled + slots.length > locked.sessionCount) {
            throw new CapacityError(`Restam ${remainingSessions(locked)} sessão(ões) neste pacote`)
          }

          for (const start of slots) {
            const end = new Date(start.getTime() + duration * 60000)
            const overlapping = await tx.appointment.count({
              where: {
                status: { not: 'CANCELED' },
                startTime: { lt: end },
                endTime: { gt: start },
              },
            })
            if (overlapping >= maxSimultaneous) throw new SlotTakenError()
          }

          for (let i = 0; i < slots.length; i++) {
            const start = slots[i]
            const end = new Date(start.getTime() + duration * 60000)
            await tx.appointment.create({
              data: {
                userId: purchase.userId,
                serviceId: purchase.packageServiceId,
                startTime: start,
                endTime: end,
                status: 'PENDING',
                origin: 'PACKAGE',
                paymentStatus: 'PAID',
                paymentAmount: 0,
                notes: body.notes,
                packagePurchaseId: purchase.id,
                packageSessionIndex: indexes[i],
              },
            })
          }

          const nextScheduled = locked.sessionsScheduled + slots.length
          await tx.packagePurchase.update({
            where: { id },
            data: {
              sessionsScheduled: nextScheduled,
              status: refreshPurchaseStatus({ ...locked, sessionsScheduled: nextScheduled }),
            },
          })

          return tx.packagePurchase.findUniqueOrThrow({
            where: { id },
            include: PACKAGE_PURCHASE_INCLUDE,
          })
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (txError: any) {
        if (txError instanceof SlotTakenError || txError?.code === 'P2034') {
          return reply.status(409).send({
            success: false,
            error: 'Um dos horários acabou de ser reservado. Escolha outras datas.',
          })
        }
        if (txError instanceof CapacityError || txError instanceof PackageError) {
          return reply.status(txError instanceof PackageError ? txError.statusCode : 400).send({
            success: false,
            error: txError.message,
          })
        }
        throw txError
      }

      const user = await prisma.user.findUnique({ where: { id: purchase.userId }, select: { name: true } })
      const newest = updated.appointments
        .filter((item) => item.status !== 'CANCELED')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      if (newest && user) {
        await notifyAdminNewAppointmentRequest({
          clientName: user.name,
          serviceName: purchase.packageService.name,
          startTime: newest.startTime,
          appointmentId: newest.id,
        })
      }

      logger.success(`Sessões agendadas no pacote ${id}`)
      return reply.status(201).send({
        success: true,
        data: serializePurchase(updated),
        message: 'Sessão(ões) agendada(s) com sucesso',
      })
    } catch (error) {
      if (error instanceof PackageError) {
        return reply.status(error.statusCode).send({ success: false, error: error.message })
      }
      logger.error('Erro ao agendar sessões do pacote:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao agendar sessões' })
    }
  })

  // Gestora: estorno do pacote inteiro (não de uma sessão)
  app.put('/packages/purchases/:id/refund', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/packages/purchases/${id}/refund`)
    try {
      const purchase = await prisma.packagePurchase.findUnique({
        where: { id },
        include: { appointments: true, packageService: { select: { name: true } } },
      })
      if (!purchase) {
        return reply.status(404).send({ success: false, error: 'Compra de pacote não encontrada' })
      }

      if (purchase.asaasPaymentId && purchase.paymentStatus === 'PAID') {
        try {
          await refundPayment(purchase.asaasPaymentId, purchase.pricePaid, `Estorno do pacote ${purchase.packageService.name}`)
        } catch (refundError: any) {
          logger.error('Estorno Asaas do pacote falhou (seguindo com cancelamento local):', refundError.message)
        }
      }

      await prisma.$transaction(async (tx) => {
        const now = new Date()
        for (const appointment of purchase.appointments) {
          if (['CANCELED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) continue
          await tx.appointment.update({
            where: { id: appointment.id },
            data: {
              status: 'CANCELED',
              canceledBy: 'admin',
              canceledAt: now,
              cancelReason: 'Estorno do pacote',
              paymentStatus: 'REFUNDED',
            },
          })
        }
        await tx.packagePurchase.update({
          where: { id },
          data: { status: 'REFUNDED', paymentStatus: 'REFUNDED', paymentExpiresAt: null },
        })
      })

      const updated = await prisma.packagePurchase.findUniqueOrThrow({
        where: { id },
        include: PACKAGE_PURCHASE_INCLUDE,
      })
      logger.success(`Pacote ${id} estornado`)
      return reply.status(200).send({
        success: true,
        data: serializePurchase(updated),
        message: `Pacote ${purchase.packageService.name} estornado. Sessões futuras foram canceladas.`,
      })
    } catch (error) {
      logger.error('Erro ao estornar pacote:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao estornar pacote' })
    }
  })
}

export function serializePurchase(purchase: Prisma.PackagePurchaseGetPayload<{ include: typeof PACKAGE_PURCHASE_INCLUDE }>) {
  const remaining = remainingSessions(purchase)
  return {
    ...purchase,
    remainingSessions: remaining,
    scheduledSessions: purchase.sessionsScheduled,
    items: (purchase.itemsSnapshot as any[]) || snapshotFromItems(purchase.packageService.packageItems),
  }
}
