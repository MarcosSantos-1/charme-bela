import {
  AppointmentStatus,
  AppointmentOrigin,
  VoucherType,
} from '@prisma/client'
import { prisma } from '../lib/prisma'
import { notifyAppointmentCanceled, createNotification } from './notifications'
import { releaseSessionOnCancel } from './packages'

export type ClinicAffectedAppointment = {
  id: string
  startTime: Date
  endTime: Date
  status: AppointmentStatus
  origin: AppointmentOrigin
  packagePurchaseId: string | null
  paymentStatus: string | null
  paymentAmount: number | null
  cancelReason?: string
  user: { id: string; name: string; email: string; phone: string | null }
  service: { id: string; name: string; machineKind?: string | null; price: number }
}

export const affectedAppointmentInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  service: { select: { id: true, name: true, machineKind: true, price: true } },
} as const

function isActiveStatus(status: AppointmentStatus) {
  return status === AppointmentStatus.PENDING || status === AppointmentStatus.CONFIRMED
}

export async function cancelClinicAppointments(
  appointments: ClinicAffectedAppointment[],
  defaultReason: string,
  compensation: 'credit' | 'none',
  adminUserId: string
) {
  for (const apt of appointments) {
    if (!isActiveStatus(apt.status)) continue

    const reason = apt.cancelReason || defaultReason
    const isPackageSession = Boolean(apt.packagePurchaseId) || apt.origin === AppointmentOrigin.PACKAGE

    await prisma.$transaction(async (tx) => {
      if (isPackageSession) {
        await releaseSessionOnCancel(tx, apt)
      }

      await tx.appointment.update({
        where: { id: apt.id },
        data: {
          status: AppointmentStatus.CANCELED,
          canceledBy: 'admin',
          canceledAt: new Date(),
          cancelReason: reason,
        },
      })
    })

    if (compensation === 'credit') {
      if (!isPackageSession) {
        await prisma.voucher.create({
          data: {
            userId: apt.user.id,
            type: VoucherType.FREE_TREATMENT,
            description: `Cortesia para reagendar: ${apt.service.name}`,
            serviceId: apt.service.id,
            anyService: false,
            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            grantedBy: adminUserId,
            grantedReason: reason,
          },
        })
      }

      await createNotification({
        userId: apt.user.id,
        type: 'VOUCHER_RECEIVED',
        title: isPackageSession ? 'Reagende sua sessão' : 'Reagende seu tratamento',
        message: isPackageSession
          ? `Seu horário de ${apt.service.name} foi cancelado pela clínica. Reagende a sessão do pacote na agenda.`
          : `Seu agendamento de ${apt.service.name} foi cancelado pela clínica. Você recebeu uma cortesia para remarcar o tratamento.`,
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
