import { FastifyInstance } from 'fastify'
import { MachineKind } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { createNotification } from '../utils/notifications'
import {
  ensureCurrentAndNextOccurrences,
  finalizePastReleasedOccurrences,
  getReleasedMachineKinds,
} from '../utils/machineRental'

export async function servicesRoutes(app: FastifyInstance) {
  // GET - Listar serviços (por padrão só ativos, mas admin pode ver todos)
  // Cliente: serviços de máquina só aparecem se houver ocorrência RELEASED
  app.get('/services', async (request, reply) => {
    logger.route('GET', '/services')
    
    try {
      const { showAll, machine } = request.query as {
        showAll?: string
        machine?: string
      }

      await finalizePastReleasedOccurrences()
      await ensureCurrentAndNextOccurrences()

      const services = await prisma.service.findMany({
        where: showAll === 'true' ? {} : { isActive: true },
        orderBy: { name: 'asc' }
      })

      let filtered = services

      if (showAll !== 'true') {
        const released = await getReleasedMachineKinds()
        filtered = services.filter((s) => {
          if (!s.machineKind) return true
          return released.has(s.machineKind)
        })
      }

      if (machine === 'LASER' || machine === 'CRYO') {
        filtered = filtered.filter((s) => s.machineKind === machine)
      }
      
      logger.success(`Retornando ${filtered.length} serviços${showAll === 'true' ? ' (incluindo inativos)' : ''}`)
      return reply.status(200).send({
        success: true,
        data: filtered
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
      const {
        name,
        description,
        category,
        duration,
        price,
        machineKind,
        allowOnSubscription,
      } = request.body as {
        name: string
        description: string
        category: 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO'
        duration: number
        price: number
        machineKind?: MachineKind | null
        allowOnSubscription?: boolean
      }
      
      if (!category) {
        return reply.status(400).send({
          success: false,
          error: 'Categoria é obrigatória'
        })
      }

      const kind =
        machineKind === 'LASER' || machineKind === 'CRYO' ? machineKind : null
      
      logger.debug('Criando novo serviço:', { name, category, duration, price, machineKind: kind })
      
      const service = await prisma.service.create({
        data: {
          name,
          description,
          category,
          duration,
          price,
          isActive: true,
          machineKind: kind,
          allowOnSubscription:
            allowOnSubscription != null ? allowOnSubscription : kind == null,
        }
      })
      
      // Notificar todos os clientes sobre o novo serviço (não notifica especiais sem release)
      if (!kind) {
        try {
          const clients = await prisma.user.findMany({
            where: { 
              role: 'CLIENT',
              isActive: true 
            },
            select: { id: true }
          })
          
          const notificationPromises = clients.map(client =>
            createNotification({
              userId: client.id,
              type: 'PROMOTION',
              title: 'Novo Tratamento Disponível! ✨',
              message: `Agora oferecemos ${service.name}! ${service.description}`,
              icon: 'SPARKLES',
              priority: 'NORMAL',
              actionUrl: '/servicos',
              actionLabel: 'Ver Tratamentos',
              metadata: { serviceId: service.id, serviceName: service.name }
            })
          )
          
          await Promise.all(notificationPromises)
          logger.info(`📢 ${clients.length} clientes notificados sobre novo serviço`)
        } catch (error) {
          logger.error('Erro ao notificar clientes sobre novo serviço:', error)
        }
      }
      
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
      const {
        name,
        description,
        category,
        duration,
        price,
        isActive,
        machineKind,
        allowOnSubscription,
      } = request.body as {
        name?: string
        description?: string
        category?: 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO'
        duration?: number
        price?: number
        isActive?: boolean
        machineKind?: MachineKind | null
        allowOnSubscription?: boolean
      }

      const kindUpdate =
        machineKind === undefined
          ? {}
          : {
              machineKind:
                machineKind === 'LASER' || machineKind === 'CRYO' ? machineKind : null,
            }
      
      const service = await prisma.service.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(category && { category }),
          ...(duration && { duration }),
          ...(price && { price }),
          ...(isActive !== undefined && { isActive }),
          ...kindUpdate,
          ...(allowOnSubscription !== undefined && { allowOnSubscription }),
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

  // DELETE - Soft delete (desativar)
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
