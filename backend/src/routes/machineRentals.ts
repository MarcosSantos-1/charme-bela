import { FastifyInstance } from 'fastify'
import {
  MachineKind,
  MachineRentalStatus,
  AppointmentStatus,
  VoucherType,
} from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import {
  ensureCurrentAndNextOccurrences,
  ensureMachineRentalSettings,
  dateToYmd,
  ymdToDate,
  machineLinkPath,
  finalizePastReleasedOccurrences,
} from '../utils/machineRental'
import { notifyAppointmentCanceled, createNotification } from '../utils/notifications'

type AffectedAppointment = {
  id: string
  startTime: Date
  endTime: Date
  status: AppointmentStatus
  paymentStatus: string | null
  paymentAmount: number | null
  user: { id: string; name: string; email: string; phone: string | null }
  service: { id: string; name: string; machineKind: MachineKind | null; price: number }
}

function isActiveStatus(status: AppointmentStatus) {
  return status === AppointmentStatus.PENDING || status === AppointmentStatus.CONFIRMED
}

async function findAffectedOnChange(
  kind: MachineKind,
  oldDateYmd: string,
  newDateYmd: string
): Promise<AffectedAppointment[]> {
  const oldDate = ymdToDate(oldDateYmd)
  const newDate = ymdToDate(newDateYmd)
  const nextOld = new Date(oldDate)
  nextOld.setUTCDate(nextOld.getUTCDate() + 1)
  const nextNew = new Date(newDate)
  nextNew.setUTCDate(nextNew.getUTCDate() + 1)

  if (kind === MachineKind.LASER) {
    // Cancela laser no dia antigo + QUALQUER agendamento ativo no novo dia
    const [onOld, onNew] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
          startTime: { gte: oldDate, lt: nextOld },
          service: { machineKind: MachineKind.LASER },
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          service: { select: { id: true, name: true, machineKind: true, price: true } },
        },
      }),
      oldDateYmd === newDateYmd
        ? Promise.resolve([])
        : prisma.appointment.findMany({
            where: {
              status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
              startTime: { gte: newDate, lt: nextNew },
            },
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              service: { select: { id: true, name: true, machineKind: true, price: true } },
            },
          }),
    ])
    const map = new Map<string, AffectedAppointment>()
    for (const a of [...onOld, ...onNew]) map.set(a.id, a as AffectedAppointment)
    return [...map.values()]
  }

  // Crio: só cancela agendamentos Crio no dia antigo
  return prisma.appointment.findMany({
    where: {
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      startTime: { gte: oldDate, lt: nextOld },
      service: { machineKind: MachineKind.CRYO },
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { id: true, name: true, machineKind: true, price: true } },
    },
  }) as Promise<AffectedAppointment[]>
}

async function cancelAffectedAppointments(
  appointments: AffectedAppointment[],
  reason: string,
  compensation: 'credit' | 'none',
  adminUserId: string
) {
  for (const apt of appointments) {
    if (!isActiveStatus(apt.status)) continue

    await prisma.appointment.update({
      where: { id: apt.id },
      data: {
        status: AppointmentStatus.CANCELED,
        canceledBy: 'admin',
        canceledAt: new Date(),
        cancelReason: reason,
      },
    })

    if (compensation === 'credit') {
      await prisma.voucher.create({
        data: {
          userId: apt.user.id,
          type: VoucherType.FREE_TREATMENT,
          description: `Crédito para reagendar: ${apt.service.name}`,
          serviceId: apt.service.id,
          anyService: false,
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          grantedBy: adminUserId,
          grantedReason: reason,
        },
      })

      await createNotification({
        userId: apt.user.id,
        type: 'VOUCHER_RECEIVED',
        title: 'Crédito para reagendar',
        message: `Seu agendamento de ${apt.service.name} foi cancelado pela clínica. Você recebeu um crédito para remarcar o tratamento.`,
        icon: 'SPARKLES',
        priority: 'HIGH',
        actionUrl: '/cliente/agenda',
        actionLabel: 'Ver agenda',
        metadata: { serviceId: apt.service.id, appointmentId: apt.id },
      })
    }

    await notifyAppointmentCanceled(apt.user.id, {
      serviceName: apt.service.name,
      startTime: apt.startTime,
      cancelReason: reason,
    })
  }
}

export async function machineRentalsRoutes(app: FastifyInstance) {
  // GET - ocorrências (mês atual + próximo) + settings
  app.get('/machine-rentals', async (_request, reply) => {
    logger.route('GET', '/machine-rentals')
    try {
      const [settings, occurrences] = await Promise.all([
        ensureMachineRentalSettings(),
        ensureCurrentAndNextOccurrences(),
      ])

      return reply.status(200).send({
        success: true,
        data: {
          settings,
          occurrences: occurrences.map((o) => ({
            ...o,
            dateYmd: dateToYmd(o.date),
          })),
        },
      })
    } catch (error) {
      logger.error('Erro ao listar machine rentals:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao listar dias de máquinas alugadas',
      })
    }
  })

  // PUT settings (multa / horas / regra default)
  app.put('/machine-rentals/settings/:kind', async (request, reply) => {
    const { kind } = request.params as { kind: string }
    logger.route('PUT', `/machine-rentals/settings/${kind}`)

    if (kind !== 'LASER' && kind !== 'CRYO') {
      return reply.status(400).send({ success: false, error: 'kind inválido' })
    }

    try {
      const body = request.body as {
        lateCancelHours?: number
        lateCancelFeePercent?: number
        suggestedReleaseDaysBefore?: number
        exclusiveDay?: boolean
        defaultRule?: 'LAST_THURSDAY' | 'SECOND_SATURDAY'
      }

      const updated = await prisma.machineRentalSettings.update({
        where: { kind: kind as MachineKind },
        data: {
          ...(body.lateCancelHours != null ? { lateCancelHours: body.lateCancelHours } : {}),
          ...(body.lateCancelFeePercent != null
            ? { lateCancelFeePercent: body.lateCancelFeePercent }
            : {}),
          ...(body.suggestedReleaseDaysBefore != null
            ? { suggestedReleaseDaysBefore: body.suggestedReleaseDaysBefore }
            : {}),
          ...(body.exclusiveDay != null ? { exclusiveDay: body.exclusiveDay } : {}),
          ...(body.defaultRule ? { defaultRule: body.defaultRule } : {}),
        },
      })

      return reply.status(200).send({ success: true, data: updated })
    } catch (error) {
      logger.error('Erro ao atualizar settings de máquina:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar configurações' })
    }
  })

  // GET preview impacto de mudança de data
  app.get('/machine-rentals/:id/change-preview', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { newDate } = request.query as { newDate?: string }
    logger.route('GET', `/machine-rentals/${id}/change-preview`)

    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return reply.status(400).send({ success: false, error: 'newDate obrigatório (YYYY-MM-DD)' })
    }

    try {
      const occ = await prisma.machineRentalOccurrence.findUnique({ where: { id } })
      if (!occ) {
        return reply.status(404).send({ success: false, error: 'Ocorrência não encontrada' })
      }
      if (occ.status === MachineRentalStatus.CANCELED || occ.status === MachineRentalStatus.DONE) {
        return reply.status(400).send({ success: false, error: 'Ocorrência não pode ser alterada' })
      }

      const affected = await findAffectedOnChange(occ.kind, dateToYmd(occ.date), newDate)
      return reply.status(200).send({
        success: true,
        data: {
          affectedCount: affected.length,
          affected: affected.map((a) => ({
            appointmentId: a.id,
            clientName: a.user.name,
            clientEmail: a.user.email,
            clientPhone: a.user.phone,
            serviceName: a.service.name,
            machineKind: a.service.machineKind,
            startTime: a.startTime,
            status: a.status,
            reason:
              dateToYmd(a.startTime).slice(0, 10) === newDate &&
              occ.kind === MachineKind.LASER &&
              a.service.machineKind !== MachineKind.LASER
                ? 'Novo dia exclusivo de laser'
                : 'Dia da máquina alterado',
          })),
        },
      })
    } catch (error) {
      logger.error('Erro no preview de mudança:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao calcular impacto' })
    }
  })

  // PUT alterar data
  app.put('/machine-rentals/:id/date', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/machine-rentals/${id}/date`)

    try {
      const body = request.body as {
        newDate?: string
        compensation?: 'credit' | 'none'
        adminUserId?: string
        confirm?: boolean
      }

      if (!body.newDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.newDate)) {
        return reply.status(400).send({ success: false, error: 'newDate inválido' })
      }
      if (!body.confirm) {
        return reply.status(400).send({
          success: false,
          error: 'Confirme a alteração (confirm: true) após revisar o impacto',
        })
      }

      const occ = await prisma.machineRentalOccurrence.findUnique({ where: { id } })
      if (!occ) {
        return reply.status(404).send({ success: false, error: 'Ocorrência não encontrada' })
      }
      if (occ.status === MachineRentalStatus.CANCELED || occ.status === MachineRentalStatus.DONE) {
        return reply.status(400).send({ success: false, error: 'Ocorrência não pode ser alterada' })
      }

      const oldYmd = dateToYmd(occ.date)
      const newYmd = body.newDate
      if (oldYmd === newYmd) {
        return reply.status(200).send({ success: true, data: { ...occ, dateYmd: oldYmd } })
      }

      // Nova data deve permanecer no mesmo mês/ano da ocorrência
      const [ny, nm] = newYmd.split('-').map(Number)
      if (ny !== occ.year || nm !== occ.month) {
        return reply.status(400).send({
          success: false,
          error: 'A nova data deve estar no mesmo mês da ocorrência',
        })
      }

      const affected = await findAffectedOnChange(occ.kind, oldYmd, newYmd)
      const adminId = body.adminUserId || 'system'
      const compensation = body.compensation === 'none' ? 'none' : 'credit'

      await cancelAffectedAppointments(
        affected,
        `Dia de ${occ.kind === MachineKind.LASER ? 'laser' : 'criolipólise'} alterado pela clínica`,
        compensation,
        adminId
      )

      const updated = await prisma.machineRentalOccurrence.update({
        where: { id },
        data: { date: ymdToDate(newYmd) },
        include: { banner: true },
      })

      return reply.status(200).send({
        success: true,
        data: {
          occurrence: { ...updated, dateYmd: dateToYmd(updated.date) },
          canceledCount: affected.length,
        },
      })
    } catch (error) {
      logger.error('Erro ao alterar data da máquina:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao alterar data' })
    }
  })

  // POST cancelar mês (não haverá locação)
  app.post('/machine-rentals/:id/cancel-month', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('POST', `/machine-rentals/${id}/cancel-month`)

    try {
      const body = (request.body || {}) as {
        compensation?: 'credit' | 'none'
        adminUserId?: string
      }

      const occ = await prisma.machineRentalOccurrence.findUnique({
        where: { id },
        include: { banner: true },
      })
      if (!occ) {
        return reply.status(404).send({ success: false, error: 'Ocorrência não encontrada' })
      }
      if (occ.status === MachineRentalStatus.DONE || occ.status === MachineRentalStatus.CANCELED) {
        return reply.status(400).send({ success: false, error: 'Ocorrência já finalizada' })
      }

      const ymd = dateToYmd(occ.date)
      const affected = await findAffectedOnChange(occ.kind, ymd, ymd)
      // Para cancel-month laser, findAffectedOnChange com same date só pega laser no dia — ok
      // Mas para laser exclusive queremos cancelar TODOS no dia
      let toCancel = affected
      if (occ.kind === MachineKind.LASER) {
        const dayStart = ymdToDate(ymd)
        const dayEnd = new Date(dayStart)
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
        toCancel = (await prisma.appointment.findMany({
          where: {
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
            startTime: { gte: dayStart, lt: dayEnd },
          },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            service: { select: { id: true, name: true, machineKind: true, price: true } },
          },
        })) as AffectedAppointment[]
      }

      await cancelAffectedAppointments(
        toCancel,
        `Locação de ${occ.kind === MachineKind.LASER ? 'laser' : 'criolipólise'} cancelada neste mês`,
        body.compensation === 'none' ? 'none' : 'credit',
        body.adminUserId || 'system'
      )

      const updated = await prisma.$transaction(async (tx) => {
        if (occ.banner) {
          await tx.banner.update({
            where: { id: occ.banner.id },
            data: { isActive: false },
          })
        }
        return tx.machineRentalOccurrence.update({
          where: { id },
          data: { status: MachineRentalStatus.CANCELED },
          include: { banner: true },
        })
      })

      return reply.status(200).send({
        success: true,
        data: {
          occurrence: { ...updated, dateYmd: dateToYmd(updated.date) },
          canceledCount: toCancel.length,
        },
      })
    } catch (error) {
      logger.error('Erro ao cancelar mês da máquina:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao cancelar mês' })
    }
  })

  // POST liberar (banner + RELEASED)
  app.post('/machine-rentals/:id/release', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('POST', `/machine-rentals/${id}/release`)

    try {
      const body = request.body as {
        title?: string
        imageUrl?: string
        imageWidth?: number
        imageHeight?: number
      }

      const occ = await prisma.machineRentalOccurrence.findUnique({
        where: { id },
        include: { banner: true },
      })
      if (!occ) {
        return reply.status(404).send({ success: false, error: 'Ocorrência não encontrada' })
      }
      if (occ.status === MachineRentalStatus.CANCELED || occ.status === MachineRentalStatus.DONE) {
        return reply.status(400).send({ success: false, error: 'Ocorrência não pode ser liberada' })
      }

      const title =
        body.title?.trim() ||
        (occ.kind === MachineKind.LASER
          ? 'Depilação a Laser — agende agora'
          : 'Criolipólise — agende agora')
      const linkPath = machineLinkPath(occ.kind)

      const updated = await prisma.$transaction(async (tx) => {
        let bannerId = occ.banner?.id

        if (bannerId) {
          await tx.banner.update({
            where: { id: bannerId },
            data: {
              isActive: true,
              title,
              ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
              linkPath,
              machineKind: occ.kind,
              location: 'CLIENT',
            },
          })
        } else {
          if (!body.imageUrl) {
            throw new Error('IMAGE_REQUIRED')
          }
          const maxOrder = await tx.banner.aggregate({
            where: { location: 'CLIENT' },
            _max: { sortOrder: true },
          })
          const banner = await tx.banner.create({
            data: {
              title,
              imageUrl: body.imageUrl,
              location: 'CLIENT',
              isActive: true,
              sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
              linkPath,
              machineKind: occ.kind,
              rentalOccurrenceId: occ.id,
            },
          })
          bannerId = banner.id
        }

        return tx.machineRentalOccurrence.update({
          where: { id },
          data: {
            status: MachineRentalStatus.RELEASED,
            releasedAt: new Date(),
          },
          include: { banner: true },
        })
      })

      return reply.status(200).send({
        success: true,
        data: { ...updated, dateYmd: dateToYmd(updated.date) },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'IMAGE_REQUIRED') {
        return reply.status(400).send({
          success: false,
          error: 'Envie a imagem do banner para liberar pela primeira vez',
        })
      }
      logger.error('Erro ao liberar máquina:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao liberar agendamento' })
    }
  })

  // POST unrelease
  app.post('/machine-rentals/:id/unrelease', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('POST', `/machine-rentals/${id}/unrelease`)

    try {
      await finalizePastReleasedOccurrences()
      const occ = await prisma.machineRentalOccurrence.findUnique({
        where: { id },
        include: { banner: true },
      })
      if (!occ) {
        return reply.status(404).send({ success: false, error: 'Ocorrência não encontrada' })
      }
      if (occ.status !== MachineRentalStatus.RELEASED) {
        return reply.status(400).send({ success: false, error: 'Ocorrência não está liberada' })
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (occ.banner) {
          await tx.banner.update({
            where: { id: occ.banner.id },
            data: { isActive: false },
          })
        }
        return tx.machineRentalOccurrence.update({
          where: { id },
          data: { status: MachineRentalStatus.HELD, releasedAt: null },
          include: { banner: true },
        })
      })

      return reply.status(200).send({
        success: true,
        data: { ...updated, dateYmd: dateToYmd(updated.date) },
      })
    } catch (error) {
      logger.error('Erro ao desfazer liberação:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao desfazer liberação' })
    }
  })
}
