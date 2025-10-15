import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function servicesRoutes(app: FastifyInstance) {
  // GET - Listar todos os serviços ativos
  app.get('/services', async (request, reply) => {
    logger.route('GET', '/services')
    
    try {
      const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })
      
      logger.success(`Retornando ${services.length} serviços`)
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
      const { name, description, duration, price } = request.body as {
        name: string
        description: string
        duration: number
        price: number
      }
      
      logger.debug('Criando novo serviço:', { name, duration, price })
      
      const service = await prisma.service.create({
        data: {
          name,
          description,
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
}

