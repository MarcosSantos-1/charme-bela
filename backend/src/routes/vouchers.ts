import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { notifyVoucherReceived } from '../utils/notifications'

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
      
      // Notifica cliente sobre o voucher recebido
      await notifyVoucherReceived(userId, {
        description: voucher.description,
        type: voucher.type,
        expiresAt: voucher.expiresAt || undefined
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

  // POST - Ativar voucher de mês grátis
  app.post('/vouchers/:id/activate-free-month', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('POST', `/vouchers/${id}/activate-free-month`)
    
    try {
      const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: { user: true }
      })
      
      if (!voucher) {
        return reply.status(404).send({
          success: false,
          error: 'Voucher não encontrado'
        })
      }
      
      if (voucher.type !== 'FREE_MONTH') {
        return reply.status(400).send({
          success: false,
          error: 'Este voucher não é de mês grátis'
        })
      }
      
      if (voucher.isUsed) {
        return reply.status(400).send({
          success: false,
          error: 'Voucher já foi utilizado'
        })
      }
      
      if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        return reply.status(400).send({
          success: false,
          error: 'Voucher expirado'
        })
      }
      
      if (!voucher.planId) {
        return reply.status(400).send({
          success: false,
          error: 'Voucher sem plano associado'
        })
      }
      
      // Buscar plano
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: voucher.planId }
      })
      
      if (!plan) {
        return reply.status(404).send({
          success: false,
          error: 'Plano não encontrado'
        })
      }
      
      // Verificar se usuário já tem assinatura ativa
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId: voucher.userId }
      })
      
      if (existingSubscription && existingSubscription.status === 'ACTIVE') {
        return reply.status(400).send({
          success: false,
          error: 'Usuário já possui uma assinatura ativa. Não é possível ativar mês grátis.'
        })
      }
      
      // Calcular data de início e fim (1 mês grátis)
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)
      
      // Criar assinatura temporária (sem Stripe)
      const subscription = await prisma.subscription.upsert({
        where: { userId: voucher.userId },
        update: {
          planId: plan.id,
          status: 'ACTIVE',
          startDate,
          endDate, // Termina em 1 mês
          stripeSubscriptionId: null // Não tem no Stripe (é grátis)
        },
        create: {
          userId: voucher.userId,
          planId: plan.id,
          status: 'ACTIVE',
          startDate,
          endDate,
          stripeSubscriptionId: null
        }
      })
      
      // Marcar voucher como usado
      await prisma.voucher.update({
        where: { id },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      })
      
      // Notificar cliente
      const { notifySubscriptionActivated } = await import('../utils/notifications')
      await notifySubscriptionActivated(voucher.userId, {
        planName: `${plan.name} (Mês Grátis)`,
        maxTreatments: plan.maxTreatmentsPerMonth
      })
      
      logger.success(`✅ Mês grátis ativado para ${voucher.user.name} - Plano: ${plan.name}`)
      
      return reply.status(200).send({
        success: true,
        data: subscription,
        message: `Mês grátis ativado! Você tem ${plan.maxTreatmentsPerMonth} tratamentos até ${endDate.toLocaleDateString('pt-BR')}`
      })
    } catch (error: any) {
      logger.error('Erro ao ativar mês grátis:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao ativar mês grátis',
        details: error.message
      })
    }
  })
  
  // POST - Validar e calcular desconto de voucher
  app.post('/vouchers/validate', async (request, reply) => {
    logger.route('POST', '/vouchers/validate')
    
    try {
      const { voucherId, serviceId } = request.body as {
        voucherId: string
        serviceId: string
      }
      
      const voucher = await prisma.voucher.findUnique({
        where: { id: voucherId },
        include: { user: true }
      })
      
      if (!voucher) {
        return reply.status(404).send({
          success: false,
          error: 'Voucher não encontrado'
        })
      }
      
      // Validações
      if (voucher.isUsed) {
        return reply.status(400).send({
          success: false,
          error: 'Voucher já foi utilizado'
        })
      }
      
      if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        return reply.status(400).send({
          success: false,
          error: 'Voucher expirado'
        })
      }
      
      // Buscar serviço para calcular desconto
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      })
      
      if (!service) {
        return reply.status(404).send({
          success: false,
          error: 'Serviço não encontrado'
        })
      }
      
      let finalPrice = service.price
      let discount = 0
      let isFree = false
      
      switch (voucher.type) {
        case 'FREE_TREATMENT':
          // Verifica se o voucher é válido para este serviço
          if (voucher.anyService || voucher.serviceId === serviceId) {
            finalPrice = 0
            discount = service.price
            isFree = true
          } else {
            return reply.status(400).send({
              success: false,
              error: 'Voucher não é válido para este serviço'
            })
          }
          break
          
        case 'DISCOUNT':
          if (voucher.discountPercent) {
            discount = service.price * (voucher.discountPercent / 100)
          } else if (voucher.discountAmount) {
            discount = Math.min(voucher.discountAmount, service.price)
          }
          finalPrice = Math.max(0, service.price - discount)
          break
          
        case 'FREE_MONTH':
          return reply.status(400).send({
            success: false,
            error: 'Voucher de mês grátis não pode ser usado em agendamentos'
          })
      }
      
      return reply.status(200).send({
        success: true,
        data: {
          voucherId: voucher.id,
          voucherType: voucher.type,
          voucherDescription: voucher.description,
          originalPrice: service.price,
          discount,
          finalPrice,
          isFree,
          serviceName: service.name
        }
      })
    } catch (error: any) {
      logger.error('Erro ao validar voucher:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao validar voucher',
        details: error.message
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

