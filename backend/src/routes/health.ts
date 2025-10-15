import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function healthRoutes(app: FastifyInstance) {
  // Rota de health check - verifica se o servidor e o banco estão funcionando
  app.get('/health', async (request, reply) => {
    logger.route('GET', '/health')
    
    try {
      // Testa a conexão com o banco de dados
      await prisma.$queryRaw`SELECT 1`
      
      logger.success('Health check passou - sistema operacional')
      return reply.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        service: 'Charme & Bela API'
      })
    } catch (error) {
      logger.error('Health check falhou:', error)
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        service: 'Charme & Bela API'
      })
    }
  })
}

