import { FastifyInstance } from 'fastify'
import { MachineKind, MachineRentalStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { releaseExpiredPaymentHolds } from '../utils/paymentHolds'
import { wallClockNowAsStoredUtc } from '../utils/wallClock'
import {
  assertMachineBookingAllowed,
  dateToYmd,
  ensureCurrentAndNextOccurrences,
  finalizePastReleasedOccurrences,
  spTodayYmd,
  ymdToDate,
} from '../utils/machineRental'
import { cancelClinicAppointments } from '../utils/clinicCancellations'
import {
  applyManagerSchedule,
  applyWeekSchedule,
  computeWeekImpact,
  findManagerScheduleImpact,
  isYmd,
  mondayOfWeek,
  normalizeSlots,
  toImpactItem,
  weekDatesFromMonday,
  type ManagerDayInput,
  type WeekDayInput,
} from '../utils/scheduleHours'

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

type SchedulePeriod = { start: string; end: string }

function periodsForDay(
  ymd: string,
  dow: number,
  scheduleByDow: Map<number, { isAvailable: boolean; availableSlots: any }>,
  overrideByYmd: Map<string, { isAvailable: boolean; availableSlots: any }>
): SchedulePeriod[] | null {
  const override = overrideByYmd.get(ymd)
  if (override) {
    if (!override.isAvailable) return null
    return (override.availableSlots as SchedulePeriod[] | null) || []
  }
  const schedule = scheduleByDow.get(dow)
  if (!schedule || !schedule.isAvailable) return null
  return (schedule.availableSlots as SchedulePeriod[]) || []
}

function machineAllowsDay(
  ymd: string,
  machineKind: MachineKind | null,
  occurrences: Array<{ kind: MachineKind; date: Date; status: MachineRentalStatus }>
) {
  const onDay = occurrences.filter((occ) => dateToYmd(occ.date) === ymd)
  if (!machineKind) {
    return !onDay.some((occ) => occ.kind === MachineKind.LASER)
  }
  return onDay.some((occ) => occ.kind === machineKind && occ.status === MachineRentalStatus.RELEASED)
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

      await finalizePastReleasedOccurrences()

      // Regras de máquinas alugadas (Laser exclusivo / Crio só no dia liberado)
      let serviceMachineKind: MachineKind | null = null
      if (serviceId) {
        const svc = await prisma.service.findUnique({
          where: { id: serviceId },
          select: { machineKind: true, duration: true },
        })
        serviceMachineKind = svc?.machineKind ?? null
      }

      const machineCheck = await assertMachineBookingAllowed(serviceMachineKind, date)
      if (!machineCheck.ok) {
        return reply.status(200).send({
          success: true,
          data: {
            date,
            available: false,
            reason: machineCheck.error,
            slots: [],
            machineBlocked: true,
          },
        })
      }
      
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

      // No dia de hoje (America/Sao_Paulo), remove horários cujo início já passou.
      // Ex.: agora 16:50 → 16:30 some; 17:00 continua elegível.
      if (date === saoPauloDateStr) {
        const wallNow = wallClockNowAsStoredUtc(now)
        const before = candidateSlots.length
        candidateSlots = candidateSlots.filter((slot) => slotToDate(date, slot).getTime() > wallNow.getTime())
        logger.debug(
          `Filtro horário atual (SP ${wallNow.toISOString()}): ${before} → ${candidateSlots.length} candidatos futuros`
        )
      }
      
      logger.debug(`Períodos configurados: ${JSON.stringify(availableSlots)}`)
      logger.debug(`Grade ${slotDuration}min, serviço ${serviceDuration}min → candidatos: ${candidateSlots.join(', ')}`)

      if (candidateSlots.length === 0) {
        const reason =
          date === saoPauloDateStr
            ? 'Não há mais horários disponíveis para hoje'
            : 'Nenhum horário disponível'
        logger.info(`${reason} (${date})`)
        return reply.status(200).send({
          success: true,
          data: {
            date,
            available: false,
            reason,
            slots: [],
            bookedSlots: [],
            totalSlots: 0,
          }
        })
      }
      
      // 6. Busca agendamentos do dia (mesmo referencial UTC dos rótulos de slot)
      // Antes, libera holds de pagamento expirados para não mostrar como ocupado
      // um horário de checkout abandonado.
      await releaseExpiredPaymentHolds()
      
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
      
      let availablePeriods: Array<{ start: string; end: string }> = []

      if (override) {
        availablePeriods = normalizeSlots(override.availableSlots as Array<{ start: string; end: string }>)
      } else {
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
        availablePeriods = normalizeSlots(managerSchedule.availableSlots as Array<{ start: string; end: string }>)
      }

      if (availablePeriods.length === 0) {
        return reply.status(200).send({
          success: true,
          data: {
            date,
            available: false,
            reason: 'Não há horários de atendimento configurados para esta data',
            slots: [],
            bookedSlots: [],
            totalAppointments: 0
          }
        })
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
      
      // Grade do horário efetivo do dia (override ou padrão da clínica)
      let candidateSlots: string[] = []
      for (const period of availablePeriods) {
        candidateSlots = [
          ...candidateSlots,
          ...generateSlotStarts(period.start, period.end, slotDuration, serviceDuration)
        ]
      }
      candidateSlots = Array.from(new Set(candidateSlots))
      
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
      
      // 5. Buscar agendamentos do dia (liberando antes os holds de pagamento expirados)
      await releaseExpiredPaymentHolds()
      
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

  const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  app.get('/schedule/week', async (request, reply) => {
    logger.route('GET', '/schedule/week')
    try {
      const { weekStart } = request.query as { weekStart?: string }
      const today = spTodayYmd()
      const monday = mondayOfWeek(isYmd(weekStart) ? weekStart : today)
      const dates = weekDatesFromMonday(monday)
      const weekEnd = dates[6]

      const [schedules, overrides] = await Promise.all([
        prisma.managerSchedule.findMany(),
        prisma.scheduleOverride.findMany({
          where: {
            date: {
              gte: ymdToDate(monday),
              lte: ymdToDate(weekEnd),
            },
          },
        }),
      ])

      const byDow = new Map(schedules.map((row) => [row.dayOfWeek, row]))
      const overrideByYmd = new Map(overrides.map((row) => [dateToYmd(row.date), row]))

      const days = dates.map((ymd) => {
        const dow = ymdToDate(ymd).getUTCDay()
        const def = byDow.get(dow)
        const defaultAvailable = Boolean(def?.isAvailable)
        const defaultSlots = normalizeSlots(def?.availableSlots as Array<{ start: string; end: string }>)
        const override = overrideByYmd.get(ymd)
        const isCustom = Boolean(override)
        const isAvailable = override ? override.isAvailable : defaultAvailable
        const availableSlots = override
          ? (override.isAvailable ? normalizeSlots(override.availableSlots as Array<{ start: string; end: string }>) : [])
          : defaultSlots

        return {
          date: ymd,
          dayOfWeek: dow,
          name: WEEKDAY_NAMES[dow],
          isPast: ymd < today,
          isCustom,
          isAvailable,
          availableSlots,
          defaultAvailable,
          defaultSlots,
          reason: override?.reason || null,
        }
      })

      return reply.status(200).send({
        success: true,
        data: { weekStart: monday, weekEnd, days },
      })
    } catch (error) {
      logger.error('Erro ao buscar agenda da semana:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar agenda da semana',
      })
    }
  })

  app.post('/schedule/week/preview', async (request, reply) => {
    logger.route('POST', '/schedule/week/preview')
    try {
      const body = request.body as { weekStart?: string; days?: WeekDayInput[] }
      if (!isYmd(body.weekStart) || !Array.isArray(body.days)) {
        return reply.status(400).send({ success: false, error: 'weekStart e days são obrigatórios' })
      }

      const affected = await computeWeekImpact(body.weekStart, body.days)
      return reply.status(200).send({
        success: true,
        data: {
          affectedCount: affected.length,
          affected: affected.map((apt) => toImpactItem(apt, apt.cancelReason)),
        },
      })
    } catch (error) {
      logger.error('Erro no preview da agenda semanal:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao calcular impacto' })
    }
  })

  app.post('/schedule/week', async (request, reply) => {
    logger.route('POST', '/schedule/week')
    try {
      const body = request.body as {
        weekStart?: string
        days?: WeekDayInput[]
        confirm?: boolean
        adminUserId?: string
      }

      if (!isYmd(body.weekStart) || !Array.isArray(body.days)) {
        return reply.status(400).send({ success: false, error: 'weekStart e days são obrigatórios' })
      }
      if (!body.confirm) {
        return reply.status(400).send({
          success: false,
          error: 'Confirme a alteração (confirm: true) após revisar o impacto',
        })
      }

      const affected = await computeWeekImpact(body.weekStart, body.days)
      await cancelClinicAppointments(
        affected,
        'Horário da clínica alterado',
        'credit',
        body.adminUserId || 'system'
      )
      await applyWeekSchedule(body.weekStart, body.days)

      return reply.status(200).send({
        success: true,
        data: { canceledCount: affected.length },
      })
    } catch (error) {
      logger.error('Erro ao salvar agenda da semana:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao salvar agenda da semana' })
    }
  })

  app.post('/schedule/manager/preview', async (request, reply) => {
    logger.route('POST', '/schedule/manager/preview')
    try {
      const body = request.body as { days?: ManagerDayInput[] }
      if (!Array.isArray(body.days) || body.days.length === 0) {
        return reply.status(400).send({ success: false, error: 'days é obrigatório' })
      }

      const affected = await findManagerScheduleImpact(body.days)
      return reply.status(200).send({
        success: true,
        data: {
          affectedCount: affected.length,
          affected: affected.map((apt) => toImpactItem(apt, apt.cancelReason)),
        },
      })
    } catch (error) {
      logger.error('Erro no preview do horário padrão:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao calcular impacto' })
    }
  })

  app.post('/schedule/manager/batch', async (request, reply) => {
    logger.route('POST', '/schedule/manager/batch')
    try {
      const body = request.body as {
        days?: ManagerDayInput[]
        confirm?: boolean
        adminUserId?: string
      }
      if (!Array.isArray(body.days) || body.days.length === 0) {
        return reply.status(400).send({ success: false, error: 'days é obrigatório' })
      }
      if (!body.confirm) {
        return reply.status(400).send({
          success: false,
          error: 'Confirme a alteração (confirm: true) após revisar o impacto',
        })
      }

      const affected = await findManagerScheduleImpact(body.days)
      await cancelClinicAppointments(
        affected,
        'Horário de funcionamento alterado',
        'credit',
        body.adminUserId || 'system'
      )
      await applyManagerSchedule(body.days)

      return reply.status(200).send({
        success: true,
        data: { canceledCount: affected.length },
      })
    } catch (error) {
      logger.error('Erro ao salvar horário padrão:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao salvar horário de funcionamento' })
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
          ...(isYmd(startDate) && isYmd(endDate) && {
            date: {
              gte: ymdToDate(startDate),
              lte: ymdToDate(endDate)
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

      if (!isYmd(date)) {
        return reply.status(400).send({
          success: false,
          error: 'Data inválida (formato: YYYY-MM-DD)'
        })
      }
      
      const targetDate = ymdToDate(date)
      
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
      if (!isYmd(date)) {
        return reply.status(400).send({
          success: false,
          error: 'Data inválida (formato: YYYY-MM-DD)'
        })
      }

      const targetDate = ymdToDate(date)
      
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

  // GET - Dias com pelo menos um horário livre para o serviço
  app.get('/schedule/available-days', async (request, reply) => {
    logger.route('GET', '/schedule/available-days')

    try {
      const { from, to, serviceId } = request.query as {
        from?: string
        to?: string
        serviceId?: string
      }
      if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return reply.status(400).send({
          success: false,
          error: 'from e to são obrigatórios (YYYY-MM-DD)',
        })
      }
      if (from > to) {
        return reply.status(400).send({
          success: false,
          error: 'from deve ser anterior ou igual a to',
        })
      }

      const fromDate = ymdToDate(from)
      const toDate = ymdToDate(to)
      const spanDays = (toDate.getTime() - fromDate.getTime()) / 86400000
      if (spanDays > 62) {
        return reply.status(400).send({
          success: false,
          error: 'Intervalo máximo de 62 dias',
        })
      }

      await finalizePastReleasedOccurrences()
      await ensureCurrentAndNextOccurrences()
      await releaseExpiredPaymentHolds()

      let serviceMachineKind: MachineKind | null = null
      const config = await prisma.systemConfig.findFirst()
      const slotDuration = config?.slotDuration || 30
      const maxSimultaneous = config?.maxSimultaneous || 1
      let serviceDuration = slotDuration

      if (serviceId) {
        const svc = await prisma.service.findUnique({
          where: { id: serviceId },
          select: { machineKind: true, duration: true },
        })
        serviceMachineKind = svc?.machineKind ?? null
        if (svc?.duration) serviceDuration = svc.duration
      }

      const [schedules, overrides, occurrences, appointments] = await Promise.all([
        prisma.managerSchedule.findMany(),
        prisma.scheduleOverride.findMany({
          where: { date: { gte: fromDate, lte: toDate } },
        }),
        prisma.machineRentalOccurrence.findMany({
          where: {
            date: { gte: fromDate, lte: toDate },
            status: {
              in: [
                MachineRentalStatus.HELD,
                MachineRentalStatus.RELEASED,
                MachineRentalStatus.DONE,
              ],
            },
          },
        }),
        prisma.appointment.findMany({
          where: {
            startTime: { gte: fromDate, lte: new Date(`${to}T23:59:59.999Z`) },
            status: { not: 'CANCELED' },
          },
          select: { startTime: true, endTime: true },
        }),
      ])

      const scheduleByDow = new Map(schedules.map((s) => [s.dayOfWeek, s]))
      const overrideByYmd = new Map(overrides.map((o) => [dateToYmd(o.date), o]))
      const appointmentsByYmd = new Map<string, Array<{ startTime: Date; endTime: Date }>>()
      for (const apt of appointments) {
        const ymd = dateToYmd(apt.startTime)
        const list = appointmentsByYmd.get(ymd) || []
        list.push(apt)
        appointmentsByYmd.set(ymd, list)
      }

      const saoPauloDateStr = spTodayYmd()
      const wallNow = wallClockNowAsStoredUtc()
      const days: Array<{ date: string }> = []
      const cursor = new Date(fromDate)
      const end = new Date(toDate)

      while (cursor.getTime() <= end.getTime()) {
        const ymd = dateToYmd(cursor)
        if (ymd >= saoPauloDateStr && machineAllowsDay(ymd, serviceMachineKind, occurrences)) {
          const periods = periodsForDay(ymd, cursor.getUTCDay(), scheduleByDow, overrideByYmd)
          if (periods && periods.length > 0) {
            let candidateSlots: string[] = []
            for (const period of periods) {
              candidateSlots.push(
                ...generateSlotStarts(period.start, period.end, slotDuration, serviceDuration)
              )
            }
            candidateSlots = Array.from(new Set(candidateSlots)).sort()
            if (ymd === saoPauloDateStr) {
              candidateSlots = candidateSlots.filter(
                (slot) => slotToDate(ymd, slot).getTime() > wallNow.getTime()
              )
            }
            const { available } = splitAvailability(
              ymd,
              candidateSlots,
              serviceDuration,
              appointmentsByYmd.get(ymd) || [],
              maxSimultaneous
            )
            if (available.length > 0) days.push({ date: ymd })
          }
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }

      return reply.status(200).send({ success: true, data: { days } })
    } catch (error) {
      logger.error('Erro ao buscar dias disponíveis:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar dias disponíveis',
      })
    }
  })

  // GET - Marcadores de calendário (fechado / laser / crio)
  app.get('/schedule/day-markers', async (request, reply) => {
    logger.route('GET', '/schedule/day-markers')

    try {
      const { from, to } = request.query as { from?: string; to?: string }
      if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return reply.status(400).send({
          success: false,
          error: 'from e to são obrigatórios (YYYY-MM-DD)',
        })
      }

      await ensureCurrentAndNextOccurrences()

      const fromDate = ymdToDate(from)
      const toDate = ymdToDate(to)

      const [schedules, overrides, occurrences] = await Promise.all([
        prisma.managerSchedule.findMany(),
        prisma.scheduleOverride.findMany({
          where: { date: { gte: fromDate, lte: toDate } },
        }),
        prisma.machineRentalOccurrence.findMany({
          where: {
            date: { gte: fromDate, lte: toDate },
            status: {
              in: [
                MachineRentalStatus.HELD,
                MachineRentalStatus.RELEASED,
                MachineRentalStatus.DONE,
              ],
            },
          },
        }),
      ])

      const scheduleByDow = new Map(schedules.map((s) => [s.dayOfWeek, s]))
      const overrideByYmd = new Map(overrides.map((o) => [dateToYmd(o.date), o]))
      const markersByYmd = new Map<string, Array<'LASER' | 'CRYO'>>()

      for (const occ of occurrences) {
        const ymd = dateToYmd(occ.date)
        const list = markersByYmd.get(ymd) || []
        list.push(occ.kind)
        markersByYmd.set(ymd, list)
      }

      const days: Array<{
        date: string
        closed: boolean
        closedReason?: string
        markers: Array<'LASER' | 'CRYO'>
        laserExclusive: boolean
        released: { LASER: boolean; CRYO: boolean }
      }> = []

      const cursor = new Date(fromDate)
      const end = new Date(toDate)
      while (cursor.getTime() <= end.getTime()) {
        const ymd = dateToYmd(cursor)
        const dow = cursor.getUTCDay()
        const override = overrideByYmd.get(ymd)
        let closed = false
        let closedReason: string | undefined

        if (override) {
          closed = !override.isAvailable
          closedReason = override.reason || (closed ? 'Dia indisponível' : undefined)
        } else {
          const schedule = scheduleByDow.get(dow)
          if (!schedule || !schedule.isAvailable) {
            closed = true
            closedReason = 'Dia não atende'
          }
        }

        const markers = markersByYmd.get(ymd) || []
        const laserExclusive = markers.includes('LASER')
        const released = {
          LASER: occurrences.some(
            (o) => dateToYmd(o.date) === ymd && o.kind === 'LASER' && o.status === 'RELEASED'
          ),
          CRYO: occurrences.some(
            (o) => dateToYmd(o.date) === ymd && o.kind === 'CRYO' && o.status === 'RELEASED'
          ),
        }

        days.push({
          date: ymd,
          closed,
          closedReason,
          markers,
          laserExclusive,
          released,
        })

        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }

      return reply.status(200).send({ success: true, data: { days } })
    } catch (error) {
      logger.error('Erro ao buscar day-markers:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar marcadores do calendário',
      })
    }
  })
}

