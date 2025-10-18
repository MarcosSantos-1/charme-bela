import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function servicesRoutes(app: FastifyInstance) {
  // GET - Listar serviços (por padrão só ativos, mas admin pode ver todos)
  app.get('/services', async (request, reply) => {
    logger.route('GET', '/services')
    
    try {
      const { showAll } = request.query as { showAll?: string }
      
      const services = await prisma.service.findMany({
        where: showAll === 'true' ? {} : { isActive: true },
        orderBy: { name: 'asc' }
      })
      
      logger.success(`Retornando ${services.length} serviços${showAll === 'true' ? ' (incluindo inativos)' : ''}`)
      return reply.status(200).send({
        success: true,
        data: services
      })
    } catch (error) {
      logger.error('Erro ao buscar serviços:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar serviços'
      })
    }
  })

  // GET - Buscar um serviço específico
  app.get('/services/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/services/${id}`)
    
    try {
      const service = await prisma.service.findUnique({
        where: { id }
      })
      
      if (!service) {
        logger.warning(`Serviço não encontrado: ${id}`)
        return reply.status(404).send({
          success: false,
          error: 'Serviço não encontrado'
        })
      }
      
      logger.success(`Serviço encontrado: ${service.name}`)
      return reply.status(200).send({
        success: true,
        data: service
      })
    } catch (error) {
      logger.error('Erro ao buscar serviço:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar serviço'
      })
    }
  })

  // POST - Criar novo serviço (apenas para gestores)
  app.post('/services', async (request, reply) => {
    logger.route('POST', '/services')
    
    try {
      const { name, description, category, duration, price } = request.body as {
        name: string
        description: string
        category: 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO'
        duration: number
        price: number
      }
      
      if (!category) {
        return reply.status(400).send({
          success: false,
          error: 'Categoria é obrigatória'
        })
      }
      
      logger.debug('Criando novo serviço:', { name, category, duration, price })
      
      const service = await prisma.service.create({
        data: {
          name,
          description,
          category,
          duration,
          price,
          isActive: true
        }
      })
      
      logger.success(`Serviço criado com sucesso: ${service.name} (ID: ${service.id})`)
      return reply.status(201).send({
        success: true,
        data: service
      })
    } catch (error) {
      logger.error('Erro ao criar serviço:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar serviço'
      })
    }
  })

  // PUT - Atualizar serviço
  app.put('/services/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/services/${id}`)
    
    try {
      const { name, description, category, duration, price, isActive } = request.body as {
        name?: string
        description?: string
        category?: 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO'
        duration?: number
        price?: number
        isActive?: boolean
      }
      
      const service = await prisma.service.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(category && { category }),
          ...(duration && { duration }),
          ...(price && { price }),
          ...(isActive !== undefined && { isActive })
        }
      })
      
      logger.success(`Serviço atualizado: ${service.name}`)
      return reply.status(200).send({
        success: true,
        data: service
      })
    } catch (error) {
      logger.error('Erro ao atualizar serviço:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar serviço'
      })
    }
  })

  // DELETE - Desativar serviço (soft delete)
  app.delete('/services/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/services/${id}`)
    
    try {
      const service = await prisma.service.update({
        where: { id },
        data: { isActive: false }
      })
      
      logger.success(`Serviço desativado: ${service.name}`)
      return reply.status(200).send({
        success: true,
        data: service,
        message: 'Serviço desativado com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao desativar serviço:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao desativar serviço'
      })
    }
  })
}

