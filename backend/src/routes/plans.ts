import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function plansRoutes(app: FastifyInstance) {
  // GET - Listar todos os planos de assinatura
  app.get('/plans', async (request, reply) => {
    logger.route('GET', '/plans')
    
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        include: {
          services: {
            select: {
              id: true,
              name: true,
              category: true,
              duration: true,
              price: true
            }
          },
          _count: {
            select: {
              services: true,
              subscriptions: true
            }
          }
        },
        orderBy: { price: 'asc' }
      })
      
      logger.success(`Retornando ${plans.length} planos`)
      return reply.status(200).send({
        success: true,
        data: plans
      })
    } catch (error) {
      logger.error('Erro ao buscar planos:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar planos'
      })
    }
  })

  // GET - Buscar um plano específico por ID
  app.get('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/plans/${id}`)
    
    try {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id },
        include: {
          services: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              duration: true,
              price: true
            },
            orderBy: { category: 'asc' }
          },
          _count: {
            select: {
              services: true,
              subscriptions: true
            }
          }
        }
      })
      
      if (!plan) {
        logger.warning(`Plano não encontrado: ${id}`)
        return reply.status(404).send({
          success: false,
          error: 'Plano não encontrado'
        })
      }
      
      logger.success(`Plano encontrado: ${plan.name}`)
      return reply.status(200).send({
        success: true,
        data: plan
      })
    } catch (error) {
      logger.error('Erro ao buscar plano:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar plano'
      })
    }
  })

  // GET - Buscar plano por tier (BRONZE, SILVER, GOLD)
  app.get('/plans/tier/:tier', async (request, reply) => {
    const { tier } = request.params as { tier: string }
    logger.route('GET', `/plans/tier/${tier}`)
    
    try {
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { 
          tier: tier.toUpperCase() as any,
          isActive: true 
        },
        include: {
          services: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              duration: true,
              price: true
            },
            orderBy: { category: 'asc' }
          }
        }
      })
      
      if (!plan) {
        logger.warning(`Plano não encontrado para tier: ${tier}`)
        return reply.status(404).send({
          success: false,
          error: 'Plano não encontrado'
        })
      }
      
      logger.success(`Plano encontrado: ${plan.name}`)
      return reply.status(200).send({
        success: true,
        data: plan
      })
    } catch (error) {
      logger.error('Erro ao buscar plano por tier:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar plano'
      })
    }
  })

  // POST - Criar novo plano (apenas para gestores)
  app.post('/plans', async (request, reply) => {
    logger.route('POST', '/plans')
    
    try {
      const { 
        name, 
        tier, 
        description, 
        price, 
        maxTreatmentsPerMonth, 
        maxTreatmentsPerWeek,
        maxFacialPerMonth,
        serviceIds 
      } = request.body as {
        name: string
        tier: string
        description: string
        price: number
        maxTreatmentsPerMonth: number
        maxTreatmentsPerWeek: number
        maxFacialPerMonth?: number
        serviceIds: string[]
      }
      
      logger.debug('Criando novo plano:', { name, tier, price })
      
      const plan = await prisma.subscriptionPlan.create({
        data: {
          name,
          tier: tier.toUpperCase() as any,
          description,
          price,
          maxTreatmentsPerMonth,
          maxTreatmentsPerWeek,
          maxFacialPerMonth,
          services: serviceIds ? {
            connect: serviceIds.map(id => ({ id }))
          } : undefined
        },
        include: {
          services: true
        }
      })
      
      logger.success(`Plano criado com sucesso: ${plan.name} (ID: ${plan.id})`)
      return reply.status(201).send({
        success: true,
        data: plan
      })
    } catch (error) {
      logger.error('Erro ao criar plano:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar plano'
      })
    }
  })

  // PUT - Atualizar plano
  app.put('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/plans/${id}`)
    
    try {
      const { 
        name, 
        description, 
        price, 
        maxTreatmentsPerMonth, 
        maxTreatmentsPerWeek,
        maxFacialPerMonth,
        isActive 
      } = request.body as {
        name?: string
        description?: string
        price?: number
        maxTreatmentsPerMonth?: number
        maxTreatmentsPerWeek?: number
        maxFacialPerMonth?: number
        isActive?: boolean
      }
      
      const plan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(price && { price }),
          ...(maxTreatmentsPerMonth && { maxTreatmentsPerMonth }),
          ...(maxTreatmentsPerWeek && { maxTreatmentsPerWeek }),
          ...(maxFacialPerMonth !== undefined && { maxFacialPerMonth }),
          ...(isActive !== undefined && { isActive })
        },
        include: {
          services: true
        }
      })
      
      logger.success(`Plano atualizado: ${plan.name}`)
      return reply.status(200).send({
        success: true,
        data: plan
      })
    } catch (error) {
      logger.error('Erro ao atualizar plano:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar plano'
      })
    }
  })

  // PUT - Adicionar serviços ao plano
  app.put('/plans/:id/services/add', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/plans/${id}/services/add`)
    
    try {
      const { serviceIds } = request.body as { serviceIds: string[] }
      
      if (!serviceIds || serviceIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'serviceIds é obrigatório'
        })
      }
      
      const plan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          services: {
            connect: serviceIds.map(serviceId => ({ id: serviceId }))
          }
        },
        include: {
          services: true
        }
      })
      
      logger.success(`${serviceIds.length} serviço(s) adicionado(s) ao plano ${plan.name}`)
      return reply.status(200).send({
        success: true,
        data: plan,
        message: `${serviceIds.length} serviço(s) adicionado(s) com sucesso`
      })
    } catch (error) {
      logger.error('Erro ao adicionar serviços ao plano:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao adicionar serviços ao plano'
      })
    }
  })

  // PUT - Remover serviços do plano
  app.put('/plans/:id/services/remove', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/plans/${id}/services/remove`)
    
    try {
      const { serviceIds } = request.body as { serviceIds: string[] }
      
      if (!serviceIds || serviceIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'serviceIds é obrigatório'
        })
      }
      
      const plan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          services: {
            disconnect: serviceIds.map(serviceId => ({ id: serviceId }))
          }
        },
        include: {
          services: true
        }
      })
      
      logger.success(`${serviceIds.length} serviço(s) removido(s) do plano ${plan.name}`)
      return reply.status(200).send({
        success: true,
        data: plan,
        message: `${serviceIds.length} serviço(s) removido(s) com sucesso`
      })
    } catch (error) {
      logger.error('Erro ao remover serviços do plano:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover serviços do plano'
      })
    }
  })

  // PUT - Substituir todos os serviços do plano
  app.put('/plans/:id/services/set', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/plans/${id}/services/set`)
    
    try {
      const { serviceIds } = request.body as { serviceIds: string[] }
      
      if (!serviceIds) {
        return reply.status(400).send({
          success: false,
          error: 'serviceIds é obrigatório'
        })
      }
      
      const plan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          services: {
            set: serviceIds.map(serviceId => ({ id: serviceId }))
          }
        },
        include: {
          services: true
        }
      })
      
      logger.success(`Serviços do plano ${plan.name} substituídos (${serviceIds.length} serviços)`)
      return reply.status(200).send({
        success: true,
        data: plan,
        message: `Serviços substituídos com sucesso`
      })
    } catch (error) {
      logger.error('Erro ao substituir serviços do plano:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao substituir serviços do plano'
      })
    }
  })
}

