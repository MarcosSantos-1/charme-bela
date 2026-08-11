import { prisma } from '../lib/prisma'
import { assertMachineBookingAllowed } from './machineRental'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

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

/**
 * Valida se `startTime` (fake-UTC wall-clock) está na grade de funcionamento.
 * Clientes: ManagerSchedule / ScheduleOverride.
 * ADMIN_CREATED: janela estendida 06:00–21:00 (igual /schedule/admin-slots),
 * mas ainda respeita dias fechados (override / dia não atende).
 */
export async function assertStartTimeOnSchedule(
  startTime: Date,
  serviceDurationMinutes: number,
  options: { adminExtended?: boolean; machineKind?: string | null } = {}
): Promise<{ ok: true } | { ok: false; error: string }> {
  const date = startTime.toISOString().slice(0, 10) // YYYY-MM-DD
  const time = startTime.toISOString().slice(11, 16) // HH:MM
  const dayOfWeek = startTime.getUTCDay()
  const targetDate = new Date(`${date}T00:00:00.000Z`)

  const machineCheck = await assertMachineBookingAllowed(
    (options.machineKind as 'LASER' | 'CRYO' | null | undefined) ?? null,
    date
  )
  if (!machineCheck.ok) return machineCheck

  const config = await prisma.systemConfig.findFirst()
  const slotDuration = config?.slotDuration || 30

  const override = await prisma.scheduleOverride.findUnique({
    where: { date: targetDate }
  })

  let periods: Array<{ start: string; end: string }> = []

  if (override) {
    if (!override.isAvailable) {
      return { ok: false, error: override.reason || 'Dia indisponível para agendamentos' }
    }
    periods = (override.availableSlots as Array<{ start: string; end: string }>) || []
  } else {
    const managerSchedule = await prisma.managerSchedule.findUnique({
      where: { dayOfWeek }
    })
    if (!managerSchedule || !managerSchedule.isAvailable) {
      return { ok: false, error: 'A clínica não atende neste dia da semana' }
    }
    periods = (managerSchedule.availableSlots as Array<{ start: string; end: string }>) || []
  }

  // Admin: grade estendida 06–21, mas o dia precisa estar aberto
  if (options.adminExtended) {
    periods = [{ start: '06:00', end: '21:00' }]
  }

  if (periods.length === 0) {
    return { ok: false, error: 'Não há horários de atendimento configurados para esta data' }
  }

  let candidates: string[] = []
  for (const period of periods) {
    candidates = [
      ...candidates,
      ...generateSlotStarts(period.start, period.end, slotDuration, serviceDurationMinutes)
    ]
  }
  candidates = Array.from(new Set(candidates))

  if (!candidates.includes(time)) {
    return {
      ok: false,
      error: `Horário ${time} inválido para este serviço nesta data. Escolha um horário da grade disponível.`
    }
  }

  return { ok: true }
}
