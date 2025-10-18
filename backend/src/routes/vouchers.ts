import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function vouchersRoutes(app: FastifyInstance) {
  // GET - Listar vouchers (com filtros)
  app.get('/vouchers', async (request, reply) => {
    logger.route('GET', '/vouchers')
    
    try {
      const { userId, isUsed } = request.query as { 
        userId?: string
        isUsed?: string 
      }
      
      const vouchers = await prisma.voucher.findMany({
        where: {
          ...(userId && { userId }),
          ...(isUsed !== undefined && { isUsed: isUsed === 'true' })
        },
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
      
      logger.success(`Retornando ${vouchers.length} vouchers`)
      return reply.status(200).send({
        success: true,
        data: vouchers
      })
    } catch (error) {
      logger.error('Erro ao buscar vouchers:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar vouchers'
      })
    }
  })

  // GET - Buscar vouchers de um usuário específico (só os não usados)
  app.get('/vouchers/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('GET', `/vouchers/user/${userId}`)
    
    try {
      const vouchers = await prisma.voucher.findMany({
        where: {
          userId,
          isUsed: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })
      
      logger.success(`Retornando ${vouchers.length} vouchers disponíveis`)
      return reply.status(200).send({
        success: true,
        data: vouchers
      })
    } catch (error) {
      logger.error('Erro ao buscar vouchers do usuário:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar vouchers'
      })
    }
  })

  // GET - Buscar voucher específico
  app.get('/vouchers/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/vouchers/${id}`)
    
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          appointments: {
            include: {
              service: true
            }
          }
        }
      })
      
      if (!voucher) {
        logger.warning(`Voucher não encontrado: ${id}`)
        return reply.status(404).send({
          success: false,
          error: 'Voucher não encontrado'
        })
      }
      
      logger.success(`Voucher encontrado: ${voucher.id}`)
      return reply.status(200).send({
        success: true,
        data: voucher
      })
    } catch (error) {
      logger.error('Erro ao buscar voucher:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar voucher'
      })
    }
  })

  // POST - Criar voucher (apenas admin)
  app.post('/vouchers', async (request, reply) => {
    logger.route('POST', '/vouchers')
    
    try {
      const {
        userId,
        type,
        description,
        serviceId,
        anyService,
        discountPercent,
        discountAmount,
        planId,
        expiresAt,
        grantedBy,
        grantedReason
      } = request.body as {
        userId: string
        type: string
        description: string
        serviceId?: string
        anyService?: boolean
        discountPercent?: number
        discountAmount?: number
        planId?: string
        expiresAt?: string
        grantedBy: string
        grantedReason?: string
      }
      
      logger.debug('Criando novo voucher:', { userId, type, description })
      
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
      
      // Validações por tipo
      if (type === 'FREE_TREATMENT') {
        if (!serviceId && !anyService) {
          return reply.status(400).send({
            success: false,
            error: 'Para tratamento gratuito, informe o serviceId ou marque anyService como true'
          })
        }
      }
      
      if (type === 'DISCOUNT') {
        if (!discountPercent && !discountAmount) {
          return reply.status(400).send({
            success: false,
            error: 'Para desconto, informe discountPercent ou discountAmount'
          })
        }
      }
      
      if (type === 'FREE_MONTH') {
        if (!planId) {
          return reply.status(400).send({
            success: false,
            error: 'Para mês grátis, informe o planId'
          })
        }
      }
      
      const voucher = await prisma.voucher.create({
        data: {
          userId,
          type: type.toUpperCase() as any,
          description,
          serviceId,
          anyService: anyService || false,
          discountPercent,
          discountAmount,
          planId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          grantedBy,
          grantedReason
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
      
      logger.success(`Voucher criado: ${voucher.id} para ${user.name}`)
      return reply.status(201).send({
        success: true,
        data: voucher,
        message: `Voucher criado com sucesso! ${user.name} foi presenteado(a) 🎁`
      })
    } catch (error) {
      logger.error('Erro ao criar voucher:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar voucher'
      })
    }
  })

  // PUT - Usar voucher (marcar como usado)
  app.put('/vouchers/:id/use', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/vouchers/${id}/use`)
    
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id }
      })
      
      if (!voucher) {
        return reply.status(404).send({
          success: false,
          error: 'Voucher não encontrado'
        })
      }
      
      if (voucher.isUsed) {
        return reply.status(400).send({
          success: false,
          error: 'Voucher já foi utilizado'
        })
      }
      
      // Verifica se expirou
      if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        return reply.status(400).send({
          success: false,
          error: 'Voucher expirado'
        })
      }
      
      const updatedVoucher = await prisma.voucher.update({
        where: { id },
        data: {
          isUsed: true,
          usedAt: new Date()
        },
        include: {
          user: true
        }
      })
      
      logger.success(`Voucher usado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: updatedVoucher,
        message: 'Voucher utilizado com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao usar voucher:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao usar voucher'
      })
    }
  })

  // DELETE - Cancelar/remover voucher (apenas admin)
  app.delete('/vouchers/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/vouchers/${id}`)
    
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id }
      })
      
      if (!voucher) {
        return reply.status(404).send({
          success: false,
          error: 'Voucher não encontrado'
        })
      }
      
      if (voucher.isUsed) {
        return reply.status(400).send({
          success: false,
          error: 'Não é possível remover voucher já utilizado'
        })
      }
      
      await prisma.voucher.delete({
        where: { id }
      })
      
      logger.success(`Voucher removido: ${id}`)
      return reply.status(200).send({
        success: true,
        message: 'Voucher removido com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao remover voucher:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover voucher'
      })
    }
  })
}

