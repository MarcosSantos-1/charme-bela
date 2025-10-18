import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

// Função auxiliar para gerar slots de horário
function generateTimeSlots(start: string, end: string, duration: number): string[] {
  const slots: string[] = []
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)
  
  let currentTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin
  
  while (currentTime + duration <= endTime) {
    const hours = Math.floor(currentTime / 60).toString().padStart(2, '0')
    const minutes = (currentTime % 60).toString().padStart(2, '0')
    slots.push(`${hours}:${minutes}`)
    currentTime += duration
  }
  
  return slots
}

export async function scheduleRoutes(app: FastifyInstance) {
  // GET - Buscar horários disponíveis para um dia específico
  app.get('/schedule/available', async (request, reply) => {
    logger.route('GET', '/schedule/available')
    
    try {
      const { date, serviceId } = request.query as { 
        date: string  // Format: YYYY-MM-DD
        serviceId?: string 
      }
      
      if (!date) {
        return reply.status(400).send({
          success: false,
          error: 'Data é obrigatória (formato: YYYY-MM-DD)'
        })
      }
      
      // Força a data em UTC para evitar problemas de timezone
      const targetDate = new Date(date + 'T00:00:00.000Z')
      const dayOfWeek = targetDate.getUTCDay()  // Usa getUTCDay() ao invés de getDay()
      
      // Bloquear apenas datas passadas (permite agendamento no mesmo dia)
      // Usar toLocaleString com timezone de São Paulo
      const now = new Date()
      const saoPauloDateStr = now.toLocaleString('en-CA', { 
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split(',')[0] // formato: YYYY-MM-DD
      
      logger.debug(`📅 Data solicitada: ${date}, Hoje em SP: ${saoPauloDateStr}, UTC: ${now.toISOString()}`)
      
      if (date < saoPauloDateStr) {
        logger.warning(`❌ Data ${date} é anterior a ${saoPauloDateStr}`)
        return reply.status(400).send({
          success: false,
          error: 'Não é possível agendar em datas passadas',
          data: {
            date,
            available: false,
            reason: 'Data passada',
            slots: []
          }
        })
      }
      
      logger.debug(`✅ Data ${date} permitida (hoje ou futuro)`)
      
      // 1. Busca configurações
      const config = await prisma.systemConfig.findFirst()
      const slotDuration = config?.slotDuration || 60
      
      // 2. Verifica se há override para esta data específica (feriado, folga, etc)
      const override = await prisma.scheduleOverride.findUnique({
        where: { date: targetDate }
      })
      
      let availableSlots: any[] = []
      
      if (override) {
        if (!override.isAvailable) {
          // Dia indisponível (feriado, folga)
          logger.info(`Data indisponível: ${date} - ${override.reason}`)
          return reply.status(200).send({
            success: true,
            data: {
              date,
              available: false,
              reason: override.reason || 'Dia indisponível',
              slots: []
            }
          })
        }
        
        // Usa horários do override
        if (override.availableSlots) {
          const slots = override.availableSlots as any[]
          availableSlots = slots
        }
      } else {
        // 3. Busca horários normais do dia da semana
        const managerSchedule = await prisma.managerSchedule.findUnique({
          where: { dayOfWeek }
        })
        
        if (!managerSchedule || !managerSchedule.isAvailable) {
          logger.info(`Dia da semana indisponível: ${dayOfWeek}`)
          return reply.status(200).send({
            success: true,
            data: {
              date,
              available: false,
              reason: 'Dia não atende',
              slots: []
            }
          })
        }
        
        availableSlots = managerSchedule.availableSlots as any[]
      }
      
      // 4. Gera todos os slots possíveis
      let allSlots: string[] = []
      for (const period of availableSlots) {
        const slots = generateTimeSlots(period.start, period.end, slotDuration)
        allSlots = [...allSlots, ...slots]
      }
      
      logger.debug(`Períodos configurados: ${JSON.stringify(availableSlots)}`)
      logger.debug(`Slots gerados (allSlots): ${allSlots.join(', ')}`)
      
      // 5. Se foi informado um serviço, ajusta pela duração do serviço
      let serviceDuration = slotDuration
      if (serviceId) {
        const service = await prisma.service.findUnique({
          where: { id: serviceId }
        })
        if (service) {
          serviceDuration = service.duration
        }
      }
      
      // 6. Busca agendamentos do dia (UTC-safe)
      // Forçamos a data para UTC para evitar problemas de timezone
      const startOfDay = new Date(date + 'T00:00:00.000Z')
      const endOfDay = new Date(date + 'T23:59:59.999Z')
      
      logger.debug(`Buscando agendamentos entre ${startOfDay.toISOString()} e ${endOfDay.toISOString()}`)
      
      const appointments = await prisma.appointment.findMany({
        where: {
          startTime: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: { not: 'CANCELED' }
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          origin: true
        }
      })
      
      logger.debug(`Encontrados ${appointments.length} agendamentos no dia ${date}`)
      appointments.forEach(apt => {
        logger.debug(`  - Agendamento ${apt.id}: ${apt.startTime.toISOString()} - ${apt.endTime.toISOString()} (${apt.status}, ${apt.origin})`)
      })
      
      // 7. Todos os slots são sempre disponíveis (não bloqueia por conflito de horário)
      const availableTimes = allSlots
      
      // 8. Calcula slots OCUPADOS apenas para UI mostrar quantos agendamentos já existem no horário
      // IMPORTANTE: Bloqueia apenas o horário EXATO de início se já existe agendamento
      // NÃO bloqueia horários subsequentes mesmo que o serviço ainda esteja acontecendo
      // Isso permite múltiplas clientes no mesmo período (várias macas)
      const bookedSlots: string[] = []
      
      allSlots.forEach(slot => {
        const slotStart = new Date(date + 'T' + slot + ':00.000Z')
        
        // Verifica se já existe agendamento COMEÇANDO neste horário exato
        const hasExactMatch = appointments.find(apt => {
          return apt.startTime.getTime() === slotStart.getTime()
        })
        
        if (hasExactMatch) {
          bookedSlots.push(slot)
          logger.debug(`  ⚠️ Slot ${slot} tem agendamento começando (${hasExactMatch.id})`)
        }
      })
      
      logger.success(`${availableTimes.length} horários disponíveis em ${date}`)
      logger.debug(`Slots ocupados: ${bookedSlots.join(', ')}`)
      logger.debug(`Slots disponíveis: ${availableTimes.join(', ')}`)
      
      return reply.status(200).send({
        success: true,
        data: {
          date,
          available: true,
          dayOfWeek,
          slots: availableTimes,
          totalSlots: availableTimes.length,
          serviceDuration,
          bookedSlots,  // Slots já ocupados (para debug)
          totalAppointments: appointments.length
        }
      })
    } catch (error) {
      logger.error('Erro ao buscar horários disponíveis:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar horários disponíveis'
      })
    }
  })

  // GET - Buscar horários para ADMIN (fixo 6h-21h, mas respeita dias fechados)
  app.get('/schedule/admin-slots', async (request, reply) => {
    logger.route('GET', '/schedule/admin-slots')
    
    try {
      const { date, serviceId } = request.query as { 
        date: string  // Format: YYYY-MM-DD
        serviceId?: string 
      }
      
      if (!date) {
        return reply.status(400).send({
          success: false,
          error: 'Data é obrigatória (formato: YYYY-MM-DD)'
        })
      }
      
      const targetDate = new Date(date + 'T00:00:00.000Z')
      const dayOfWeek = targetDate.getUTCDay()
      
      logger.info(`✅ Admin consultando horários para: ${date} (dia da semana: ${dayOfWeek})`)
      
      // 1. Verifica se há override para esta data (feriado, folga, etc)
      const override = await prisma.scheduleOverride.findUnique({
        where: { date: targetDate }
      })
      
      if (override && !override.isAvailable) {
        logger.info(`❌ Data indisponível (override): ${date} - ${override.reason}`)
        return reply.status(200).send({
          success: true,
          data: {
            date,
            available: false,
            reason: override.reason || 'Dia indisponível',
            slots: [],
            bookedSlots: [],
            totalAppointments: 0
          }
        })
      }
      
      // 2. Se não tem override, verifica configuração do dia da semana
      if (!override) {
        const managerSchedule = await prisma.managerSchedule.findUnique({
          where: { dayOfWeek }
        })
        
        if (!managerSchedule || !managerSchedule.isAvailable) {
          logger.info(`❌ Dia da semana ${dayOfWeek} não configurado para atender`)
          return reply.status(200).send({
            success: true,
            data: {
              date,
              available: false,
              reason: 'Dia não atende',
              slots: [],
              bookedSlots: [],
              totalAppointments: 0
            }
          })
        }
      }
      
      logger.info(`✅ Dia ${date} está configurado para atender`)
      
      // 3. ADMIN: horários fixos das 6h às 21h (horários estendidos)
      const slotDuration = 60 // 60 minutos
      const adminSlots = generateTimeSlots('06:00', '21:00', slotDuration)
      
      // 4. Se for hoje (usando horário de São Paulo), filtrar horários que já passaram
      const now = new Date()
      
      // Obter data ATUAL em São Paulo (horário local do Brasil)
      const saoPauloDateStr = now.toLocaleString('en-CA', { 
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split(',')[0] // formato: YYYY-MM-DD
      
      logger.debug(`📅 Comparando datas - Solicitada: ${date}, Hoje em SP: ${saoPauloDateStr}`)
      
      // Comparar com horário de São Paulo
      const isToday = date === saoPauloDateStr
      
      let availableSlots = adminSlots
      if (isToday) {
        // Obter hora atual em São Paulo
        const saoPauloTime = now.toLocaleString('en-US', { 
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        const [currentHour, currentMinute] = saoPauloTime.split(':').map(Number)
        const currentTimeInMinutes = currentHour * 60 + currentMinute
        
        logger.debug(`⏰ Hora atual em SP: ${saoPauloTime} (${currentTimeInMinutes} minutos)`)
        
        availableSlots = adminSlots.filter(slot => {
          const [hour, minute] = slot.split(':').map(Number)
          const slotTimeInMinutes = hour * 60 + minute
          // Pelo menos 30min de antecedência
          return slotTimeInMinutes > currentTimeInMinutes + 30
        })
        
        logger.debug(`✅ Slots após filtro de hoje: ${availableSlots.length} disponíveis`)
      }
      
      // 5. Buscar agendamentos do dia
      const startOfDay = new Date(date + 'T00:00:00.000Z')
      const endOfDay = new Date(date + 'T23:59:59.999Z')
      
      const appointments = await prisma.appointment.findMany({
        where: {
          startTime: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: { not: 'CANCELED' }
        }
      })
      
      logger.debug(`📋 Encontrados ${appointments.length} agendamentos em ${date}`)
      
      // 6. Calcular slots ocupados
      const bookedSlots: string[] = []
      availableSlots.forEach(slot => {
        const slotStart = new Date(date + 'T' + slot + ':00.000Z')
        const hasExactMatch = appointments.find(apt => {
          return apt.startTime.getTime() === slotStart.getTime()
        })
        if (hasExactMatch) {
          bookedSlots.push(slot)
        }
      })
      
      logger.success(`✅ Admin slots para ${date}: ${availableSlots.length} disponíveis, ${bookedSlots.length} ocupados`)
      
      return reply.status(200).send({
        success: true,
        data: {
          date,
          available: true,
          slots: availableSlots,
          bookedSlots,
          totalAppointments: appointments.length
        }
      })
    } catch (error) {
      logger.error('Erro ao buscar horários admin:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar horários'
      })
    }
  })

  // GET - Listar horários de funcionamento da semana
  app.get('/schedule/manager', async (request, reply) => {
    logger.route('GET', '/schedule/manager')
    
    try {
      const schedules = await prisma.managerSchedule.findMany({
        orderBy: { dayOfWeek: 'asc' }
      })
      
      logger.success(`Retornando ${schedules.length} horários`)
      return reply.status(200).send({
        success: true,
        data: schedules
      })
    } catch (error) {
      logger.error('Erro ao buscar horários:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar horários'
      })
    }
  })

  // POST/PUT - Definir horários de funcionamento (admin)
  app.post('/schedule/manager', async (request, reply) => {
    logger.route('POST', '/schedule/manager')
    
    try {
      const {
        dayOfWeek,
        isAvailable,
        availableSlots
      } = request.body as {
        dayOfWeek: number  // 0-6
        isAvailable: boolean
        availableSlots: Array<{ start: string, end: string }>
      }
      
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return reply.status(400).send({
          success: false,
          error: 'dayOfWeek deve estar entre 0 (Domingo) e 6 (Sábado)'
        })
      }
      
      // Upsert (cria ou atualiza)
      const schedule = await prisma.managerSchedule.upsert({
        where: { dayOfWeek },
        update: {
          isAvailable,
          availableSlots
        },
        create: {
          dayOfWeek,
          isAvailable,
          availableSlots
        }
      })
      
      logger.success(`Horário do dia ${dayOfWeek} atualizado`)
      return reply.status(200).send({
        success: true,
        data: schedule
      })
    } catch (error) {
      logger.error('Erro ao definir horário:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao definir horário'
      })
    }
  })

  // GET - Listar exceções de horário (feriados, folgas)
  app.get('/schedule/overrides', async (request, reply) => {
    logger.route('GET', '/schedule/overrides')
    
    try {
      const { startDate, endDate } = request.query as {
        startDate?: string
        endDate?: string
      }
      
      const overrides = await prisma.scheduleOverride.findMany({
        where: {
          ...(startDate && endDate && {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          })
        },
        orderBy: { date: 'asc' }
      })
      
      logger.success(`Retornando ${overrides.length} exceções`)
      return reply.status(200).send({
        success: true,
        data: overrides
      })
    } catch (error) {
      logger.error('Erro ao buscar exceções:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar exceções'
      })
    }
  })

  // POST - Criar exceção de horário (feriado, folga, hora extra)
  app.post('/schedule/overrides', async (request, reply) => {
    logger.route('POST', '/schedule/overrides')
    
    try {
      const {
        date,
        isAvailable,
        availableSlots,
        reason
      } = request.body as {
        date: string
        isAvailable: boolean
        availableSlots?: Array<{ start: string, end: string }>
        reason?: string
      }
      
      const targetDate = new Date(date)
      
      // Upsert
      const override = await prisma.scheduleOverride.upsert({
        where: { date: targetDate },
        update: {
          isAvailable,
          availableSlots,
          reason
        },
        create: {
          date: targetDate,
          isAvailable,
          availableSlots,
          reason
        }
      })
      
      logger.success(`Exceção criada para ${date}: ${reason}`)
      return reply.status(201).send({
        success: true,
        data: override
      })
    } catch (error) {
      logger.error('Erro ao criar exceção:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar exceção'
      })
    }
  })

  // DELETE - Remover exceção
  app.delete('/schedule/overrides/:date', async (request, reply) => {
    const { date } = request.params as { date: string }
    logger.route('DELETE', `/schedule/overrides/${date}`)
    
    try {
      const targetDate = new Date(date)
      
      await prisma.scheduleOverride.delete({
        where: { date: targetDate }
      })
      
      logger.success(`Exceção removida: ${date}`)
      return reply.status(200).send({
        success: true,
        message: 'Exceção removida com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao remover exceção:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover exceção'
      })
    }
  })
}

