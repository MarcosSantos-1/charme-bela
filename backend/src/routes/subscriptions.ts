import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

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
          }
        }
      })
      
      if (!subscription) {
        logger.warning(`Assinatura não encontrada para usuário: ${userId}`)
        return reply.status(404).send({
          success: false,
          error: 'Assinatura não encontrada'
        })
      }
      
      // Busca uso mensal atual
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      
      const monthlyUsage = await prisma.monthlyUsage.findUnique({
        where: {
          userId_month_year: { userId, month, year }
        }
      })
      
      logger.success(`Assinatura encontrada: ${subscription.id}`)
      return reply.status(200).send({
        success: true,
        data: {
          ...subscription,
          currentMonthUsage: {
            totalTreatments: monthlyUsage?.totalTreatments || 0
          },
          limits: {
            maxPerMonth: subscription.plan.maxTreatmentsPerMonth,
            maxPerDay: 3
          },
          remaining: {
            thisMonth: subscription.plan.maxTreatmentsPerMonth - (monthlyUsage?.totalTreatments || 0)
          }
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
        stripeSubscriptionId  // Null para mock
      } = request.body as {
        userId: string
        planId: string
        stripeSubscriptionId?: string
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
      
      // Busca configurações para pegar fidelidade mínima
      const config = await prisma.systemConfig.findFirst()
      const commitmentMonths = config?.minimumCommitmentMonths || 3
      
      // Calcula data de compromisso mínimo
      const minimumCommitmentEnd = new Date()
      minimumCommitmentEnd.setMonth(minimumCommitmentEnd.getMonth() + commitmentMonths)
      
      // Cria ou atualiza assinatura
      const subscription = await prisma.subscription.upsert({
        where: { userId },
        update: {
          planId,
          stripeSubscriptionId,
          status: 'ACTIVE',
          startDate: new Date(),
          minimumCommitmentEnd,
          endDate: null,
          canceledAt: null,
          cancelReason: null
        },
        create: {
          userId,
          planId,
          stripeSubscriptionId,
          status: 'ACTIVE',
          startDate: new Date(),
          minimumCommitmentEnd
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
        message: `Assinatura ${plan.name} ativada com sucesso! Compromisso mínimo de ${commitmentMonths} meses.`
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
      
      // Verifica se está dentro do período de fidelidade
      const now = new Date()
      if (subscription.minimumCommitmentEnd && now < subscription.minimumCommitmentEnd) {
        const monthsRemaining = Math.ceil(
          (subscription.minimumCommitmentEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
        
        return reply.status(400).send({
          success: false,
          error: `Ainda faltam ${monthsRemaining} mês(es) para completar o período mínimo de compromisso`,
          minimumCommitmentEnd: subscription.minimumCommitmentEnd,
          canCancelAfter: subscription.minimumCommitmentEnd
        })
      }
      
      // Calcula a data de término do período já pago (próximo ciclo)
      const startDate = subscription.startDate
      const dayOfMonth = startDate.getDate()
      
      // Próxima data de cobrança
      let nextBillingDate = new Date()
      nextBillingDate.setDate(dayOfMonth)
      
      // Se já passou o dia do mês atual, vai para o próximo mês
      if (now.getDate() >= dayOfMonth) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
      }
      
      // Define como fim do dia anterior à próxima cobrança
      const accessUntil = new Date(nextBillingDate)
      accessUntil.setDate(accessUntil.getDate() - 1)
      accessUntil.setHours(23, 59, 59, 999)
      
      // Cancela a assinatura mas mantém acesso até o fim do período pago
      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELED',
          canceledAt: now,
          cancelReason,
          endDate: accessUntil  // ← Fim do período já pago, não imediato!
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
        message: `Assinatura cancelada. Você ainda pode usar seus benefícios até ${accessUntil.toLocaleDateString('pt-BR')}`
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
}

