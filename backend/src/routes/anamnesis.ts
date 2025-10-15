import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function anamnesisRoutes(app: FastifyInstance) {
  // GET - Listar todas as anamneses (apenas para gestores)
  app.get('/anamnesis', async (request, reply) => {
    logger.route('GET', '/anamnesis')
    
    try {
      const anamneses = await prisma.anamnesisForm.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      logger.success(`Retornando ${anamneses.length} anamneses`)
      return reply.status(200).send({
        success: true,
        data: anamneses
      })
    } catch (error) {
      logger.error('Erro ao buscar anamneses:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar anamneses'
      })
    }
  })

  // GET - Buscar anamnese de um usuário específico
  app.get('/anamnesis/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('GET', `/anamnesis/user/${userId}`)
    
    try {
      const anamnesis = await prisma.anamnesisForm.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
      
      if (!anamnesis) {
        logger.warning(`Anamnese não encontrada para usuário: ${userId}`)
        return reply.status(404).send({
          success: false,
          error: 'Anamnese não encontrada'
        })
      }
      
      logger.success(`Anamnese encontrada para usuário: ${userId}`)
      return reply.status(200).send({
        success: true,
        data: anamnesis
      })
    } catch (error) {
      logger.error('Erro ao buscar anamnese:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar anamnese'
      })
    }
  })

  // POST - Criar nova anamnese
  app.post('/anamnesis', async (request, reply) => {
    logger.route('POST', '/anamnesis')
    
    try {
      const { userId, facialData, corporalData } = request.body as {
        userId: string
        facialData: any
        corporalData: any
      }
      
      logger.debug('Criando nova anamnese para usuário:', userId)
      
      // Verifica se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user) {
        logger.warning(`Usuário não encontrado: ${userId}`)
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      // Verifica se já existe uma anamnese para este usuário
      const existingAnamnesis = await prisma.anamnesisForm.findUnique({
        where: { userId }
      })
      
      if (existingAnamnesis) {
        logger.warning(`Anamnese já existe para usuário: ${userId}`)
        return reply.status(400).send({
          success: false,
          error: 'Anamnese já existe para este usuário. Use PUT para atualizar.'
        })
      }
      
      const anamnesis = await prisma.anamnesisForm.create({
        data: {
          userId,
          facialData,
          corporalData
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
      
      logger.success(`Anamnese criada com sucesso para usuário: ${userId}`)
      return reply.status(201).send({
        success: true,
        data: anamnesis
      })
    } catch (error) {
      logger.error('Erro ao criar anamnese:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar anamnese'
      })
    }
  })

  // PUT - Atualizar anamnese existente
  app.put('/anamnesis/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('PUT', `/anamnesis/${userId}`)
    
    try {
      const { facialData, corporalData } = request.body as {
        facialData?: any
        corporalData?: any
      }
      
      logger.debug('Atualizando anamnese para usuário:', userId)
      
      // Verifica se a anamnese existe
      const existingAnamnesis = await prisma.anamnesisForm.findUnique({
        where: { userId }
      })
      
      if (!existingAnamnesis) {
        logger.warning(`Anamnese não encontrada para usuário: ${userId}`)
        return reply.status(404).send({
          success: false,
          error: 'Anamnese não encontrada'
        })
      }
      
      const anamnesis = await prisma.anamnesisForm.update({
        where: { userId },
        data: {
          ...(facialData && { facialData }),
          ...(corporalData && { corporalData })
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
      
      logger.success(`Anamnese atualizada para usuário: ${userId}`)
      return reply.status(200).send({
        success: true,
        data: anamnesis
      })
    } catch (error) {
      logger.error('Erro ao atualizar anamnese:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar anamnese'
      })
    }
  })

  // DELETE - Deletar anamnese
  app.delete('/anamnesis/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('DELETE', `/anamnesis/${userId}`)
    
    try {
      // Verifica se a anamnese existe
      const existingAnamnesis = await prisma.anamnesisForm.findUnique({
        where: { userId }
      })
      
      if (!existingAnamnesis) {
        logger.warning(`Anamnese não encontrada para usuário: ${userId}`)
        return reply.status(404).send({
          success: false,
          error: 'Anamnese não encontrada'
        })
      }
      
      await prisma.anamnesisForm.delete({
        where: { userId }
      })
      
      logger.success(`Anamnese deletada para usuário: ${userId}`)
      return reply.status(200).send({
        success: true,
        message: 'Anamnese deletada com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao deletar anamnese:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao deletar anamnese'
      })
    }
  })
}

