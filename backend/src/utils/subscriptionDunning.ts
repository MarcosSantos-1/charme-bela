import { prisma } from '../lib/prisma'
import {
  cancelPendingSubscriptionPayments,
  cancelSubscriptionSilent,
  isAsaasPaidStatus,
  listSubscriptionPayments,
  payChargeWithCardToken,
  updateSubscription,
  type AsaasPayment,
} from '../lib/asaas'
import { logger } from './logger'
import { notifyPaymentFailed, notifySubscriptionLapsed } from './notifications'
import { isCancelInProgress } from './planChange'
import { decrementMonthlyUsage } from './planUsage'

export const PAST_DUE_GRACE_DAYS = 7

export function pastDueGraceEndsAt(pastDueSince: Date) {
  const end = new Date(pastDueSince)
  end.setDate(end.getDate() + PAST_DUE_GRACE_DAYS)
  return end
}

export async function hasSavedCreditCard(userId: string) {
  const card = await prisma.savedCard.findFirst({
    where: { userId, kind: { not: 'debit' } },
    select: { id: true },
  })
  return Boolean(card)
}

/** Impede o Asaas de debitar um token que o cliente já apagou em Meu plano. */
export async function detachAsaasAutoDebit(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { asaasSubscriptionId: true, status: true },
  })
  if (!subscription?.asaasSubscriptionId) return
  if (subscription.status === 'CANCELED') return
  try {
    await cancelPendingSubscriptionPayments(subscription.asaasSubscriptionId)
    await updateSubscription(subscription.asaasSubscriptionId, {
      status: 'INACTIVE',
      updatePendingPayments: true,
    })
    logger.info(`Débito automático Asaas pausado para ${userId}: nenhum cartão de crédito salvo`)
  } catch (error: any) {
    logger.warning(`Não foi possível pausar o débito automático de ${userId}: ${error.message}`)
  }
}

export async function ensureAsaasDebitMatchesSavedCards(userId: string) {
  if (await hasSavedCreditCard(userId)) return
  await detachAsaasAutoDebit(userId)
}

export function daysLeftInPastDueGrace(pastDueSince: Date | string | null | undefined, now = new Date()) {
  if (!pastDueSince) return PAST_DUE_GRACE_DAYS
  const ends = pastDueGraceEndsAt(new Date(pastDueSince))
  return Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
}

export async function markSubscriptionPastDue(opts: {
  userId: string
  amount?: number
  planName?: string
  reason?: string
}) {
  const sub = await prisma.subscription.findUnique({ where: { userId: opts.userId } })
  if (!sub) return { firstFailure: false }
  if (isCancelInProgress(sub)) return { firstFailure: false }

  const firstFailure = !sub.pastDueSince
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'PAST_DUE',
      ...(firstFailure ? { pastDueSince: new Date() } : {}),
    },
  })

  if (firstFailure) {
    await notifyPaymentFailed(opts.userId, {
      amount: opts.amount ?? 0,
      description: opts.planName ? `Assinatura ${opts.planName}` : 'Assinatura',
      reason: opts.reason || 'Pagamento da assinatura não confirmado no prazo',
    })
  }

  return { firstFailure }
}

export async function clearPastDue(userId: string) {
  await prisma.subscription.updateMany({
    where: { userId },
    data: { pastDueSince: null },
  })
}

export async function findOverdueSubscriptionInvoice(asaasSubscriptionId: string): Promise<AsaasPayment | null> {
  const listed = await listSubscriptionPayments(asaasSubscriptionId)
  return (
    (listed.data || []).find(
      (item) =>
        !item.deleted &&
        (item.status === 'PENDING' || item.status === 'OVERDUE') &&
        !isAsaasPaidStatus(item.status),
    ) || null
  )
}

export async function retryOverdueSubscription(opts: {
  userId: string
  savedCardId?: string
  remoteIp?: string
}): Promise<{ paid: boolean; payment?: AsaasPayment; message?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    include: {
      subscription: { include: { plan: true } },
      savedCards: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
    },
  })
  if (!user?.subscription) {
    throw Object.assign(new Error('Assinatura não encontrada'), { statusCode: 404 })
  }
  if (user.subscription.status !== 'PAST_DUE') {
    throw Object.assign(new Error('Não há pagamento de assinatura em atraso'), { statusCode: 400 })
  }
  if (!user.subscription.asaasSubscriptionId) {
    throw Object.assign(new Error('Assinatura sem cobrança recorrente no Asaas'), { statusCode: 400 })
  }

  const invoice = await findOverdueSubscriptionInvoice(user.subscription.asaasSubscriptionId)
  if (!invoice) {
    return { paid: false, message: 'Nenhuma cobrança em aberto no Asaas. O pagamento pode já ter sido processado.' }
  }
  if (isAsaasPaidStatus(invoice.status)) {
    return { paid: true, payment: invoice }
  }

  const creditCards = user.savedCards.filter((card) => card.kind !== 'debit')
  const cards = opts.savedCardId
    ? creditCards.filter((card) => card.id === opts.savedCardId)
    : creditCards
  if (!cards.length) {
    throw Object.assign(
      new Error('Nenhum cartão de crédito salvo. Cadastre um cartão no checkout ou escolha outro cartão.'),
      { statusCode: 400 },
    )
  }

  const remoteIp = opts.remoteIp || '127.0.0.1'
  let lastError: Error | null = null
  for (const card of cards) {
    try {
      const charged = await payChargeWithCardToken(invoice.id, card.asaasToken, remoteIp)
      if (isAsaasPaidStatus(charged.status)) {
        await prisma.subscription.update({
          where: { id: user.subscription.id },
          data: { status: 'ACTIVE', pastDueSince: null, endDate: null, canceledAt: null, cancelReason: null },
        })
        return { paid: true, payment: charged }
      }
      lastError = new Error(`Cartão •••• ${card.last4} não confirmou o pagamento`)
    } catch (error: any) {
      lastError = error
      logger.warning(`Retry assinatura ${user.id} no cartão ${card.last4}: ${error.message}`)
    }
  }

  throw Object.assign(lastError || new Error('Não foi possível cobrar os cartões salvos'), { statusCode: 402 })
}

export async function lapseOverdueSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  })
  if (!sub || sub.status !== 'PAST_DUE') return { canceledAppointments: 0 }

  const now = new Date()
  if (sub.asaasSubscriptionId) {
    await cancelPendingSubscriptionPayments(sub.asaasSubscriptionId)
    await cancelSubscriptionSilent(sub.asaasSubscriptionId)
  }

  const futurePlanAppointments = await prisma.appointment.findMany({
    where: {
      userId,
      origin: 'SUBSCRIPTION',
      status: { not: 'CANCELED' },
      startTime: { gt: now },
    },
  })

  for (const appointment of futurePlanAppointments) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CANCELED',
        canceledBy: 'system',
        canceledAt: now,
        cancelReason: 'Assinatura encerrada por falta de pagamento',
      },
    })
    await decrementMonthlyUsage(userId, appointment.startTime)
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'CANCELED',
      canceledAt: sub.canceledAt || now,
      cancelReason: 'Pagamento não regularizado em 7 dias',
      endDate: now,
      pastDueSince: null,
      pendingPlanId: null,
      pendingChangeAt: null,
    },
  })

  await notifySubscriptionLapsed(userId, {
    planName: sub.plan.name,
    canceledAppointments: futurePlanAppointments.length,
  })

  logger.warning(
    `Assinatura ${userId} encerrada após 7 dias em atraso (${futurePlanAppointments.length} horário(s) do plano cancelado(s))`,
  )
  return { canceledAppointments: futurePlanAppointments.length }
}

export async function processPastDueSubscriptions() {
  const { isAsaasConfigured } = await import('../lib/asaas')
  if (!isAsaasConfigured()) return { retried: 0, lapsed: 0 }
  const overdue = await prisma.subscription.findMany({
    where: { status: 'PAST_DUE' },
    include: { user: { select: { id: true, name: true } } },
  })
  if (!overdue.length) return { retried: 0, lapsed: 0 }

  const now = new Date()
  let retried = 0
  let lapsed = 0

  for (const sub of overdue) {
    const since = sub.pastDueSince || sub.updatedAt
    if (now.getTime() - since.getTime() >= PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000) {
      try {
        await lapseOverdueSubscription(sub.userId)
        lapsed += 1
      } catch (error: any) {
        logger.error(`Falha ao encerrar assinatura atrasada ${sub.userId}:`, error)
      }
      continue
    }
    if (!sub.asaasSubscriptionId) continue
    if (!(await hasSavedCreditCard(sub.userId))) {
      await detachAsaasAutoDebit(sub.userId)
      continue
    }
    try {
      const result = await retryOverdueSubscription({ userId: sub.userId })
      if (result.paid) retried += 1
    } catch (error: any) {
      logger.warning(`Retry diário da assinatura ${sub.userId} não passou: ${error.message}`)
    }
  }

  if (retried || lapsed) {
    logger.info(`Dunning: ${retried} pagamento(s) recuperado(s), ${lapsed} plano(s) encerrado(s)`)
  }
  return { retried, lapsed }
}

export async function silenceExistingAsaasCustomers() {
  const { isAsaasConfigured, silenceAsaasCustomer } = await import('../lib/asaas')
  if (!isAsaasConfigured()) return 0
  const users = await prisma.user.findMany({
    where: { asaasCustomerId: { not: null } },
    select: { asaasCustomerId: true },
  })
  let silenced = 0
  for (const user of users) {
    if (!user.asaasCustomerId) continue
    await silenceAsaasCustomer(user.asaasCustomerId)
    silenced += 1
  }
  if (silenced) logger.info(`Asaas: ${silenced} cliente(s) com e-mails desligados`)
  return silenced
}
