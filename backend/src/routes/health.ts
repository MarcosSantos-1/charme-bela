import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function healthRoutes(app: FastifyInstance) {
  // Liveness leve para o Fly (não toca o Neon — evita acordar o banco a cada check)
  app.get('/health', async (request, reply) => {
    const deep = (request.query as { deep?: string }).deep === '1'

    if (!deep) {
      return reply.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Charme & Bela API'
      })
    }

    logger.route('GET', '/health?deep=1')

    try {
      await prisma.$queryRaw`SELECT 1`

      return reply.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        service: 'Charme & Bela API'
      })
    } catch (error) {
      logger.error('Health check profundo falhou:', error)
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        service: 'Charme & Bela API'
      })
    }
  })
}
