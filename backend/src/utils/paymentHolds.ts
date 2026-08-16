import { prisma } from '../lib/prisma'
import { logger } from './logger'
import { notifyAppointmentCanceled } from './notifications'
import { releaseVoucherOnCancel } from './vouchers'
import { cancelUnpaidPackagePurchase } from './packages'
import { cancelPaymentSilent, cancelPendingByExternalReference } from '../lib/asaas'

/**
 * Reserva de horário com pagamento online pendente ("hold").
 *
 * Agendamentos pagos via checkout nascem com status PENDING +
 * paymentStatus PENDING + paymentExpiresAt = agora + PAYMENT_HOLD_MINUTES.
 * Enquanto o hold está ativo, o horário fica reservado (bloqueia conflitos).
 * Se o pagamento não confirmar no prazo, o hold expira, a cobrança Asaas
 * é cancelada (QR morre) e o horário libera.
 *
 * A expiração NÃO depende só de cron (Fly em scale-to-zero pode dormir):
 * `releaseExpiredPaymentHolds` roda de forma preguiçosa ao listar/buscar
 * agendamentos, ao consultar slots e antes de criar/reagendar.
 *
 * Se o Pix cair depois do cancel, o webhook revive-ou-estorna.
 */
export const PAYMENT_HOLD_MINUTES = 5

/** Máximo de holds ativos (checkout não pago) por usuário — anti-abuso. */
export const MAX_ACTIVE_PAYMENT_HOLDS_PER_USER = 2

export function newPaymentHoldExpiration(): Date {
  return new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000)
}

/**
 * Cancela agendamentos cujo hold de pagamento expirou, liberando os horários.
 * Só afeta linhas com paymentExpiresAt preenchido (holds de checkout online) —
 * nunca toca em "pagar na clínica" (ADMIN_CREATED), assinatura ou voucher grátis.
 * Cria notificação in-app para cada cliente afetado.
 */
export async function releaseExpiredPaymentHolds(): Promise<number> {
  try {
    const expired = await prisma.appointment.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentExpiresAt: { lt: new Date() }
      },
      include: {
        service: { select: { name: true } }
      }
    })

    if (expired.length === 0) return 0

    const cancelReason = `Pagamento não concluído em ${PAYMENT_HOLD_MINUTES} minutos`
    const canceledAt = new Date()
    const handledPurchases = new Set<string>()
    let released = 0

    for (const appointment of expired) {
      if (appointment.packagePurchaseId) {
        if (handledPurchases.has(appointment.packagePurchaseId)) continue
        handledPurchases.add(appointment.packagePurchaseId)
        const purchase = await prisma.packagePurchase.findUnique({
          where: { id: appointment.packagePurchaseId },
          select: { asaasPaymentId: true },
        })
        await cancelPendingByExternalReference(`pkg_${appointment.packagePurchaseId}`)
        await cancelPaymentSilent(purchase?.asaasPaymentId || appointment.asaasPaymentId)
        await prisma.$transaction(async (tx) => {
          await cancelUnpaidPackagePurchase(tx, appointment.packagePurchaseId!, cancelReason)
        })
        try {
          await notifyAppointmentCanceled(appointment.userId, {
            serviceName: appointment.service.name,
            startTime: appointment.startTime,
            cancelReason
          })
        } catch (notifyError) {
          logger.error(`Erro ao notificar cancelamento do hold ${appointment.id}:`, notifyError)
        }
        released += 1
        continue
      }

      await cancelPendingByExternalReference(`apt_${appointment.id}`)
      await cancelPaymentSilent(appointment.asaasPaymentId)
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELED',
          canceledBy: 'system',
          canceledAt,
          cancelReason,
          paymentExpiresAt: null,
        }
      })
      released += 1

      try {
        await releaseVoucherOnCancel(appointment.voucherId)
      } catch (voucherError) {
        logger.error(`Erro ao liberar voucher do hold ${appointment.id}:`, voucherError)
      }

      try {
        await notifyAppointmentCanceled(appointment.userId, {
          serviceName: appointment.service.name,
          startTime: appointment.startTime,
          cancelReason
        })
      } catch (notifyError) {
        logger.error(`Erro ao notificar cancelamento do hold ${appointment.id}:`, notifyError)
      }
    }

    logger.warning(`⏰ ${released} reserva(s) com pagamento expirado liberada(s)`)
    return released
  } catch (error) {
    logger.error('Erro ao liberar holds de pagamento expirados:', error)
    return 0
  }
}

/** Quantos holds ativos (ainda não pagos / não expirados) o usuário tem.
 *  Um pacote com várias sessões no mesmo checkout conta como 1 hold. */
export async function countActivePaymentHolds(userId: string): Promise<number> {
  const holds = await prisma.appointment.findMany({
    where: {
      userId,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentExpiresAt: { gt: new Date() }
    },
    select: { id: true, packagePurchaseId: true }
  })
  const unique = new Set(holds.map((hold) => hold.packagePurchaseId || hold.id))
  return unique.size
}
