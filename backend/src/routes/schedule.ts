import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

// ============================================================================
// Helpers de horário (slots dinâmicos)
//
// Convenção de fuso: o rótulo "HH:MM" é sempre tratado no MESMO referencial em
// que os agendamentos são persistidos. O frontend envia startTime como
// `${data}T${slot}:00.000Z`, então montamos os slots com o mesmo sufixo ".000Z".
// Isso garante que a comparação de conflito entre slots e agendamentos seja
// exata (mesmo instante = mesmo getTime()). Não convertemos para America/Sao_Paulo
// aqui para não dessincronizar dos dados já gravados e do frontend.
// ============================================================================

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// Converte um rótulo "HH:MM" numa data (mesmo referencial dos agendamentos)
function slotToDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`)
}

// Gera horários de INÍCIO candidatos numa grade de `step` minutos, garantindo que
// um serviço de `serviceDuration` minutos caiba INTEIRO dentro do período.
function generateSlotStarts(
  start: string,
  end: string,
  step: number,
  serviceDuration: number
): string[] {
  const slots: string[] = []
  const periodStart = timeToMinutes(start)
  const periodEnd = timeToMinutes(end)

  for (let t = periodStart; t + serviceDuration <= periodEnd; t += step) {
    slots.push(minutesToTime(t))
  }

  return slots
}

// Compat: grade simples de slots (usada quando não há duração de serviço)
function generateTimeSlots(start: string, end: string, duration: number): string[] {
  return generateSlotStarts(start, end, duration, duration)
}

// Conta quantos agendamentos existentes se sobrepõem ao intervalo [slotStart, slotEnd)
function countOverlaps(
  slotStart: Date,
  slotEnd: Date,
  appointments: Array<{ startTime: Date; endTime: Date }>
): number {
  const startMs = slotStart.getTime()
  const endMs = slotEnd.getTime()
  return appointments.filter(
    (apt) => apt.startTime.getTime() < endMs && apt.endTime.getTime() > startMs
  ).length
}

// A partir de horários candidatos, separa entre disponíveis e ocupados aplicando
// a capacidade (maxSimultaneous). Um slot fica ocupado quando o intervalo do serviço
// colide com >= maxSimultaneous agendamentos existentes.
function splitAvailability(
  date: string,
  candidateSlots: string[],
  serviceDuration: number,
  appointments: Array<{ startTime: Date; endTime: Date }>,
  maxSimultaneous: number
): { available: string[]; booked: string[] } {
  const available: string[] = []
  const booked: string[] = []

  for (const slot of candidateSlots) {
    const slotStart = slotToDate(date, slot)
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000)
    const overlaps = countOverlaps(slotStart, slotEnd, appointments)

    if (overlaps >= maxSimultaneous) {
      booked.push(slot)
    } else {
      available.push(slot)
    }
  }

  return { available, booked }
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
      const slotDuration = config?.slotDuration || 30
      const maxSimultaneous = config?.maxSimultaneous || 1
      
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
      
      // 4. Determina a duração do serviço (define quanto tempo cada slot ocupa).
      // Sem serviço informado, assume a granularidade da grade.
      let serviceDuration = slotDuration
      if (serviceId) {
        const service = await prisma.service.findUnique({
          where: { id: serviceId }
        })
        if (service) {
          serviceDuration = service.duration
        }
      }
      
      // 5. Gera horários de INÍCIO candidatos numa grade de `slotDuration` (30min),
      // garantindo que o serviço inteiro caiba dentro do período de atendimento.
      let candidateSlots: string[] = []
      for (const period of availableSlots) {
        const slots = generateSlotStarts(period.start, period.end, slotDuration, serviceDuration)
        candidateSlots = [...candidateSlots, ...slots]
      }
      // Remove duplicatas e ordena (períodos não deveriam se sobrepor, mas garantimos)
      candidateSlots = Array.from(new Set(candidateSlots)).sort()
      
      logger.debug(`Períodos configurados: ${JSON.stringify(availableSlots)}`)
      logger.debug(`Grade ${slotDuration}min, serviço ${serviceDuration}min → candidatos: ${candidateSlots.join(', ')}`)
      
      // 6. Busca agendamentos do dia (mesmo referencial UTC dos rótulos de slot)
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
      
      // 7. Aplica detecção real de conflito por interseção de intervalos.
      // Um horário só é oferecido se o intervalo [início, início + duração) couber
      // sem colidir com >= maxSimultaneous agendamentos existentes (capacidade).
      // Serviços longos (ex: 1h30) exigem naturalmente 3 slots de 30min livres,
      // pois qualquer sobreposição no intervalo os torna indisponíveis.
      const { available: availableTimes, booked: bookedSlots } = splitAvailability(
        date,
        candidateSlots,
        serviceDuration,
        appointments,
        maxSimultaneous
      )
      
      logger.success(`${availableTimes.length} horários disponíveis em ${date} (capacidade ${maxSimultaneous})`)
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
          slotDuration,
          maxSimultaneous,
          bookedSlots,  // Slots indisponíveis por conflito de horário
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
      
      // 3. Config: mesma grade e capacidade da área do cliente
      const config = await prisma.systemConfig.findFirst()
      const slotDuration = config?.slotDuration || 30
      const maxSimultaneous = config?.maxSimultaneous || 1
      
      // Duração do serviço (define o intervalo ocupado por cada slot)
      let serviceDuration = slotDuration
      if (serviceId) {
        const service = await prisma.service.findUnique({
          where: { id: serviceId }
        })
        if (service) {
          serviceDuration = service.duration
        }
      }
      
      // ADMIN: horários estendidos das 6h às 21h, mas na mesma grade de `slotDuration`,
      // garantindo que o serviço inteiro caiba na janela.
      let candidateSlots = generateSlotStarts('06:00', '21:00', slotDuration, serviceDuration)
      
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
        
        candidateSlots = candidateSlots.filter(slot => {
          const slotTimeInMinutes = timeToMinutes(slot)
          // Pelo menos 30min de antecedência
          return slotTimeInMinutes > currentTimeInMinutes + 30
        })
        
        logger.debug(`✅ Slots após filtro de hoje: ${candidateSlots.length} disponíveis`)
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
      
      // 6. Detecção de conflito por interseção de intervalos (mesma regra do cliente)
      const { available: availableSlots, booked: bookedSlots } = splitAvailability(
        date,
        candidateSlots,
        serviceDuration,
        appointments,
        maxSimultaneous
      )
      
      logger.success(`✅ Admin slots para ${date}: ${availableSlots.length} disponíveis, ${bookedSlots.length} ocupados`)
      
      return reply.status(200).send({
        success: true,
        data: {
          date,
          available: true,
          slots: availableSlots,
          serviceDuration,
          slotDuration,
          maxSimultaneous,
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

