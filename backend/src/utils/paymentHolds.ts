import { prisma } from '../lib/prisma'
import { logger } from './logger'

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
 */
export async function releaseExpiredPaymentHolds(): Promise<number> {
  try {
    const result = await prisma.appointment.updateMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentExpiresAt: { lt: new Date() }
      },
      data: {
        status: 'CANCELED',
        canceledBy: 'system',
        canceledAt: new Date(),
        cancelReason: `Pagamento não concluído em ${PAYMENT_HOLD_MINUTES} minutos`
      }
    })

    if (result.count > 0) {
      logger.warning(`⏰ ${result.count} reserva(s) com pagamento expirado liberada(s)`)
    }

    return result.count
  } catch (error) {
    logger.error('Erro ao liberar holds de pagamento expirados:', error)
    return 0
  }
}

/** Quantos holds ativos (ainda não pagos / não expirados) o usuário tem. */
export async function countActivePaymentHolds(userId: string): Promise<number> {
  return prisma.appointment.count({
    where: {
      userId,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentExpiresAt: { gt: new Date() }
    }
  })
}
