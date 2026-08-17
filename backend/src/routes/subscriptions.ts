import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { buildRemainingByMonth } from '../utils/planUsage'
import { cancelSubscription as cancelAsaasSubscription, getSubscription as getAsaasSubscription } from '../lib/asaas'
import {
  applyPlanChange,
  cancelScheduledPlanChange,
  hasPaidClubSubscription,
  resolveNextDueDate,
  scheduleDowngrade,
} from '../utils/planChange'

/** Fim do ciclo já pago a partir do dia de aniversário da assinatura (fallback sem gateway). */
function computeAccessUntilFromStartDate(startDate: Date, now: Date = new Date()): Date {
  const dayOfMonth = startDate.getDate()
  const nextBillingDate = new Date(now)
  nextBillingDate.setDate(dayOfMonth)
  if (now.getDate() >= dayOfMonth) {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
  }
  const accessUntil = new Date(nextBillingDate)
  accessUntil.setDate(accessUntil.getDate() - 1)
  accessUntil.setHours(23, 59, 59, 999)
  return accessUntil
}

export async function subscriptionsRoutes(app: FastifyInstance) {
  // GET - Listar todas as assinaturas
  app.get('/subscriptions', async (request, reply) => {
    logger.route('GET', '/subscriptions')
    
    try {
      const { status } = request.query as { status?: string }
      
      const subscriptions = await prisma.subscription.findMany({
        where: {
          ...(status && { status: status.toUpperCase() as any })
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
          plan: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      logger.success(`Retornando ${subscriptions.length} assinaturas`)
      return reply.status(200).send({
        success: true,
        data: subscriptions
      })
    } catch (error) {
      logger.error('Erro ao buscar assinaturas:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar assinaturas'
      })
    }
  })

  // GET - Buscar assinatura de um usuário
  app.get('/subscriptions/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('GET', `/subscriptions/user/${userId}`)
    
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          plan: {
            include: {
              services: true
            }
          },
          pendingPlan: true,
        }
      })
      
      if (!subscription) {
        logger.warning(`Assinatura não encontrada para usuário: ${userId}`)
        return reply.status(404).send({
          success: false,
          error: 'Assinatura não encontrada'
        })
      }
      
      const remaining = await buildRemainingByMonth(userId, subscription.plan.maxTreatmentsPerMonth)
      const nextDueDate = await resolveNextDueDate(subscription)
      
      logger.success(`Assinatura encontrada: ${subscription.id}`)
      return reply.status(200).send({
        success: true,
        data: {
          ...subscription,
          nextDueDate: nextDueDate.toISOString(),
          currentMonthUsage: {
            totalTreatments: subscription.plan.maxTreatmentsPerMonth - remaining.thisMonth
          },
          limits: {
            maxPerMonth: subscription.plan.maxTreatmentsPerMonth,
            maxPerDay: 3
          },
          remaining
        }
      })
    } catch (error) {
      logger.error('Erro ao buscar assinatura:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar assinatura'
      })
    }
  })

  // POST - Criar assinatura (mock - sem Stripe por enquanto)
  app.post('/subscriptions', async (request, reply) => {
    logger.route('POST', '/subscriptions')
    
    try {
      const {
        userId,
        planId,
        stripeSubscriptionId,
        asaasSubscriptionId,
      } = request.body as {
        userId: string
        planId: string
        stripeSubscriptionId?: string
        asaasSubscriptionId?: string
      }
      
      logger.debug('Criando nova assinatura:', { userId, planId })
      
      // Verifica se usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      // Verifica se já tem assinatura ativa
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId }
      })
      
      if (existingSubscription && existingSubscription.status === 'ACTIVE') {
        return reply.status(400).send({
          success: false,
          error: 'Usuário já possui uma assinatura ativa'
        })
      }
      
      // Verifica se plano existe
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId }
      })
      
      if (!plan) {
        return reply.status(404).send({
          success: false,
          error: 'Plano não encontrado'
        })
      }
      
      // Cria ou atualiza assinatura (sem fidelidade / compromisso mínimo)
      const subscription = await prisma.subscription.upsert({
        where: { userId },
        update: {
          planId,
          stripeSubscriptionId,
          asaasSubscriptionId,
          status: 'ACTIVE',
          startDate: new Date(),
          minimumCommitmentEnd: null,
          endDate: null,
          canceledAt: null,
          cancelReason: null
        },
        create: {
          userId,
          planId,
          stripeSubscriptionId,
          asaasSubscriptionId,
          status: 'ACTIVE',
          startDate: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          plan: true
        }
      })
      
      logger.success(`Assinatura criada: ${subscription.id}`)
      return reply.status(201).send({
        success: true,
        data: subscription,
        message: `Assinatura ${plan.name} ativada com sucesso!`
      })
    } catch (error) {
      logger.error('Erro ao criar assinatura:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar assinatura'
      })
    }
  })

  // PUT - Cancelar assinatura
  app.put('/subscriptions/:userId/cancel', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('PUT', `/subscriptions/${userId}/cancel`)
    
    try {
      const { cancelReason } = request.body as { cancelReason?: string }
      
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true }
      })
      
      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: 'Assinatura não encontrada'
        })
      }
      
      if (subscription.status === 'CANCELED') {
        return reply.status(400).send({
          success: false,
          error: 'Assinatura já está cancelada'
        })
      }
      
      const now = new Date()
      
      // Fim do período já pago: nextDueDate Asaas se houver; senão aniversário local.
      let accessUntil: Date

      if (subscription.asaasSubscriptionId) {
        try {
          const asaasSub = await getAsaasSubscription(subscription.asaasSubscriptionId)
          if (asaasSub.nextDueDate) {
            const next = new Date(`${asaasSub.nextDueDate}T23:59:59.999-03:00`)
            accessUntil = new Date(next)
            accessUntil.setDate(accessUntil.getDate() - 1)
          } else {
            accessUntil = computeAccessUntilFromStartDate(subscription.startDate, now)
          }
          await cancelAsaasSubscription(subscription.asaasSubscriptionId)
          logger.info(`Asaas: assinatura inativada; acesso até ${accessUntil.toISOString()}`)
        } catch (asaasError: any) {
          logger.error('Erro ao cancelar no Asaas (seguindo com cálculo local):', asaasError.message)
          accessUntil = computeAccessUntilFromStartDate(subscription.startDate, now)
        }
      } else {
        accessUntil = computeAccessUntilFromStartDate(subscription.startDate, now)
      }
      
      // Cancela a assinatura mas mantém acesso até o fim do período pago
      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELED',
          canceledAt: now,
          cancelReason,
          endDate: accessUntil,
          minimumCommitmentEnd: null,
          pendingPlanId: null,
          pendingChangeAt: null,
        },
        include: {
          user: true,
          plan: true
        }
      })
      
      logger.info(`Assinatura cancelada. Acesso mantido até: ${accessUntil.toISOString()}`)
      
      logger.success(`Assinatura cancelada: ${userId}`)
      return reply.status(200).send({
        success: true,
        data: updatedSubscription,
        accessUntil: accessUntil,
        message: `Assinatura cancelada. Você ainda pode usar seus benefícios até ${accessUntil.toLocaleDateString('pt-BR')}. Não haverá novas cobranças.`
      })
    } catch (error) {
      logger.error('Erro ao cancelar assinatura:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao cancelar assinatura'
      })
    }
  })

  // PUT - Pausar assinatura
  app.put('/subscriptions/:userId/pause', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('PUT', `/subscriptions/${userId}/pause`)
    
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      })
      
      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: 'Assinatura não encontrada'
        })
      }
      
      if (subscription.status !== 'ACTIVE') {
        return reply.status(400).send({
          success: false,
          error: 'Apenas assinaturas ativas podem ser pausadas'
        })
      }
      
      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'PAUSED'
        },
        include: {
          user: true,
          plan: true
        }
      })
      
      logger.success(`Assinatura pausada: ${userId}`)
      return reply.status(200).send({
        success: true,
        data: updatedSubscription,
        message: 'Assinatura pausada com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao pausar assinatura:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao pausar assinatura'
      })
    }
  })

  // PUT - Reativar assinatura
  app.put('/subscriptions/:userId/reactivate', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('PUT', `/subscriptions/${userId}/reactivate`)
    
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      })
      
      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: 'Assinatura não encontrada'
        })
      }
      
      if (subscription.status !== 'PAUSED') {
        return reply.status(400).send({
          success: false,
          error: 'Apenas assinaturas pausadas podem ser reativadas'
        })
      }
      
      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'ACTIVE'
        },
        include: {
          user: true,
          plan: true
        }
      })
      
      logger.success(`Assinatura reativada: ${userId}`)
      return reply.status(200).send({
        success: true,
        data: updatedSubscription,
        message: 'Assinatura reativada com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao reativar assinatura:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao reativar assinatura'
      })
    }
  })

  // PUT - Trocar de plano (upgrade exige checkout; downgrade é agendado)
  app.put('/subscriptions/:userId/change-plan', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('PUT', `/subscriptions/${userId}/change-plan`)
    
    try {
      const { newPlanId, cancelPending } = request.body as { newPlanId?: string; cancelPending?: boolean }

      if (cancelPending) {
        const updated = await cancelScheduledPlanChange(userId)
        return reply.status(200).send({
          success: true,
          data: {
            ...updated,
            scheduled: false,
            isUpgrade: false,
            message: 'Troca de plano cancelada. Você permanece no plano atual.',
          },
          message: 'Troca de plano cancelada. Você permanece no plano atual.',
        })
      }
      
      if (!newPlanId) {
        return reply.status(400).send({
          success: false,
          error: 'newPlanId é obrigatório'
        })
      }
      
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true, pendingPlan: true }
      })
      
      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: 'Assinatura não encontrada'
        })
      }
      
      if (subscription.status !== 'ACTIVE') {
        return reply.status(400).send({
          success: false,
          error: 'Apenas assinaturas ativas podem ter o plano alterado'
        })
      }
      
      if (subscription.planId === newPlanId && !subscription.pendingPlanId) {
        return reply.status(400).send({
          success: false,
          error: 'Este já é o plano atual'
        })
      }
      
      const newPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: newPlanId }
      })
      
      if (!newPlan) {
        return reply.status(404).send({
          success: false,
          error: 'Novo plano não encontrado'
        })
      }

      const isFreeMonth = !hasPaidClubSubscription(subscription)
      const isUpgrade = newPlan.price > subscription.plan.price
      const isDowngrade = newPlan.price < subscription.plan.price

      if (isFreeMonth || (!isUpgrade && !isDowngrade && subscription.planId !== newPlanId)) {
        const applied = await applyPlanChange(userId, newPlanId)
        return reply.status(200).send({
          success: true,
          data: {
            ...applied.subscription,
            scheduled: false,
            isUpgrade: applied.isUpgrade,
            oldPlan: applied.oldPlan.name,
            newPlan: applied.newPlan.name,
            message: `Plano alterado para ${applied.newPlan.name} com sucesso!`,
          },
          isUpgrade: applied.isUpgrade,
          oldPlan: applied.oldPlan.name,
          newPlan: applied.newPlan.name,
          message: `Plano alterado para ${applied.newPlan.name} com sucesso!`,
        })
      }

      if (isUpgrade) {
        const difference = Number((newPlan.price - subscription.plan.price).toFixed(2))
        return reply.status(400).send({
          success: false,
          error: 'Upgrade exige pagamento da diferença no checkout',
          requiresCheckout: true,
          difference,
          newPlanId: newPlan.id,
          newPlanName: newPlan.name,
        })
      }

      const scheduled = await scheduleDowngrade(userId, newPlanId)
      const effectiveAt = scheduled.effectiveAt.toISOString()
      return reply.status(200).send({
        success: true,
        data: {
          ...scheduled.subscription,
          scheduled: true,
          isUpgrade: false,
          effectiveAt,
          nextDueDate: effectiveAt,
          pendingPlan: scheduled.pendingPlan,
          oldPlan: subscription.plan.name,
          newPlan: scheduled.pendingPlan.name,
          message: `Você continua no ${subscription.plan.name} até ${scheduled.effectiveAt.toLocaleDateString('pt-BR')}. Depois passa para ${scheduled.pendingPlan.name}.`,
        },
        scheduled: true,
        isUpgrade: false,
        effectiveAt,
        oldPlan: subscription.plan.name,
        newPlan: scheduled.pendingPlan.name,
        message: `Você continua no ${subscription.plan.name} até ${scheduled.effectiveAt.toLocaleDateString('pt-BR')}. Depois passa para ${scheduled.pendingPlan.name}.`,
      })
    } catch (error: any) {
      logger.error('Erro ao trocar plano:', error)
      const message = error?.message || 'Erro ao trocar plano'
      const status =
        /não encontrada/i.test(message) ? 404 :
        /obrigatório|ativas|já é o plano|Downgrade|agendada/i.test(message) ? 400 :
        500
      return reply.status(status).send({
        success: false,
        error: message
      })
    }
  })

  app.delete('/subscriptions/:userId/pending-plan', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('DELETE', `/subscriptions/${userId}/pending-plan`)
    try {
      const updated = await cancelScheduledPlanChange(userId)
      return reply.status(200).send({
        success: true,
        data: {
          ...updated,
          scheduled: false,
          message: 'Troca de plano cancelada. Você permanece no plano atual.',
        },
        message: 'Troca de plano cancelada. Você permanece no plano atual.',
      })
    } catch (error: any) {
      const message = error?.message || 'Erro ao cancelar troca de plano'
      const status = /não encontrada/i.test(message) ? 404 : /agendada/i.test(message) ? 400 : 500
      return reply.status(status).send({ success: false, error: message })
    }
  })
  
  // ============================================
  // POST - Verificar e expirar mês grátis
  // ============================================
  app.post('/subscriptions/check-expiration/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('POST', `/subscriptions/check-expiration/${userId}`)
    
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true }
      })
      
      if (!subscription) {
        return reply.status(200).send({
          success: true,
          expired: false,
          message: 'Sem assinatura'
        })
      }
      
      // Verificar se é mês grátis expirado
      const now = new Date()
      const isFreeMonth = !subscription.stripeSubscriptionId && !subscription.asaasSubscriptionId
      const isExpired = subscription.endDate && subscription.endDate < now
      
      if (isFreeMonth && isExpired && subscription.status === 'ACTIVE') {
        // Cancelar assinatura expirada
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'CANCELED',
            canceledAt: now,
            cancelReason: 'Mês grátis expirado'
          }
        })
        
        // Notificar cliente
        const { createNotification } = await import('../utils/notifications')
        await createNotification({
          userId,
          type: 'SUBSCRIPTION_CANCELED',
          title: 'Seu Mês Grátis Expirou',
          message: `Seu período de teste do plano ${subscription.plan.name} terminou. Que tal assinar para continuar aproveitando?`,
          icon: 'INFO',
          priority: 'HIGH',
          actionUrl: '/planos',
          actionLabel: 'Ver Planos'
        })
        
        logger.warning(`⏰ Mês grátis expirado para userId ${userId} - cancelado`)
        
        return reply.status(200).send({
          success: true,
          expired: true,
          message: 'Assinatura de mês grátis expirada e cancelada'
        })
      }
      
      return reply.status(200).send({
        success: true,
        expired: false,
        message: 'Assinatura válida'
      })
    } catch (error: any) {
      logger.error('Erro ao verificar expiração:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao verificar expiração',
        details: error.message
      })
    }
  })
}

