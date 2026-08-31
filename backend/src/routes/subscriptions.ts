import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { buildRemainingByMonth } from '../utils/planUsage'
import {
  cancelPendingSubscriptionPayments,
  cancelSubscription as cancelAsaasSubscription,
  createSubscription as createAsaasSubscription,
  getSubscription as getAsaasSubscription,
  updateSubscription as updateAsaasSubscription,
} from '../lib/asaas'
import {
  applyPlanChange,
  cancelScheduledPlanChange,
  clubSubscriptionReference,
  formatPlanDatePtBr,
  hasPaidClubSubscription,
  isCancelInProgress,
  nextDueIsoAfterAccessUntil,
  recoverMissedUpgrade,
  resolveNextDueDate,
  scheduleDowngrade,
} from '../utils/planChange'
import { daysLeftInPastDueGrace } from '../utils/subscriptionDunning'

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
      await recoverMissedUpgrade(userId)
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
      const cancelInProgress = isCancelInProgress(subscription)
      const nextDueDate =
        cancelInProgress && subscription.endDate
          ? new Date(`${nextDueIsoAfterAccessUntil(subscription.endDate)}T12:00:00.000-03:00`)
          : await resolveNextDueDate(subscription)
      logger.success(`Assinatura encontrada: ${subscription.id}`)
      return reply.status(200).send({
        success: true,
        data: {
          ...subscription,
          cancelInProgress,
          graceDaysLeft:
            subscription.status === 'PAST_DUE'
              ? daysLeftInPastDueGrace(subscription.pastDueSince)
              : null,
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

      // Ativação pelo admin = concessão sem cobrança (sem recorrência Asaas/Stripe)
      const stripeId = stripeSubscriptionId || null
      const asaasId = asaasSubscriptionId || null
      
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
          stripeSubscriptionId: stripeId,
          asaasSubscriptionId: asaasId,
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
          stripeSubscriptionId: stripeId,
          asaasSubscriptionId: asaasId,
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
        if (isCancelInProgress(subscription) && subscription.endDate) {
          const until = formatPlanDatePtBr(subscription.endDate)
          return reply.status(200).send({
            success: true,
            data: { ...subscription, cancelInProgress: true },
            accessUntil: subscription.endDate,
            message: `O cancelamento já está em andamento. Você tem até ${until} para aproveitar seu plano.`,
          })
        }
        return reply.status(400).send({
          success: false,
          error: 'Assinatura já está cancelada'
        })
      }
      
      const now = new Date()
      const isManagerGrant = !subscription.asaasSubscriptionId && !subscription.stripeSubscriptionId
      
      // Fim do período já pago: nextDueDate Asaas se houver; senão aniversário local.
      // Concessão do gestor (sem recorrência): desativa na hora.
      let accessUntil: Date
      let cancelMessage: string

      if (isManagerGrant) {
        accessUntil = now
        cancelMessage = 'Plano desativado imediatamente.'
      } else if (subscription.asaasSubscriptionId) {
        try {
          const asaasSub = await getAsaasSubscription(subscription.asaasSubscriptionId)
          if (asaasSub.nextDueDate) {
            const next = new Date(`${asaasSub.nextDueDate}T23:59:59.999-03:00`)
            accessUntil = new Date(next)
            accessUntil.setDate(accessUntil.getDate() - 1)
          } else {
            accessUntil = computeAccessUntilFromStartDate(subscription.startDate, now)
          }
        } catch (asaasError: any) {
          logger.error('Erro ao ler assinatura Asaas (seguindo com cálculo local):', asaasError.message)
          accessUntil = computeAccessUntilFromStartDate(subscription.startDate, now)
        }
        const untilLabel = formatPlanDatePtBr(accessUntil)
        cancelMessage = `Não se preocupe, você tem até o dia ${untilLabel} para aproveitar seu plano.`
      } else {
        accessUntil = computeAccessUntilFromStartDate(subscription.startDate, now)
        const untilLabel = formatPlanDatePtBr(accessUntil)
        cancelMessage = `Não se preocupe, você tem até o dia ${untilLabel} para aproveitar seu plano.`
      }

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

      if (subscription.asaasSubscriptionId) {
        try {
          await updateAsaasSubscription(subscription.asaasSubscriptionId, {
            status: 'INACTIVE',
            updatePendingPayments: false,
          })
          await cancelPendingSubscriptionPayments(subscription.asaasSubscriptionId)
          logger.info(`Asaas: recorrência suspensa; acesso até ${accessUntil.toISOString()}`)
        } catch (asaasError: any) {
          logger.warning(`Não foi possível pausar no Asaas, tentando inativar: ${asaasError.message}`)
          try {
            await cancelAsaasSubscription(subscription.asaasSubscriptionId)
            await cancelPendingSubscriptionPayments(subscription.asaasSubscriptionId)
          } catch (deleteError: any) {
            logger.error('Erro ao cancelar no Asaas (seguindo com cancelamento local):', deleteError.message)
          }
        }
      }

      try {
        const { notifySubscriptionCanceled } = await import('../utils/notifications')
        await notifySubscriptionCanceled(userId, {
          planName: updatedSubscription.plan.name,
          endDate: accessUntil,
        })
      } catch (notifyError: any) {
        logger.warning(`Não foi possível notificar cancelamento: ${notifyError.message}`)
      }
      
      logger.success(`Cancelamento registrado: ${userId} (acesso até ${accessUntil.toISOString()})`)
      return reply.status(200).send({
        success: true,
        data: {
          ...updatedSubscription,
          cancelInProgress: isCancelInProgress({
            status: 'CANCELED',
            endDate: accessUntil,
          }),
        },
        accessUntil: accessUntil,
        message: cancelMessage,
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
        where: { userId },
        include: {
          plan: true,
          user: { select: { id: true, asaasCustomerId: true } },
        },
      })
      
      if (!subscription) {
        return reply.status(404).send({
          success: false,
          error: 'Assinatura não encontrada'
        })
      }

      if (subscription.status === 'PAUSED') {
        const updatedSubscription = await prisma.subscription.update({
          where: { userId },
          data: { status: 'ACTIVE' },
          include: { user: true, plan: true },
        })
        logger.success(`Assinatura reativada: ${userId}`)
        return reply.status(200).send({
          success: true,
          data: updatedSubscription,
          message: 'Assinatura reativada com sucesso',
        })
      }

      if (!isCancelInProgress(subscription) || !subscription.endDate) {
        return reply.status(400).send({
          success: false,
          error: 'Só é possível desfazer o cancelamento enquanto o período já pago ainda está valendo.',
        })
      }

      const nextDueIso = nextDueIsoAfterAccessUntil(subscription.endDate)
      if (subscription.asaasSubscriptionId) {
        try {
          await updateAsaasSubscription(subscription.asaasSubscriptionId, {
            status: 'ACTIVE',
            nextDueDate: nextDueIso,
            updatePendingPayments: false,
          })
        } catch (asaasError: any) {
          logger.warning(`Não foi possível reativar a recorrência Asaas: ${asaasError.message}`)
          const savedCard = await prisma.savedCard.findFirst({
            where: { userId, kind: 'credit' },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          })
          if (!subscription.user.asaasCustomerId || !savedCard) {
            return reply.status(502).send({
              success: false,
              error:
                'Não foi possível retomar a recorrência automaticamente. Fale com a clínica — você não precisa pagar de novo agora.',
            })
          }
          const recreated = await createAsaasSubscription({
            customer: subscription.user.asaasCustomerId,
            value: subscription.plan.price,
            description: `Charme & Bela Club - ${subscription.plan.name}`,
            externalReference: clubSubscriptionReference(userId, subscription.planId),
            creditCardToken: savedCard.asaasToken,
            remoteIp: '127.0.0.1',
            nextDueDate: nextDueIso,
          })
          await prisma.subscription.update({
            where: { userId },
            data: { asaasSubscriptionId: recreated.id },
          })
        }
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'ACTIVE',
          canceledAt: null,
          cancelReason: null,
          endDate: null,
        },
        include: {
          user: true,
          plan: true,
        },
      })

      logger.success(`Cancelamento desfeito: ${userId} (próxima cobrança ${nextDueIso})`)
      return reply.status(200).send({
        success: true,
        data: {
          ...updatedSubscription,
          cancelInProgress: false,
          nextDueDate: new Date(`${nextDueIso}T12:00:00.000-03:00`).toISOString(),
          message: `Cancelamento desfeito. Você continua no ${updatedSubscription.plan.name} e a próxima cobrança será em ${formatPlanDatePtBr(new Date(`${nextDueIso}T12:00:00.000-03:00`))}.`,
        },
        message: `Cancelamento desfeito. Você continua no ${updatedSubscription.plan.name} e a próxima cobrança será em ${formatPlanDatePtBr(new Date(`${nextDueIso}T12:00:00.000-03:00`))}.`,
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

      if (isCancelInProgress(subscription)) {
        return reply.status(400).send({
          success: false,
          error: 'Desfaça o cancelamento em Meu plano para trocar de plano. Você não precisa pagar de novo.',
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

