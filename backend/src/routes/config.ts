import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function configRoutes(app: FastifyInstance) {
  // GET - Buscar configurações do sistema
  app.get('/config', async (request, reply) => {
    logger.route('GET', '/config')
    
    try {
      // Busca a primeira (e única) configuração
      let config = await prisma.systemConfig.findFirst()
      
      // Se não existir, cria com valores padrão
      if (!config) {
        logger.warning('Configuração não encontrada, criando com valores padrão...')
        config = await prisma.systemConfig.create({
          data: {
            minCancellationHours: 8,
            minRescheduleHours: 8,
            defaultStartTime: '09:00',
            defaultEndTime: '18:00',
            slotDuration: 60,
            minimumCommitmentMonths: 3,
            enableEmailNotifications: true,
            enableSmsNotifications: false,
            maintenanceMode: false
          }
        })
      }
      
      logger.success('Configurações retornadas')
      return reply.status(200).send({
        success: true,
        data: config
      })
    } catch (error) {
      logger.error('Erro ao buscar configurações:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar configurações'
      })
    }
  })

  // PUT - Atualizar configurações do sistema (apenas para gestores)
  app.put('/config', async (request, reply) => {
    logger.route('PUT', '/config')
    
    try {
      const {
        minCancellationHours,
        minRescheduleHours,
        defaultStartTime,
        defaultEndTime,
        slotDuration,
        minimumCommitmentMonths,
        enableEmailNotifications,
        enableSmsNotifications,
        maintenanceMode,
        maintenanceMessage,
        phone,
        whatsapp,
        email,
        instagram,
        addressCep,
        addressStreet,
        addressNumber,
        addressComplement,
        addressNeighborhood,
        addressCity,
        addressState,
        cancellationPolicy,
        priceBronze,
        priceSilver,
        priceGold,
        updatedBy
      } = request.body as {
        minCancellationHours?: number
        minRescheduleHours?: number
        defaultStartTime?: string
        defaultEndTime?: string
        slotDuration?: number
        minimumCommitmentMonths?: number
        enableEmailNotifications?: boolean
        enableSmsNotifications?: boolean
        maintenanceMode?: boolean
        maintenanceMessage?: string
        phone?: string
        whatsapp?: string
        email?: string
        instagram?: string
        addressCep?: string
        addressStreet?: string
        addressNumber?: string
        addressComplement?: string
        addressNeighborhood?: string
        addressCity?: string
        addressState?: string
        cancellationPolicy?: string
        priceBronze?: number
        priceSilver?: number
        priceGold?: number
        updatedBy?: string
      }
      
      // Busca a configuração atual
      let config = await prisma.systemConfig.findFirst()
      
      if (!config) {
        // Se não existir, cria
        config = await prisma.systemConfig.create({
          data: {
            minCancellationHours: minCancellationHours || 8,
            minRescheduleHours: minRescheduleHours || 8,
            defaultStartTime: defaultStartTime || '09:00',
            defaultEndTime: defaultEndTime || '18:00',
            slotDuration: slotDuration || 60,
            minimumCommitmentMonths: minimumCommitmentMonths || 3,
            enableEmailNotifications: enableEmailNotifications ?? true,
            enableSmsNotifications: enableSmsNotifications ?? false,
            maintenanceMode: maintenanceMode ?? false,
            maintenanceMessage,
            updatedBy
          }
        })
      } else {
        // Se existir, atualiza
        config = await prisma.systemConfig.update({
          where: { id: config.id },
          data: {
            ...(minCancellationHours !== undefined && { minCancellationHours }),
            ...(minRescheduleHours !== undefined && { minRescheduleHours }),
            ...(defaultStartTime && { defaultStartTime }),
            ...(defaultEndTime && { defaultEndTime }),
            ...(slotDuration !== undefined && { slotDuration }),
            ...(minimumCommitmentMonths !== undefined && { minimumCommitmentMonths }),
            ...(enableEmailNotifications !== undefined && { enableEmailNotifications }),
            ...(enableSmsNotifications !== undefined && { enableSmsNotifications }),
            ...(maintenanceMode !== undefined && { maintenanceMode }),
            ...(maintenanceMessage !== undefined && { maintenanceMessage }),
            ...(phone !== undefined && { phone }),
            ...(whatsapp !== undefined && { whatsapp }),
            ...(email !== undefined && { email }),
            ...(instagram !== undefined && { instagram }),
            ...(addressCep !== undefined && { addressCep }),
            ...(addressStreet !== undefined && { addressStreet }),
            ...(addressNumber !== undefined && { addressNumber }),
            ...(addressComplement !== undefined && { addressComplement }),
            ...(addressNeighborhood !== undefined && { addressNeighborhood }),
            ...(addressCity !== undefined && { addressCity }),
            ...(addressState !== undefined && { addressState }),
            ...(cancellationPolicy !== undefined && { cancellationPolicy }),
            ...(priceBronze !== undefined && { priceBronze }),
            ...(priceSilver !== undefined && { priceSilver }),
            ...(priceGold !== undefined && { priceGold }),
            ...(updatedBy && { updatedBy })
          }
        })
      }
      
      logger.success('Configurações atualizadas')
      return reply.status(200).send({
        success: true,
        data: config
      })
    } catch (error) {
      logger.error('Erro ao atualizar configurações:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar configurações'
      })
    }
  })
}

