import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function notificationRoutes(app: FastifyInstance) {
  // ============================================
  // GET - Buscar todas as notificações
  // ============================================
  app.get('/notifications', async (request, reply) => {
    logger.route('GET', '/notifications')
    
    try {
      const { userId, unreadOnly, limit } = request.query as {
        userId?: string
        unreadOnly?: string
        limit?: string
      }
      
      const where: any = {}
      
      // Filtro por usuário (ou notificações do admin se userId for 'admin')
      if (userId) {
        if (userId === 'admin') {
          where.userId = null // Notificações do admin tem userId = null
        } else {
          where.userId = userId
        }
      }
      
      // Filtro por não lidas
      if (unreadOnly === 'true') {
        where.read = false
      }
      
      const notifications = await prisma.notification.findMany({
        where,
        orderBy: [
          { read: 'asc' },      // Não lidas primeiro
          { createdAt: 'desc' } // Mais recentes primeiro
        ],
        take: limit ? parseInt(limit) : undefined,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })
      
      return reply.status(200).send({
        success: true,
        data: notifications
      })
    } catch (error: any) {
      logger.error('Erro ao buscar notificações:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar notificações',
        details: error.message
      })
    }
  })
  
  // ============================================
  // GET - Contar notificações não lidas
  // ============================================
  app.get('/notifications/unread-count', async (request, reply) => {
    logger.route('GET', '/notifications/unread-count')
    
    try {
      const { userId } = request.query as { userId?: string }
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'userId é obrigatório'
        })
      }
      
      const where: any = {
        read: false
      }
      
      if (userId === 'admin') {
        where.userId = null
      } else {
        where.userId = userId
      }
      
      const count = await prisma.notification.count({ where })
      
      return reply.status(200).send({
        success: true,
        data: { count }
      })
    } catch (error: any) {
      logger.error('Erro ao contar notificações:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao contar notificações',
        details: error.message
      })
    }
  })
  
  // ============================================
  // GET - Buscar notificação específica
  // ============================================
  app.get('/notifications/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/notifications/${id}`)
    
    try {
      const notification = await prisma.notification.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })
      
      if (!notification) {
        return reply.status(404).send({
          success: false,
          error: 'Notificação não encontrada'
        })
      }
      
      return reply.status(200).send({
        success: true,
        data: notification
      })
    } catch (error: any) {
      logger.error('Erro ao buscar notificação:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar notificação',
        details: error.message
      })
    }
  })
  
  // ============================================
  // POST - Criar notificação
  // ============================================
  app.post('/notifications', async (request, reply) => {
    logger.route('POST', '/notifications')
    
    try {
      const {
        userId,
        type,
        title,
        message,
        icon,
        priority,
        metadata,
        actionUrl,
        actionLabel,
        expiresAt
      } = request.body as {
        userId?: string | null
        type: string
        title: string
        message: string
        icon?: string
        priority?: string
        metadata?: any
        actionUrl?: string
        actionLabel?: string
        expiresAt?: string
      }
      
      // Validações
      if (!type || !title || !message) {
        return reply.status(400).send({
          success: false,
          error: 'type, title e message são obrigatórios'
        })
      }
      
      const notification = await prisma.notification.create({
        data: {
          userId: userId === 'admin' ? null : (userId || null),
          type: type as any,
          title,
          message,
          icon: icon as any || 'BELL',
          priority: priority as any || 'NORMAL',
          metadata: metadata || undefined,
          actionUrl,
          actionLabel,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })
      
      logger.success(`✅ Notificação criada: ${notification.id}`)
      
      return reply.status(201).send({
        success: true,
        data: notification
      })
    } catch (error: any) {
      logger.error('Erro ao criar notificação:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar notificação',
        details: error.message
      })
    }
  })
  
  // ============================================
  // PUT - Marcar notificação como lida
  // ============================================
  app.put('/notifications/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/notifications/${id}/read`)
    
    try {
      const notification = await prisma.notification.update({
        where: { id },
        data: {
          read: true,
          readAt: new Date()
        }
      })
      
      return reply.status(200).send({
        success: true,
        data: notification
      })
    } catch (error: any) {
      logger.error('Erro ao marcar notificação como lida:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao marcar notificação como lida',
        details: error.message
      })
    }
  })
  
  // ============================================
  // PUT - Marcar todas como lidas
  // ============================================
  app.put('/notifications/mark-all-read', async (request, reply) => {
    logger.route('PUT', '/notifications/mark-all-read')
    
    try {
      const { userId } = request.body as { userId?: string }
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'userId é obrigatório'
        })
      }
      
      const where: any = {}
      
      if (userId === 'admin') {
        where.userId = null
      } else {
        where.userId = userId
      }
      
      const result = await prisma.notification.updateMany({
        where: {
          ...where,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })
      
      return reply.status(200).send({
        success: true,
        data: {
          count: result.count,
          message: `${result.count} notificações marcadas como lidas`
        }
      })
    } catch (error: any) {
      logger.error('Erro ao marcar todas como lidas:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao marcar todas como lidas',
        details: error.message
      })
    }
  })
  
  // ============================================
  // DELETE - Deletar notificação
  // ============================================
  app.delete('/notifications/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/notifications/${id}`)
    
    try {
      await prisma.notification.delete({
        where: { id }
      })
      
      return reply.status(200).send({
        success: true,
        message: 'Notificação deletada com sucesso'
      })
    } catch (error: any) {
      logger.error('Erro ao deletar notificação:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao deletar notificação',
        details: error.message
      })
    }
  })
  
  // ============================================
  // DELETE - Limpar todas as notificações
  // ============================================
  app.delete('/notifications/clear-all', async (request, reply) => {
    logger.route('DELETE', '/notifications/clear-all')
    
    try {
      const { userId } = request.query as { userId?: string }
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'userId é obrigatório'
        })
      }
      
      const where: any = {}
      
      if (userId === 'admin') {
        where.userId = null
      } else {
        where.userId = userId
      }
      
      const result = await prisma.notification.deleteMany({
        where
      })
      
      return reply.status(200).send({
        success: true,
        data: {
          count: result.count,
          message: `${result.count} notificações deletadas`
        }
      })
    } catch (error: any) {
      logger.error('Erro ao limpar notificações:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao limpar notificações',
        details: error.message
      })
    }
  })
  
  // ============================================
  // DELETE - Limpar notificações expiradas
  // ============================================
  app.delete('/notifications/clear-expired', async (request, reply) => {
    logger.route('DELETE', '/notifications/clear-expired')
    
    try {
      const now = new Date()
      
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      })
      
      return reply.status(200).send({
        success: true,
        data: {
          count: result.count,
          message: `${result.count} notificações expiradas deletadas`
        }
      })
    } catch (error: any) {
      logger.error('Erro ao limpar notificações expiradas:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao limpar notificações expiradas',
        details: error.message
      })
    }
  })
}



