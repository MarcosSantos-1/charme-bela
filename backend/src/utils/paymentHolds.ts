import { prisma } from '../lib/prisma'
import { logger } from './logger'
import { notifyAppointmentCanceled } from './notifications'
import { releaseVoucherOnCancel } from './vouchers'
import { cancelUnpaidPackagePurchase } from './packages'

/**
 * Reserva de horário com pagamento online pendente ("hold").
 *
 * Agendamentos pagos via checkout (Stripe) nascem com status PENDING +
 * paymentStatus PENDING + paymentExpiresAt = agora + PAYMENT_HOLD_MINUTES.
 * Enquanto o hold está ativo, o horário fica reservado (bloqueia conflitos).
 * Se o pagamento não confirmar no prazo, o hold expira e o horário libera.
 *
 * A expiração NÃO depende só de cron (Fly em scale-to-zero pode dormir):
 * `releaseExpiredPaymentHolds` roda de forma preguiçosa ao listar/buscar
 * agendamentos, ao consultar slots e antes de criar/reagendar.
 *
 * Hold curto (5 min) libera o horário rápido para outras clientes.
 * A sessão do Stripe Checkout exige no mínimo 30 min (`expires_at`) — se o
 * cliente pagar depois do hold expirar, o webhook revive-ou-reembolsa.
 */
export const PAYMENT_HOLD_MINUTES = 5

/** Mínimo do Stripe Checkout para `expires_at` (segundos). */
export const STRIPE_CHECKOUT_MIN_EXPIRES_SECONDS = 30 * 60

/** Máximo de holds ativos (checkout não pago) por usuário — anti-abuso. */
export const MAX_ACTIVE_PAYMENT_HOLDS_PER_USER = 2

export function newPaymentHoldExpiration(): Date {
  return new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000)
}

/** `expires_at` Unix da sessão Stripe (sempre ≥ 30 min). */
export function stripeCheckoutExpiresAtUnix(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000) + STRIPE_CHECKOUT_MIN_EXPIRES_SECONDS
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

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELED',
          canceledBy: 'system',
          canceledAt,
          cancelReason
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
