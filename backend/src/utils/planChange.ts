import { prisma } from '../lib/prisma'
import {
  getSubscription as getAsaasSubscription,
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
