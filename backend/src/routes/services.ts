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
import { PACKAGE_SERVICE_INCLUDE, PackageError, syncPackageItems } from '../utils/packages'

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
        include: PACKAGE_SERVICE_INCLUDE,
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
        where: { id },
        include: PACKAGE_SERVICE_INCLUDE,
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
        packageSessionCount,
        installmentsAllowed,
        packageItems,
      } = request.body as {
        name: string
        description: string
        category: 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO'
        duration: number
        price: number
        machineKind?: MachineKind | null
        allowOnSubscription?: boolean
        packageSessionCount?: number
        installmentsAllowed?: boolean
        packageItems?: Array<{ includedServiceId: string; durationMinutes?: number; sortOrder?: number }>
      }
      
      if (!category) {
        return reply.status(400).send({
          success: false,
          error: 'Categoria é obrigatória'
        })
      }

      const kind =
        machineKind === 'LASER' || machineKind === 'CRYO' ? machineKind : null
      const isPackage = category === 'COMBO'

      if (isPackage && kind) {
        return reply.status(400).send({
          success: false,
          error: 'Pacotes não podem ser tratamentos de Laser ou Crio',
        })
      }

      if (isPackage && (!packageSessionCount || packageSessionCount < 1)) {
        return reply.status(400).send({
          success: false,
          error: 'Informe quantas sessões o pacote inclui',
        })
      }

      if (isPackage && (!packageItems || packageItems.length === 0)) {
        return reply.status(400).send({
          success: false,
          error: 'Inclua pelo menos um procedimento no pacote',
        })
      }
      
      logger.debug('Criando novo serviço:', { name, category, duration, price, machineKind: kind })
      
      const service = await prisma.service.create({
        data: {
          name,
          description,
          category,
          duration: isPackage ? 30 : duration,
          price,
          isActive: true,
          machineKind: isPackage ? null : kind,
          allowOnSubscription: isPackage
            ? false
            : allowOnSubscription != null ? allowOnSubscription : kind == null,
          packageSessionCount: isPackage ? packageSessionCount : null,
          installmentsAllowed: isPackage ? Boolean(installmentsAllowed) : false,
        },
        include: PACKAGE_SERVICE_INCLUDE,
      })

      let created = service
      if (isPackage && packageItems) {
        try {
          created = await syncPackageItems(service.id, packageItems)
        } catch (itemError) {
          await prisma.service.delete({ where: { id: service.id } }).catch(() => undefined)
          throw itemError
        }
      }
      
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
              title: isPackage ? 'Novo Pacote Disponível! ✨' : 'Novo Tratamento Disponível! ✨',
              message: `Agora oferecemos ${created.name}! ${created.description}`,
              icon: 'SPARKLES',
              priority: 'NORMAL',
              actionUrl: '/servicos',
              actionLabel: isPackage ? 'Ver Pacotes' : 'Ver Tratamentos',
              metadata: { serviceId: created.id, serviceName: created.name }
            })
          )
          
          await Promise.all(notificationPromises)
          logger.info(`📢 ${clients.length} clientes notificados sobre novo serviço`)
        } catch (error) {
          logger.error('Erro ao notificar clientes sobre novo serviço:', error)
        }
      }
      
      logger.success(`Serviço criado com sucesso: ${created.name} (ID: ${created.id})`)
      return reply.status(201).send({
        success: true,
        data: created
      })
    } catch (error) {
      if (error instanceof PackageError) {
        return reply.status(error.statusCode).send({ success: false, error: error.message })
      }
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
        packageSessionCount,
        installmentsAllowed,
        packageItems,
      } = request.body as {
        name?: string
        description?: string
        category?: 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO'
        duration?: number
        price?: number
        isActive?: boolean
        machineKind?: MachineKind | null
        allowOnSubscription?: boolean
        packageSessionCount?: number
        installmentsAllowed?: boolean
        packageItems?: Array<{ includedServiceId: string; durationMinutes?: number; sortOrder?: number }>
      }

      const existing = await prisma.service.findUnique({ where: { id } })
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Serviço não encontrado' })
      }

      const nextCategory = category || existing.category
      const isPackage = nextCategory === 'COMBO'

      if (isPackage && (machineKind === 'LASER' || machineKind === 'CRYO')) {
        return reply.status(400).send({
          success: false,
          error: 'Pacotes não podem ser tratamentos de Laser ou Crio',
        })
      }

      const kindUpdate =
        machineKind === undefined
          ? {}
          : {
              machineKind:
                machineKind === 'LASER' || machineKind === 'CRYO' ? machineKind : null,
            }
      
      let service = await prisma.service.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(category && { category }),
          ...(duration && !isPackage && { duration }),
          ...(price && { price }),
          ...(isActive !== undefined && { isActive }),
          ...kindUpdate,
          allowOnSubscription: isPackage ? false : allowOnSubscription,
          ...(packageSessionCount !== undefined && { packageSessionCount: isPackage ? packageSessionCount : null }),
          ...(installmentsAllowed !== undefined && { installmentsAllowed: isPackage ? installmentsAllowed : false }),
          ...(isPackage ? { machineKind: null } : {}),
        },
        include: PACKAGE_SERVICE_INCLUDE,
      })

      if (isPackage && packageItems) {
        service = await syncPackageItems(id, packageItems)
      }
      
      logger.success(`Serviço atualizado: ${service.name}`)
      return reply.status(200).send({
        success: true,
        data: service
      })
    } catch (error) {
      if (error instanceof PackageError) {
        return reply.status(error.statusCode).send({ success: false, error: error.message })
      }
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
