import { prisma } from '../lib/prisma'
import {
  getSubscription as getAsaasSubscription,
  isAsaasPaidStatus,
  listPayments,
  type AsaasPayment,
  updateSubscription,
} from '../lib/asaas'
import { logger } from './logger'
import { createNotification, notifySubscriptionActivated } from './notifications'

export function clubSubscriptionReference(userId: string, planId: string) {
  return `sub_${userId}_${planId}`
}

export function upgradeReference(userId: string, planId: string) {
  return `upgrade_${userId}_${planId}`
}

export function parseExternalReference(ref?: string | null) {
  if (!ref) return { kind: null as string | null, id: null as string | null, extra: null as string | null }
  if (ref.startsWith('pkg_')) return { kind: 'package', id: ref.slice(4), extra: null }
  if (ref.startsWith('apt_')) return { kind: 'appointment', id: ref.slice(4), extra: null }
  if (ref.startsWith('upgrade_')) {
    const rest = ref.slice(8)
    const split = rest.split('_')
    return { kind: 'upgrade', id: split[0] || null, extra: split.slice(1).join('_') || null }
  }
  if (ref.startsWith('sub_')) {
    const rest = ref.slice(4)
    const split = rest.split('_')
    return { kind: 'subscription', id: split[0] || null, extra: split.slice(1).join('_') || null }
  }
  return { kind: null as string | null, id: null as string | null, extra: null as string | null }
}

export function hasPaidClubSubscription(sub?: {
  status?: string | null
  asaasSubscriptionId?: string | null
} | null) {
  return Boolean(sub && sub.status === 'ACTIVE' && sub.asaasSubscriptionId)
}

export function isCancelInProgress(sub?: {
  status?: string | null
  endDate?: Date | string | null
} | null) {
  if (!sub || sub.status !== 'CANCELED' || !sub.endDate) return false
  return new Date(sub.endDate).getTime() > Date.now()
}

export function formatPlanDatePtBr(value: Date | string) {
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

/** Dia seguinte ao último dia pago — volta a ser o nextDueDate da recorrência. */
export function nextDueIsoAfterAccessUntil(endDate: Date | string) {
  const iso = new Date(endDate).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const [year, month, day] = iso.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return next.toISOString().slice(0, 10)
}

export function clubAlreadyCoveredError(sub?: {
  status?: string | null
  asaasSubscriptionId?: string | null
  endDate?: Date | string | null
} | null) {
  if (isCancelInProgress(sub) && sub?.endDate) {
    return `Você tem um cancelamento em andamento e o plano vale até ${formatPlanDatePtBr(sub.endDate)}. Desfaça o cancelamento em Meu plano — não é preciso pagar de novo.`
  }
  if (hasPaidClubSubscription(sub)) {
    return 'Você já tem um plano ativo. Use a troca de plano para upgrade ou downgrade.'
  }
  return null
}

export function computeNextBillingDate(startDate: Date, now: Date = new Date()): Date {
  const dayOfMonth = startDate.getDate()
  const next = new Date(now)
  next.setHours(12, 0, 0, 0)
  next.setDate(dayOfMonth)
  if (now.getDate() >= dayOfMonth) {
    next.setMonth(next.getMonth() + 1)
  }
  return next
}

export function asaasDateToDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000-03:00`)
}

export async function resolveNextDueDate(subscription: {
  startDate: Date
  asaasSubscriptionId?: string | null
}): Promise<Date> {
  if (subscription.asaasSubscriptionId) {
    try {
      const asaasSub = await getAsaasSubscription(subscription.asaasSubscriptionId)
      if (asaasSub.nextDueDate) return asaasDateToDate(asaasSub.nextDueDate)
    } catch (error: any) {
      logger.warning(`Não foi possível ler nextDueDate Asaas: ${error.message}`)
    }
  }
  return computeNextBillingDate(subscription.startDate)
}

export async function syncAsaasSubscriptionPlan(opts: {
  asaasSubscriptionId: string
  userId: string
  plan: { id: string; name: string; price: number }
  updatePendingPayments?: boolean
}) {
  try {
    await updateSubscription(opts.asaasSubscriptionId, {
      value: opts.plan.price,
      description: `Charme & Bela Club - ${opts.plan.name}`,
      externalReference: clubSubscriptionReference(opts.userId, opts.plan.id),
      updatePendingPayments: opts.updatePendingPayments !== false,
    })
  } catch (error: any) {
    logger.error(`Erro ao sincronizar assinatura Asaas ${opts.asaasSubscriptionId}:`, error.message)
    throw error
  }
}

const planInclude = {
  plan: { include: { services: true } },
  pendingPlan: true,
  user: {
    select: { id: true, name: true, email: true },
  },
} as const

export async function applyPlanChange(userId: string, newPlanId: string) {
  const [subscription, newPlan] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true, pendingPlan: true, user: { select: { id: true, name: true } } },
    }),
    prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } }),
  ])

  if (!subscription) {
    throw new Error('Assinatura não encontrada')
  }
  if (!newPlan) {
    throw new Error('Novo plano não encontrado')
  }

  const oldPlan = subscription.plan
  if (subscription.planId === newPlanId && !subscription.pendingPlanId) {
    const current = await prisma.subscription.findUnique({
      where: { userId },
      include: planInclude,
    })
    return {
      subscription: current || subscription,
      oldPlan,
      newPlan,
      isUpgrade: false,
    }
  }

  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      planId: newPlanId,
      pendingPlanId: null,
      pendingChangeAt: null,
      status: 'ACTIVE',
      endDate: null,
      canceledAt: null,
      cancelReason: null,
    },
    include: planInclude,
  })

  if (subscription.asaasSubscriptionId) {
    try {
      await syncAsaasSubscriptionPlan({
        asaasSubscriptionId: subscription.asaasSubscriptionId,
        userId,
        plan: newPlan,
        updatePendingPayments: true,
      })
    } catch (error: any) {
      logger.warning(`Plano local atualizado, mas o Asaas não sincronizou: ${error.message}`)
    }
  }

  await notifySubscriptionActivated(userId, {
    planName: newPlan.name,
    maxTreatments: newPlan.maxTreatmentsPerMonth,
  })
  await createNotification({
    userId: null,
    type: 'SUBSCRIPTION_ACTIVATED',
    title: 'Troca de plano',
    message: `${subscription.user.name} passou de ${oldPlan.name} para ${newPlan.name}`,
    icon: 'STAR',
    priority: 'HIGH',
    actionUrl: '/admin/atividades',
    actionLabel: 'Ver Atividades',
    metadata: { userId, oldPlanId: oldPlan.id, newPlanId: newPlan.id },
  })

  logger.success(`Plano aplicado: ${oldPlan.name} → ${newPlan.name} (${userId})`)

  return {
    subscription: updated,
    oldPlan,
    newPlan,
    isUpgrade: newPlan.price > oldPlan.price,
  }
}

export async function scheduleDowngrade(userId: string, newPlanId: string) {
  const [subscription, newPlan] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true, pendingPlan: true },
    }),
    prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } }),
  ])

  if (!subscription) throw new Error('Assinatura não encontrada')
  if (!newPlan) throw new Error('Novo plano não encontrado')
  if (subscription.status !== 'ACTIVE') {
    throw new Error('Apenas assinaturas ativas podem ter o plano alterado')
  }
  if (newPlan.price >= subscription.plan.price) {
    throw new Error('Downgrade só vale para um plano mais barato')
  }

  const nextDueDate = await resolveNextDueDate(subscription)

  if (subscription.asaasSubscriptionId) {
    await syncAsaasSubscriptionPlan({
      asaasSubscriptionId: subscription.asaasSubscriptionId,
      userId,
      plan: newPlan,
      updatePendingPayments: true,
    })
  }

  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      pendingPlanId: newPlanId,
      pendingChangeAt: new Date(),
    },
    include: planInclude,
  })

  logger.success(`Downgrade agendado: ${subscription.plan.name} → ${newPlan.name} em ${nextDueDate.toISOString()}`)

  return {
    subscription: updated,
    pendingPlan: newPlan,
    effectiveAt: nextDueDate,
    nextDueDate,
  }
}

export async function cancelScheduledPlanChange(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true, pendingPlan: true },
  })
  if (!subscription) throw new Error('Assinatura não encontrada')
  if (!subscription.pendingPlanId) {
    throw new Error('Não há troca de plano agendada')
  }

  if (subscription.asaasSubscriptionId) {
    await syncAsaasSubscriptionPlan({
      asaasSubscriptionId: subscription.asaasSubscriptionId,
      userId,
      plan: subscription.plan,
      updatePendingPayments: true,
    })
  }

  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      pendingPlanId: null,
      pendingChangeAt: null,
    },
    include: planInclude,
  })

  logger.success(`Troca de plano cancelada para ${userId}`)
  return updated
}

export function isUpgradePaymentLabel(payment: { description?: string | null; externalReference?: string | null }) {
  const ref = parseExternalReference(payment.externalReference)
  if (ref.kind === 'upgrade') return true
  return /upgrade/i.test(payment.description || '')
}

export function upgradeHistoryDescription(payment: { description?: string | null; externalReference?: string | null }) {
  const raw = (payment.description || '').trim()
  if (raw && /upgrade/i.test(raw)) return raw
  return 'Upgrade de plano Charme & Bela Club'
}

async function inferUpgradePlanId(
  payment: AsaasPayment,
  currentPlan: { id: string; name: string; price: number },
): Promise<string | null> {
  const ref = parseExternalReference(payment.externalReference)
  if (ref.kind === 'appointment' || ref.kind === 'package' || ref.kind === 'subscription') {
    return null
  }
  if (ref.kind === 'upgrade' && ref.extra) return ref.extra

  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true } })
  const description = payment.description || ''
  if (/upgrade/i.test(description) || description.includes('→')) {
    const arrow = description.split('→').pop()?.trim()
    if (arrow) {
      const byName = plans.find(
        (plan) => plan.id !== currentPlan.id && plan.name.toLowerCase() === arrow.toLowerCase(),
      )
      if (byName) return byName.id
    }
    const upgradeName = description.replace(/^upgrade\s+/i, '').trim()
    if (upgradeName) {
      const byName = plans.find(
        (plan) => plan.id !== currentPlan.id && upgradeName.toLowerCase().includes(plan.name.toLowerCase()),
      )
      if (byName) return byName.id
    }
  }

  if (payment.subscription) return null
  const desc = description.trim()
  const looksClub =
    !desc ||
    /upgrade|charme|club|plano|diferen/i.test(desc) ||
    plans.some((plan) => desc.toLowerCase().includes(plan.name.toLowerCase()))
  if (!looksClub) return null
  const linked = await prisma.appointment.findFirst({
    where: { asaasPaymentId: payment.id },
    select: { id: true },
  })
  if (linked) return null
  const matches = plans.filter(
    (plan) =>
      plan.price > currentPlan.price &&
      Math.abs(plan.price - currentPlan.price - Number(payment.value)) < 0.051,
  )
  return matches.length === 1 ? matches[0].id : null
}

export function isLikelyUpgradeHistoryPayment(
  payment: AsaasPayment,
  opts: { linkedAppointmentIds: Set<string>; planPrices: number[]; planNames?: string[] },
) {
  if (isUpgradePaymentLabel(payment)) return true
  if (payment.subscription) return false
  const ref = parseExternalReference(payment.externalReference)
  if (ref.kind) return false
  if (opts.linkedAppointmentIds.has(payment.id)) return false
  const desc = (payment.description || '').trim()
  const looksClub =
    !desc ||
    /upgrade|charme|club|plano|diferen/i.test(desc) ||
    (opts.planNames || []).some((name) => desc.toLowerCase().includes(name.toLowerCase()))
  if (!looksClub) return false
  const uniqueDeltas = new Set<number>()
  for (const from of opts.planPrices) {
    for (const to of opts.planPrices) {
      if (to > from) uniqueDeltas.add(Number((to - from).toFixed(2)))
    }
  }
  return [...uniqueDeltas].some((delta) => Math.abs(delta - Number(payment.value)) < 0.051)
}

export async function recoverMissedUpgrade(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: { include: { plan: true } } },
  })
  if (!user?.asaasCustomerId || !hasPaidClubSubscription(user.subscription) || !user.subscription) {
    return null
  }

  try {
    const listed = await listPayments({ customer: user.asaasCustomerId, limit: 40 })
    const paid = (listed.data || []).filter(
      (payment) => isAsaasPaidStatus(payment.status) && !payment.deleted && !payment.subscription,
    )
    for (const payment of paid) {
      const newPlanId = await inferUpgradePlanId(payment, user.subscription.plan)
      if (!newPlanId || newPlanId === user.subscription.planId) continue
      const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } })
      if (!newPlan || newPlan.price <= user.subscription.plan.price) continue
      logger.info(`Recuperando upgrade pago ${payment.id}: ${user.subscription.plan.name} → ${newPlan.name}`)
      return applyPlanChange(user.id, newPlanId)
    }
  } catch (error: any) {
    logger.warning(`Não foi possível recuperar upgrade pago de ${userId}: ${error.message}`)
  }
  return null
}
