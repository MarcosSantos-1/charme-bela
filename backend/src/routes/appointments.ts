import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { hoursUntilStoredStart, wallClockNowAsStoredUtc, wallClockYearMonth } from '../utils/wallClock'
import { newPaymentHoldExpiration, releaseExpiredPaymentHolds, countActivePaymentHolds, MAX_ACTIVE_PAYMENT_HOLDS_PER_USER, PAYMENT_HOLD_MINUTES } from '../utils/paymentHolds'
import { cancelPaymentSilent, cancelPendingByExternalReference } from '../lib/asaas'
import { assertStartTimeOnSchedule } from '../utils/scheduleValidation'
import {
  incrementMonthlyUsage,
  decrementMonthlyUsage,
  assertSubscriptionCapacity,
  PlanQuotaError,
} from '../utils/planUsage'
import { notifyAppointmentConfirmed,
  notifyAppointmentCanceled,
  notifyAppointmentRescheduled,
  notifyAppointmentCompleted,
  notifyAdminNewAppointmentRequest,
  notifyAdminClientCanceled,
  createNotification,
} from '../utils/notifications'
import { markVoucherUsed, releaseVoucherOnCancel, VoucherUnavailableError, assertVoucherUsable, lockVoucherForApply, debitLockedVoucher } from '../utils/vouchers'
import { cancelUnpaidPackagePurchase, releaseSessionOnCancel } from '../utils/packages'
import { attachCancelPolicies, resolveCancelPolicy, minHoursFromPolicy } from '../utils/cancelPolicy'
import { settlePaidSingleCancel, retryAppointmentRefund } from '../utils/settlement'
import { normalizePersonName } from '../utils/names'

// Lançado dentro da transação quando o slot foi ocupado por outra requisição
class SlotTakenError extends Error {
  constructor() {
    super('Slot ocupado')
    this.name = 'SlotTakenError'
  }
}

export async function appointmentsRoutes(app: FastifyInstance) {
  // POST - Cancelar agendamentos com pagamento expirado (chamado pelo cron e no wake)
  app.post('/appointments/cancel-expired', async (request, reply) => {
    logger.route('POST', '/appointments/cancel-expired')
    
    try {
      const canceled = await releaseExpiredPaymentHolds()
      
      return reply.status(200).send({
        success: true,
        canceled,
        message: canceled === 0
          ? 'Nenhum agendamento expirado'
          : `${canceled} agendamento(s) com pagamento expirado cancelado(s)`
      })
    } catch (error) {
      logger.error('Erro ao cancelar expirados:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao cancelar agendamentos expirados'
      })
    }
  })
  
  // PUT - Liberar reserva quando o cliente desiste do checkout
  // Idempotente: só cancela se o agendamento ainda é um hold não pago.
  app.put('/appointments/:id/release-hold', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/release-hold`)
    
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          service: { select: { name: true } }
        }
      })
      
      if (!appointment) {
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }
      
      // Só libera holds de checkout online, nunca agendamento já pago/confirmado
      const isUnpaidHold =
        appointment.status === 'PENDING' &&
        appointment.paymentStatus === 'PENDING' &&
        appointment.paymentExpiresAt !== null
      
      if (!isUnpaidHold) {
        return reply.status(200).send({
          success: true,
          released: false,
          message: 'Agendamento não está mais aguardando pagamento'
        })
      }
      
      const cancelReason = 'Pagamento cancelado no checkout'
      if (appointment.packagePurchaseId) {
        await cancelPendingByExternalReference(`pkg_${appointment.packagePurchaseId}`)
      } else {
        await cancelPendingByExternalReference(`apt_${appointment.id}`)
      }
      await cancelPaymentSilent(appointment.asaasPaymentId)
      if (appointment.packagePurchaseId) {
        const purchase = await prisma.packagePurchase.findUnique({
          where: { id: appointment.packagePurchaseId },
          select: { asaasPaymentId: true },
        })
        if (purchase?.asaasPaymentId && purchase.asaasPaymentId !== appointment.asaasPaymentId) {
          await cancelPaymentSilent(purchase.asaasPaymentId)
        }
        await prisma.$transaction(async (tx) => {
          await cancelUnpaidPackagePurchase(tx, appointment.packagePurchaseId!, cancelReason)
        })
      } else {
        await prisma.appointment.update({
          where: { id },
          data: {
            status: 'CANCELED',
            canceledBy: 'client',
            canceledAt: new Date(),
            cancelReason
          }
        })
        await releaseVoucherOnCancel(appointment.voucherId, appointment.voucherAmountApplied)
      }

      await notifyAppointmentCanceled(appointment.userId, {
        serviceName: appointment.service.name,
        startTime: appointment.startTime,
        cancelReason
      })
      
      logger.success(`🔓 Reserva liberada (checkout cancelado): ${id}`)
      return reply.status(200).send({
        success: true,
        released: true,
        message: 'Horário liberado'
      })
    } catch (error) {
      logger.error('Erro ao liberar reserva:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao liberar reserva'
      })
    }
  })
  
  // POST - Auto-completar tratamentos do dia anterior
  app.post('/appointments/auto-complete-previous-day', async (request, reply) => {
    logger.route('POST', '/appointments/auto-complete-previous-day')
    
    try {
      const now = new Date()
      
      // Define início e fim do dia anterior
      const yesterdayStart = new Date(now)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      yesterdayStart.setHours(0, 0, 0, 0)
      
      const yesterdayEnd = new Date(now)
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)
      yesterdayEnd.setHours(23, 59, 59, 999)
      
      logger.info(`🌙 Buscando tratamentos do dia anterior: ${yesterdayStart.toLocaleDateString('pt-BR')}`)
      
      // Busca agendamentos do dia anterior que não foram concluídos.
      // Nunca auto-completa pagamento pendente (hold online ou pagar na clínica).
      const pendingAppointments = await prisma.appointment.findMany({
        where: {
          startTime: {
            gte: yesterdayStart,
            lte: yesterdayEnd
          },
          status: {
            in: ['PENDING', 'CONFIRMED']
          },
          OR: [
            { paymentStatus: null },
            { paymentStatus: 'PAID' }
          ]
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          service: {
            select: {
              name: true
            }
          }
        }
      })
      
      if (pendingAppointments.length === 0) {
        logger.info('ℹ️ Nenhum tratamento pendente do dia anterior')
        return reply.status(200).send({
          success: true,
          completed: 0,
          message: 'Nenhum tratamento pendente do dia anterior'
        })
      }
      
      // Marca todos como concluídos
      const completedIds: string[] = []
      
      for (const appointment of pendingAppointments) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'COMPLETED',
            confirmedByAdmin: true,
            updatedAt: new Date()
          }
        })

        if (appointment.voucherId) {
          try {
            await markVoucherUsed(appointment.voucherId)
          } catch (voucherError) {
            logger.error(`Erro ao consumir voucher no auto-complete ${appointment.id}:`, voucherError)
          }
        }
        
        completedIds.push(appointment.id)
        
        logger.success(`✅ Auto-completado: ${appointment.user?.name} - ${appointment.service?.name}`)
      }
      
      logger.success(`✅ ${completedIds.length} tratamento(s) do dia anterior marcado(s) como concluído(s)`)
      
      return reply.status(200).send({
        success: true,
        completed: completedIds.length,
        appointmentIds: completedIds,
        message: `${completedIds.length} tratamento(s) marcado(s) como concluído(s) automaticamente`
      })
    } catch (error) {
      logger.error('Erro ao auto-completar tratamentos:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao auto-completar tratamentos do dia anterior'
      })
    }
  })
  
  // GET - Listar agendamentos (com filtros)
  app.get('/appointments', async (request, reply) => {
    logger.route('GET', '/appointments')
    
    try {
      // Libera holds expirados antes de listar — evita devolver PENDING/"Agendado"
      // para reservas cujo timer de pagamento já acabou.
      await releaseExpiredPaymentHolds()

      const { userId, status, startDate, endDate, excludeHidden, refundStatus } = request.query as {
        userId?: string
        status?: string
        startDate?: string
        endDate?: string
        excludeHidden?: string
        refundStatus?: string
      }
      
      const wallNow = wallClockNowAsStoredUtc()

      // Recupera PENDING/CONFIRMED futuros que foram ocultados por engano
      // (ex.: clear-history comparava UTC real com hora de parede).
      if (excludeHidden === 'true') {
        await prisma.appointment.updateMany({
          where: {
            ...(userId && { userId }),
            hiddenFromHistory: true,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startTime: { gt: wallNow }
          },
          data: { hiddenFromHistory: false }
        })
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          ...(userId && { userId }),
          ...(status && { status: status.toUpperCase() as any }),
          ...(refundStatus && { refundStatus: refundStatus.toUpperCase() as any }),
          ...(startDate && endDate && {
            startTime: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          }),
          // Cliente: oculta só histórico limpo; futuros nunca somem da lista
          ...(excludeHidden === 'true' && {
            OR: [
              { hiddenFromHistory: false },
              {
                status: { in: ['PENDING', 'CONFIRMED'] },
                startTime: { gt: wallNow }
              }
            ]
          })
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          service: true,
          voucher: true,
          packagePurchase: {
            select: {
              id: true,
              sessionCount: true,
              sessionsScheduled: true,
              status: true,
              paymentStatus: true,
              itemsSnapshot: true,
              packageServiceId: true,
            }
          }
        },
        orderBy: { startTime: 'asc' }
      })
      
      logger.success(`Retornando ${appointments.length} agendamentos`)
      const withPolicy = await attachCancelPolicies(appointments)
      return reply.status(200).send({
        success: true,
        data: withPolicy.map((apt) =>
          apt.user
            ? {
                ...apt,
                user: {
                  ...apt.user,
                  name: normalizePersonName(apt.user.name) || apt.user.name,
                },
              }
            : apt
        )
      })
    } catch (error) {
      logger.error('Erro ao buscar agendamentos:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar agendamentos'
      })
    }
  })

  // GET - Buscar agendamento por ID
  app.get('/appointments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/appointments/${id}`)
    
    try {
      await releaseExpiredPaymentHolds()

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          service: true,
          voucher: true,
          packagePurchase: {
            select: {
              id: true,
              sessionCount: true,
              sessionsScheduled: true,
              status: true,
              paymentStatus: true,
              itemsSnapshot: true,
              packageServiceId: true,
            }
          }
        }
      })
      
      if (!appointment) {
        logger.warning(`Agendamento não encontrado: ${id}`)
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }
      
      logger.success(`Agendamento encontrado: ${appointment.id}`)

      let cancelPolicy = await resolveCancelPolicy(appointment.service.machineKind)

      return reply.status(200).send({
        success: true,
        data: { ...appointment, cancelPolicy },
      })
    } catch (error) {
      logger.error('Erro ao buscar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar agendamento'
      })
    }
  })

  // POST - Criar novo agendamento
  app.post('/appointments', async (request, reply) => {
    logger.route('POST', '/appointments')
    
    try {
      const body = request.body as any
      const userId = body.userId
      const serviceId = body.serviceId
      const startTime = body.startTime
      const origin = body.origin
      const voucherId = body.voucherId
      const paymentMethod = body.paymentMethod
      const paymentAmount = body.paymentAmount
      const paymentStatus = body.paymentStatus
      const notes = body.notes
      
      logger.debug('Criando novo agendamento:', { userId, serviceId, startTime, origin, paymentStatus, paymentAmount })
      
      // 1. Valida origin
      const validOrigins = ['SUBSCRIPTION', 'SINGLE', 'VOUCHER', 'ADMIN_CREATED']
      if (!origin || !validOrigins.includes(origin.toUpperCase())) {
        return reply.status(400).send({
          success: false,
          error: 'Origin inválido. Use: SUBSCRIPTION, SINGLE, VOUCHER ou ADMIN_CREATED'
        })
      }
      
      // 2. Verifica se usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: {
            include: {
              plan: true
            }
          },
          anamnesisForm: true
        }
      })
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      // 3. Verifica se tem anamnese completa (OBRIGATÓRIO para primeiro agendamento)
      const hasAppointments = await prisma.appointment.count({
        where: { userId, status: { not: 'CANCELED' } }
      })

      const anamnesisComplete = Boolean(user.anamnesisForm?.termsAccepted)
      if (hasAppointments === 0 && !anamnesisComplete) {
        return reply.status(400).send({
          success: false,
          error: 'É necessário preencher a ficha de anamnese antes do primeiro agendamento'
        })
      }
      
      // 4. Busca o serviço
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      })
      
      if (!service) {
        return reply.status(404).send({
          success: false,
          error: 'Serviço não encontrado'
        })
      }

      if (service.category === 'COMBO' || origin === 'PACKAGE') {
        return reply.status(400).send({
          success: false,
          error: 'Pacotes são agendados pela tela de pacotes, não como tratamento avulso'
        })
      }
      
      // 5. Calcula horário de término
      const appointmentStart = new Date(startTime)
      const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000)

      if (isNaN(appointmentStart.getTime())) {
        return reply.status(400).send({
          success: false,
          error: 'Data/hora de início inválida'
        })
      }

      // 5b. Valida se o horário está na grade de funcionamento (server-side)
      const scheduleCheck = await assertStartTimeOnSchedule(
        appointmentStart,
        service.duration,
        { adminExtended: origin === 'ADMIN_CREATED', machineKind: service.machineKind }
      )
      if (!scheduleCheck.ok) {
        return reply.status(400).send({
          success: false,
          error: scheduleCheck.error
        })
      }

      if (service.machineKind && !service.allowOnSubscription && origin === 'SUBSCRIPTION') {
        return reply.status(400).send({
          success: false,
          error: 'Este tratamento de máquina alugada é apenas avulso no momento',
        })
      }
      
      // 6. Libera holds de pagamento expirados antes de checar conflito
      // (reservas de checkout abandonadas não devem bloquear o horário)
      await releaseExpiredPaymentHolds()
      
      // Detecção real de conflito por interseção de intervalos [início, fim).
      // A capacidade (maxSimultaneous) define quantos atendimentos podem coexistir
      // no mesmo intervalo. Com capacidade 1 (padrão), qualquer sobreposição bloqueia.
      const conflictConfig = await prisma.systemConfig.findFirst()
      const maxSimultaneous = conflictConfig?.maxSimultaneous || 1
      
      const overlappingCount = await prisma.appointment.count({
        where: {
          status: { not: 'CANCELED' },
          startTime: { lt: appointmentEnd },
          endTime: { gt: appointmentStart }
        }
      })
      
      if (overlappingCount >= maxSimultaneous) {
        logger.warning(`❌ Conflito de horário em ${startTime}: ${overlappingCount}/${maxSimultaneous} ocupados`)
        return reply.status(400).send({
          success: false,
          error: 'Já existe um agendamento neste horário'
        })
      }
      
      // 7. Se for de assinatura, valida limites do plano
      if (origin === 'SUBSCRIPTION') {
        if (!user.subscription || user.subscription.status !== 'ACTIVE') {
          return reply.status(400).send({
            success: false,
            error: 'Usuário não possui assinatura ativa'
          })
        }
        
        const plan = user.subscription.plan
        
        try {
          await assertSubscriptionCapacity(userId, appointmentStart, plan.maxTreatmentsPerMonth)
        } catch (quotaError) {
          if (quotaError instanceof PlanQuotaError) {
            const { month, year } = wallClockYearMonth(appointmentStart)
            return reply.status(400).send({
              success: false,
              error: quotaError.message,
              limit: quotaError.message.includes('dia') ? 3 : plan.maxTreatmentsPerMonth,
              month,
              year,
            })
          }
          throw quotaError
        }
      }
      
      // 8. Validar e aplicar VOUCHER se fornecido
      let finalPrice = service.price
      let appliedDiscount = 0
      let voucherApplied = null
      
      if (origin === 'VOUCHER' && voucherId) {
        try {
          const resolved = await assertVoucherUsable({
            voucherId,
            userId,
            serviceId,
            price: service.price,
          })
          finalPrice = resolved.finalPrice
          appliedDiscount = resolved.appliedDiscount
          voucherApplied = resolved.voucher
          logger.info(`💳 Voucher aplicado: ${resolved.voucher.description} - Desconto: R$ ${appliedDiscount.toFixed(2)}`)
        } catch (voucherError) {
          if (voucherError instanceof VoucherUnavailableError) {
            const status = voucherError.message.includes('não encontrado') ? 404 : 400
            return reply.status(status).send({ success: false, error: voucherError.message })
          }
          throw voucherError
        }
      }
      
      // 9. Status de pagamento efetivo + hold de checkout online.
      // SINGLE e VOUCHER com valor restante pagam via Asaas: nascem PENDING com
      // paymentExpiresAt (hold que reserva o horário até o pagamento confirmar).
      // Voucher 100% já nasce PAID. Admin ("pagar na clínica") envia paymentStatus
      // explícito e NUNCA recebe hold.
      const effectivePaymentStatus = paymentStatus
        ? (paymentStatus.toUpperCase() as any)
        : (voucherApplied && finalPrice === 0)
          ? 'PAID'
          : (origin === 'SINGLE' || (voucherApplied && finalPrice > 0))
            ? 'PENDING'
            : null
      
      const isOnlinePaymentHold =
        !paymentStatus &&
        effectivePaymentStatus === 'PENDING' &&
        (origin === 'SINGLE' || origin === 'VOUCHER')

      if (isOnlinePaymentHold) {
        const activeHolds = await countActivePaymentHolds(userId)
        if (activeHolds >= MAX_ACTIVE_PAYMENT_HOLDS_PER_USER) {
          return reply.status(429).send({
            success: false,
            error: `Você já tem ${MAX_ACTIVE_PAYMENT_HOLDS_PER_USER} reservas aguardando pagamento. Conclua ou cancele uma antes de agendar outro horário.`
          })
        }
      }
      
      const paymentExpiresAt = isOnlinePaymentHold ? newPaymentHoldExpiration() : null
      
      if (paymentExpiresAt) {
        logger.info(`⏰ Reserva expira se não pagar até: ${paymentExpiresAt.toISOString()}`)
      }
      
      // 10. Cria o agendamento (aplicando preço final se houver voucher).
      // A re-checagem de conflito, a criação e o uso mensal rodam em uma transação
      // Serializable: impede double-booking quando duas requisições disputam o mesmo
      // slot (a checagem do passo 6 sozinha tem race condition).
      let appointment
      try {
        appointment = await prisma.$transaction(async (tx) => {
          const overlappingNow = await tx.appointment.count({
            where: {
              status: { not: 'CANCELED' },
              startTime: { lt: appointmentEnd },
              endTime: { gt: appointmentStart }
            }
          })
          
          if (overlappingNow >= maxSimultaneous) {
            throw new SlotTakenError()
          }

          // Consome o voucher NA MESMA transação do create — evita reuso em race
          // (dois agendamentos pendentes com o mesmo voucher). Cancelamento libera.
          if (voucherApplied) {
            const locked = await lockVoucherForApply(tx, voucherApplied.id, service.price, serviceId)
            appliedDiscount = locked.appliedDiscount
            finalPrice = locked.finalPrice
          }
          
          const created = await tx.appointment.create({
            data: {
              userId,
              serviceId,
              startTime: appointmentStart,
              endTime: appointmentEnd,
              status: 'PENDING',
              origin: origin.toUpperCase() as any,
              voucherId,
              paymentMethod,
              // Se tem voucher, usa o preço final calculado, senão usa o paymentAmount fornecido
              paymentAmount: voucherApplied ? finalPrice : paymentAmount,
              paymentStatus: effectivePaymentStatus,
              paymentExpiresAt,
              voucherAmountApplied: voucherApplied && appliedDiscount > 0 ? Number(appliedDiscount.toFixed(2)) : null,
              confirmedByAdmin: false,
              notes
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              service: true
            }
          })

          if (voucherApplied) {
            await debitLockedVoucher(tx, voucherApplied.id, appliedDiscount)
          }
          
          // Atualiza uso mensal se for de assinatura (atômico com a criação)
          if (origin === 'SUBSCRIPTION') {
            await incrementMonthlyUsage(userId, appointmentStart, tx)
          }
          
          return created
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (txError: any) {
        if (txError instanceof SlotTakenError) {
          logger.warning(`❌ Conflito de horário em ${startTime} (detectado na transação)`)
          return reply.status(400).send({
            success: false,
            error: 'Já existe um agendamento neste horário'
          })
        }
        if (txError instanceof VoucherUnavailableError) {
          logger.warning(`❌ Voucher indisponível: ${txError.message}`)
          return reply.status(400).send({
            success: false,
            error: txError.message
          })
        }
        // P2034: conflito de serialização (outra transação gravou o mesmo slot primeiro)
        if (txError?.code === 'P2034') {
          logger.warning(`❌ Conflito de concorrência em ${startTime}`)
          return reply.status(409).send({
            success: false,
            error: 'Este horário acabou de ser reservado. Por favor, escolha outro horário.'
          })
        }
        throw txError
      }

      if (voucherApplied) {
        logger.success(`🎫 Voucher ${voucherApplied.id} consumido no agendamento ${appointment.id} (libera se cancelar)`)
      }
      
      // 13. Notifica admin sobre novo agendamento (exceto se criado pelo admin)
      if (origin !== 'ADMIN_CREATED') {
        await notifyAdminNewAppointmentRequest({
          clientName: appointment.user.name,
          serviceName: appointment.service.name,
          startTime: appointmentStart,
          appointmentId: appointment.id
        })
      }

      // 13b. Avisa o cliente que o pagamento está pendente (hold com timer)
      if (isOnlinePaymentHold && paymentExpiresAt) {
        await createNotification({
          userId,
          type: 'SYSTEM_MESSAGE',
          title: 'Pagamento pendente ⏳',
          message: `Seu horário de ${appointment.service.name} está reservado por ${PAYMENT_HOLD_MINUTES} minutos. Conclua o pagamento para confirmar — após esse prazo a reserva é cancelada automaticamente.`,
          icon: 'CARD',
          priority: 'URGENT',
          actionUrl: '/cliente/agenda',
          actionLabel: 'Pagar agora',
          metadata: {
            appointmentId: appointment.id,
            paymentExpiresAt: paymentExpiresAt.toISOString()
          },
          expiresAt: paymentExpiresAt
        })
      }
      
      logger.success(`Agendamento criado: ${appointment.id}`)
      logger.debug(`✅ Dados salvos - Origin: ${appointment.origin}, PaymentStatus: ${appointment.paymentStatus}, PaymentAmount: ${appointment.paymentAmount}`)
      
      let successMessage = 'Agendamento criado com sucesso. Aguardando confirmação do admin.'
      if (voucherApplied) {
        if (finalPrice === 0) {
          successMessage = `Agendamento criado! Voucher aplicado - Tratamento GRÁTIS! 🎁`
        } else {
          successMessage = `Agendamento criado! Desconto de R$ ${appliedDiscount.toFixed(2).replace('.', ',')} aplicado. Valor final: R$ ${finalPrice.toFixed(2).replace('.', ',')}`
        }
      }
      
      return reply.status(201).send({
        success: true,
        data: appointment,
        voucherApplied: voucherApplied ? {
          id: voucherApplied.id,
          description: voucherApplied.description,
          discount: appliedDiscount,
          finalPrice
        } : null,
        message: successMessage
      })
    } catch (error) {
      logger.error('Erro ao criar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar agendamento'
      })
    }
  })

  // PUT - Confirmar agendamento (admin)
  app.put('/appointments/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/confirm`)
    
    try {
      const appointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedByAdmin: true
        },
        include: {
          user: true,
          service: true
        }
      })
      
      // Notifica cliente sobre confirmação
      await notifyAppointmentConfirmed(appointment.userId, {
        serviceName: appointment.service.name,
        startTime: new Date(appointment.startTime)
      })
      
      logger.success(`Agendamento confirmado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: appointment,
        message: 'Agendamento confirmado com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao confirmar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao confirmar agendamento'
      })
    }
  })

  // PUT - Marcar como concluído e pago (admin)
  // IMPORTANTE: Agendamentos com paymentStatus='PENDING' só podem ser concluídos
  // manualmente pelo admin após receber o pagamento na clínica.
  // Processos automáticos de conclusão devem ignorar agendamentos com pagamento pendente.
  app.put('/appointments/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/complete`)
    
    try {
      const { paid } = request.body as { paid?: boolean }
      
      const appointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          confirmedByAdmin: true,
          // Se foi pago, atualiza status de pagamento
          ...(paid && { paymentStatus: 'PAID' })
        },
        include: {
          user: true,
          service: true
        }
      })
      
      // Garante consumo do voucher ao concluir (pago / realizado)
      if (appointment.voucherId) {
        try {
          await markVoucherUsed(appointment.voucherId)
        } catch (voucherError) {
          logger.error('Erro ao marcar voucher como usado:', voucherError)
        }
      }
      
      // Notifica cliente sobre conclusão
      await notifyAppointmentCompleted(appointment.userId, {
        serviceName: appointment.service.name
      })
      
      logger.success(`Agendamento concluído: ${id}${paid ? ' e pago' : ''}`)
      return reply.status(200).send({
        success: true,
        data: appointment,
        message: paid ? 'Agendamento concluído e pago!' : 'Agendamento concluído'
      })
    } catch (error) {
      logger.error('Erro ao concluir agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao concluir agendamento'
      })
    }
  })

  // PUT - Cancelar agendamento
  app.put('/appointments/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/cancel`)
    
    try {
      const { canceledBy, cancelReason, settlement } = request.body as {
        canceledBy: string  // 'client' ou 'admin'
        cancelReason?: string
        settlement?: 'REFUND' | 'CREDIT'
      }
      
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          service: true,
          user: {
            include: {
              subscription: {
                include: {
                  plan: true
                }
              }
            }
          }
        }
      })
      
      if (!appointment) {
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }

      if (appointment.status === 'CANCELED') {
        return reply.status(400).send({
          success: false,
          error: 'Agendamento já está cancelado'
        })
      }

      const isPaidPackageSession =
        Boolean(appointment.packagePurchaseId) && appointment.paymentStatus === 'PAID'
      if (canceledBy === 'client' && isPaidPackageSession) {
        return reply.status(400).send({
          success: false,
          error: 'Sessões de pacote não podem ser canceladas. Reagende o horário.',
        })
      }

      const cancelPolicy = await resolveCancelPolicy(appointment.service.machineKind)
      const minHours = minHoursFromPolicy(cancelPolicy)
      const lateFeePercent = cancelPolicy.kind === 'machine' ? cancelPolicy.lateCancelFeePercent : 0
      const isMachineSpecial = cancelPolicy.kind === 'machine'
      const hoursDiff = hoursUntilStoredStart(appointment.startTime)
      const isLate = hoursDiff < minHours
      const isPaidSingle =
        appointment.origin === 'SINGLE' &&
        appointment.paymentStatus === 'PAID' &&
        Boolean(appointment.paymentAmount)

      const needsSettlementChoice =
        isPaidSingle &&
        !isLate &&
        settlement !== 'REFUND' &&
        settlement !== 'CREDIT'

      if (needsSettlementChoice) {
        return reply.status(400).send({
          success: false,
          error: 'Escolha entre reembolso em dinheiro ou crédito na clínica',
          code: 'SETTLEMENT_REQUIRED',
          options: ['REFUND', 'CREDIT'],
          paymentAmount: appointment.paymentAmount,
          paymentMethod: appointment.paymentMethod,
          cancelPolicy,
        })
      }

      let lostTreatment = false
      if (canceledBy === 'client' && isLate && appointment.origin === 'SUBSCRIPTION') {
        lostTreatment = true
      } else if (appointment.origin === 'SUBSCRIPTION') {
        await decrementMonthlyUsage(appointment.userId, appointment.startTime)
      }

      const updatedAppointment = await prisma.$transaction(async (tx) => {
        if (appointment.packagePurchaseId) {
          const isUnpaidPackageHold =
            appointment.paymentStatus === 'PENDING' && appointment.paymentExpiresAt !== null
          if (isUnpaidPackageHold) {
            await cancelUnpaidPackagePurchase(
              tx,
              appointment.packagePurchaseId,
              cancelReason || 'Pagamento cancelado',
            )
          } else {
            await releaseSessionOnCancel(tx, appointment)
          }
        }

        return tx.appointment.update({
          where: { id },
          data: {
            status: 'CANCELED',
            canceledBy,
            canceledAt: new Date(),
            cancelReason
          },
          include: {
            user: true,
            service: true
          }
        })
      })

      if (appointment.status !== 'COMPLETED') {
        try {
          await releaseVoucherOnCancel(appointment.voucherId, appointment.voucherAmountApplied)
        } catch (voucherError) {
          logger.error('Erro ao liberar voucher no cancelamento:', voucherError)
        }
      }

      let creditVoucher = null
      let refundAmount: number | null = null
      let feeAmount: number | null = null
      let refunded = false
      let refundStatus = updatedAppointment.refundStatus
      let settlementChoice = updatedAppointment.settlementChoice

      if (isPaidSingle && appointment.paymentAmount) {
        const settled = await settlePaidSingleCancel({
          appointmentId: appointment.id,
          userId: appointment.userId,
          clientName: appointment.user.name,
          serviceName: appointment.service.name,
          asaasPaymentId: appointment.asaasPaymentId,
          paidAmount: appointment.paymentAmount,
          isLate,
          isMachineSpecial,
          lateFeePercent,
          minHours,
          settlement: settlement || null,
        })

        if ('requiresSettlement' in settled && settled.requiresSettlement) {
          return reply.status(400).send({
            success: false,
            error: 'Escolha entre reembolso em dinheiro ou crédito na clínica',
            code: 'SETTLEMENT_REQUIRED',
            options: ['REFUND', 'CREDIT'],
            paymentAmount: settled.paymentAmount,
            cancelPolicy,
          })
        }

        if (!('requiresSettlement' in settled)) {
          creditVoucher = settled.creditVoucher
          refundAmount = settled.refundAmount
          feeAmount = settled.feeAmount
          refunded = settled.refunded
          refundStatus = settled.refundStatus
          settlementChoice = settled.settlementChoice
        }
      }

      if (canceledBy === 'client') {
        await notifyAdminClientCanceled({
          clientName: updatedAppointment.user.name,
          serviceName: updatedAppointment.service.name,
          startTime: updatedAppointment.startTime,
          cancelReason
        })
      } else {
        await notifyAppointmentCanceled(updatedAppointment.userId, {
          serviceName: updatedAppointment.service.name,
          startTime: updatedAppointment.startTime,
          cancelReason
        })
      }
      
      logger.success(`Agendamento cancelado: ${id}`)
      
      let message = 'Agendamento cancelado com sucesso'
      if (refunded) {
        if (feeAmount && feeAmount > 0) {
          message = `Agendamento cancelado. Estorno de R$ ${refundAmount?.toFixed(2).replace('.', ',')} processado (multa de ${lateFeePercent}% = R$ ${feeAmount.toFixed(2).replace('.', ',')}).`
        } else if (appointment.paymentMethod === 'pix') {
          message = `Agendamento cancelado. O reembolso via Pix de R$ ${refundAmount?.toFixed(2).replace('.', ',')} foi solicitado e costuma cair na conta de origem em instantes.`
        } else {
          message = `Agendamento cancelado. O reembolso de R$ ${refundAmount?.toFixed(2).replace('.', ',')} foi solicitado. No cartão, pode levar até 10 dias úteis.`
        }
      } else if (refundStatus === 'MANUAL_REQUIRED') {
        message = 'Agendamento cancelado. O estorno automático não foi concluído; a clínica vai devolver o valor em breve.'
      } else if (lostTreatment) {
        message = `Agendamento cancelado. Como foi cancelado com menos de ${minHours}h de antecedência, a sessão do plano foi contabilizada.`
      } else if (creditVoucher) {
        const months = isLate ? 3 : 6
        const creditValue = creditVoucher.remainingAmount ?? creditVoucher.discountAmount
        message = `Agendamento cancelado. Você recebeu um crédito de R$ ${creditValue?.toFixed(2).replace('.', ',')} para usar em outros procedimentos, válido por ${months} meses.`
      }
      
      return reply.status(200).send({
        success: true,
        data: {
          ...updatedAppointment,
          refundStatus,
          settlementChoice,
        },
        lostTreatment,
        creditVoucher,
        refunded,
        refundStatus,
        settlementChoice,
        feeAmount,
        refundAmount,
        cancelPolicy,
        message
      })
    } catch (error) {
      logger.error('Erro ao cancelar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao cancelar agendamento'
      })
    }
  })

  // PUT - Tentar de novo o estorno Asaas (gestora)
  app.put('/appointments/:id/retry-refund', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/retry-refund`)

    try {
      const result = await retryAppointmentRefund(id)
      return reply.status(200).send({
        success: true,
        data: result,
        message: result.refunded
          ? `Estorno de R$ ${result.refundAmount.toFixed(2).replace('.', ',')} solicitado no Asaas.`
          : 'Não foi possível estornar. A flag de reembolso manual permanece.',
      })
    } catch (error: any) {
      const status = error?.statusCode || 500
      logger.error('Erro ao retentar estorno:', error)
      return reply.status(status).send({
        success: false,
        error: error?.message || 'Erro ao retentar estorno',
      })
    }
  })

  // PUT - Reagendar
  app.put('/appointments/:id/reschedule', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/reschedule`)
    
    try {
      const { newStartTime, startTime, endTime } = request.body as { 
        newStartTime?: string
        startTime?: string 
        endTime?: string 
      }
      
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          service: true,
          user: { include: { subscription: { include: { plan: true } } } },
        },
      })
      
      if (!appointment) {
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }
      
      // Verifica se pode reagendar (tempo mínimo, hora de parede)
      const config = await prisma.systemConfig.findFirst()
      const minHours = config?.minRescheduleHours || 4
      const hoursDiff = hoursUntilStoredStart(appointment.startTime)
      
      if (hoursDiff < minHours) {
        return reply.status(400).send({
          success: false,
          error: `Não é possível reagendar com menos de ${minHours}h de antecedência`
        })
      }
      
      // Calcula novo horário de término - aceita ambos formatos
      const newStartDate = startTime || newStartTime
      if (!newStartDate) {
        return reply.status(400).send({
          success: false,
          error: 'Data de início não fornecida'
        })
      }
      
      const newStart = new Date(newStartDate)
      if (isNaN(newStart.getTime())) {
        return reply.status(400).send({
          success: false,
          error: 'Data de início inválida'
        })
      }
      
      const newEnd = endTime ? new Date(endTime) : new Date(newStart.getTime() + appointment.service.duration * 60000)

      const scheduleCheck = await assertStartTimeOnSchedule(
        newStart,
        appointment.service.duration,
        {
          adminExtended: appointment.origin === 'ADMIN_CREATED',
          machineKind: appointment.service.machineKind,
        }
      )
      if (!scheduleCheck.ok) {
        return reply.status(400).send({
          success: false,
          error: scheduleCheck.error
        })
      }
      
      // Libera holds de pagamento expirados antes de checar conflito
      await releaseExpiredPaymentHolds()
      
      // Detecção real de conflito por interseção de intervalos (ignorando o próprio agendamento).
      // Respeita a capacidade configurada (maxSimultaneous).
      // Checagem + update em transação Serializable para impedir double-booking
      // quando duas requisições disputam o mesmo slot.
      const maxSimultaneous = config?.maxSimultaneous || 1
      const oldMonth = wallClockYearMonth(appointment.startTime)
      const newMonth = wallClockYearMonth(newStart)
      const crossesMonth =
        appointment.origin === 'SUBSCRIPTION' && oldMonth.key !== newMonth.key
      const maxPerMonth = appointment.user.subscription?.plan.maxTreatmentsPerMonth
      
      let updatedAppointment
      try {
        updatedAppointment = await prisma.$transaction(async (tx) => {
          if (appointment.origin === 'SUBSCRIPTION' && maxPerMonth != null) {
            await assertSubscriptionCapacity(
              appointment.userId,
              newStart,
              maxPerMonth,
              tx,
              {
                excludeAppointmentId: id,
                skipMonthCheck: !crossesMonth,
              }
            )
          }

          const overlappingCount = await tx.appointment.count({
            where: {
              id: { not: id },
              status: { not: 'CANCELED' },
              startTime: { lt: newEnd },
              endTime: { gt: newStart }
            }
          })
          
          if (overlappingCount >= maxSimultaneous) {
            logger.warning(`❌ Conflito ao reagendar ${id} para ${newStart.toISOString()}: ${overlappingCount}/${maxSimultaneous} ocupados`)
            throw new SlotTakenError()
          }

          if (crossesMonth) {
            await decrementMonthlyUsage(appointment.userId, appointment.startTime, tx)
            await incrementMonthlyUsage(appointment.userId, newStart, tx)
          }
          
          return tx.appointment.update({
            where: { id },
            data: {
              startTime: newStart,
              endTime: newEnd,
              status: 'PENDING',  // Volta para pendente
              confirmedByAdmin: false
            },
            include: {
              user: true,
              service: true
            }
          })
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (txError: any) {
        if (txError instanceof SlotTakenError) {
          return reply.status(400).send({
            success: false,
            error: 'Já existe um agendamento no novo horário'
          })
        }
        if (txError instanceof PlanQuotaError) {
          return reply.status(400).send({
            success: false,
            error: txError.message,
          })
        }
        // P2034: conflito de serialização (outra transação gravou o mesmo slot primeiro)
        if (txError?.code === 'P2034') {
          logger.warning(`❌ Conflito de concorrência ao reagendar ${id}`)
          return reply.status(409).send({
            success: false,
            error: 'Este horário acabou de ser reservado. Por favor, escolha outro horário.'
          })
        }
        throw txError
      }
      
      // Notifica cliente sobre reagendamento
      await notifyAppointmentRescheduled(updatedAppointment.userId, {
        serviceName: updatedAppointment.service.name,
        oldStartTime: appointment.startTime,
        newStartTime: newStart
      })
      
      logger.success(`Agendamento reagendado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: updatedAppointment,
        message: 'Agendamento reagendado com sucesso. Aguardando nova confirmação.'
      })
    } catch (error) {
      logger.error('Erro ao reagendar:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao reagendar'
      })
    }
  })

  // DELETE - Ocultar agendamento do histórico (soft delete)
  app.delete('/appointments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/appointments/${id}`)
    
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id }
      })
      
      if (!appointment) {
        logger.error('❌ Agendamento não encontrado:', id)
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }
      
      logger.debug('🔍 Detalhes do agendamento:', {
        id: appointment.id,
        status: appointment.status,
        statusType: typeof appointment.status,
        userId: appointment.userId,
        service: appointment.serviceId
      })
      
      // Verifica se está em status válido (case insensitive para ser mais robusto)
      const validStatuses = ['COMPLETED', 'CANCELED', 'NO_SHOW']
      const statusUpper = appointment.status?.toUpperCase()
      const isValidStatus = validStatuses.includes(statusUpper)
      
      logger.debug(`🔍 Status válido para deletar? ${isValidStatus}`, {
        original: appointment.status,
        uppercase: statusUpper,
        validos: validStatuses,
        includes: isValidStatus
      })
      
      // TEMPORÁRIO: Permite deletar QUALQUER status para teste
      // TODO: Voltar a validar apenas COMPLETED/CANCELED após resolver o problema
      const allowAnyStatus = true // Remover após debug
      
      if (!allowAnyStatus && !isValidStatus) {
        logger.warning(`⚠️ Tentativa de ocultar agendamento com status inválido: ${appointment.status}`)
        return reply.status(400).send({
          success: false,
          error: `Apenas tratamentos concluídos ou cancelados podem ser removidos. Status atual: ${appointment.status}`
        })
      }
      
      logger.success(`✅ Status aceito para deletar: ${appointment.status}`)
      
      // Soft delete: apenas marca como oculto para o cliente
      await prisma.appointment.update({
        where: { id },
        data: { hiddenFromHistory: true }
      })
      
      logger.success(`👻 Agendamento ocultado do histórico: ${id}`)
      return reply.status(200).send({
        success: true,
        data: { id, hiddenFromHistory: true },
        message: 'Tratamento removido do histórico'
      })
    } catch (error) {
      logger.error('Erro ao ocultar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover do histórico'
      })
    }
  })
  
  // PUT - Limpar histórico completo (ocultar todos concluídos/cancelados/passados)
  app.put('/appointments/clear-history/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('PUT', `/appointments/clear-history/${userId}`)
    
    try {
      const wallNow = wallClockNowAsStoredUtc()
      const result = await prisma.appointment.updateMany({
        where: {
          userId,
          hiddenFromHistory: false,
          OR: [
            {
              status: {
                in: ['COMPLETED', 'CANCELED', 'NO_SHOW']
              }
            },
            {
              status: {
                in: ['PENDING', 'CONFIRMED']
              },
              startTime: { lte: wallNow }
            }
          ]
        },
        data: {
          hiddenFromHistory: true
        }
      })
      
      logger.success(`🧹 ${result.count} agendamento(s) ocultado(s) do histórico do usuário: ${userId}`)
      return reply.status(200).send({
        success: true,
        data: { count: result.count },
        message: `${result.count} tratamento(s) removido(s) do histórico`
      })
    } catch (error) {
      logger.error('Erro ao limpar histórico:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao limpar histórico'
      })
    }
  })
}

