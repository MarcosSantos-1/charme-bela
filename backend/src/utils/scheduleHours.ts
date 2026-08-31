import { AppointmentStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { dateToYmd, ymdToDate, spTodayYmd } from './machineRental'
import {
  affectedAppointmentInclude,
  type ClinicAffectedAppointment,
} from './clinicCancellations'

export type SchedulePeriod = { start: string; end: string }

export type WeekDayInput = {
  date: string
  isAvailable: boolean
  availableSlots?: SchedulePeriod[]
  useDefault?: boolean
}

export type ManagerDayInput = {
  dayOfWeek: number
  isAvailable: boolean
  availableSlots: SchedulePeriod[]
}

export type ScheduleImpactItem = {
  appointmentId: string
  clientName: string
  serviceName: string
  date: string
  time: string
  reason: string
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

export function isYmd(value: string | undefined): value is string {
  return Boolean(value && YMD_RE.test(value))
}

export function addDaysYmd(ymd: string, days: number): string {
  const date = ymdToDate(ymd)
  date.setUTCDate(date.getUTCDate() + days)
  return dateToYmd(date)
}

export function mondayOfWeek(ymd: string): string {
  const date = ymdToDate(ymd)
  const dow = date.getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  return addDaysYmd(ymd, offset)
}

export function weekDatesFromMonday(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(weekStart, i))
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function normalizeSlots(slots: SchedulePeriod[] | null | undefined): SchedulePeriod[] {
  if (!slots || !Array.isArray(slots)) return []
  return slots
    .filter((slot) => slot && typeof slot.start === 'string' && typeof slot.end === 'string')
    .map((slot) => ({ start: slot.start, end: slot.end }))
}

export function slotsEqual(
  a: SchedulePeriod[] | null | undefined,
  b: SchedulePeriod[] | null | undefined
): boolean {
  const left = normalizeSlots(a)
  const right = normalizeSlots(b)
  if (left.length !== right.length) return false
  return left.every((slot, i) => slot.start === right[i].start && slot.end === right[i].end)
}

export function matchesDefaultSchedule(
  isAvailable: boolean,
  slots: SchedulePeriod[] | null | undefined,
  defaultAvailable: boolean,
  defaultSlots: SchedulePeriod[] | null | undefined
): boolean {
  if (isAvailable !== defaultAvailable) return false
  if (!isAvailable) return true
  return slotsEqual(slots, defaultSlots)
}

export function appointmentFitsPeriods(
  startTime: Date,
  endTime: Date,
  periods: SchedulePeriod[]
): boolean {
  if (!periods.length) return false
  const startMin = timeToMinutes(startTime.toISOString().slice(11, 16))
  const endMin = timeToMinutes(endTime.toISOString().slice(11, 16))
  return periods.some(
    (period) => timeToMinutes(period.start) <= startMin && timeToMinutes(period.end) >= endMin
  )
}

export function impactReason(isAvailable: boolean): string {
  return isAvailable ? 'Horário reduzido pela clínica' : 'Dia fechado pela clínica'
}

export function toImpactItem(
  apt: ClinicAffectedAppointment,
  reason: string
): ScheduleImpactItem {
  return {
    appointmentId: apt.id,
    clientName: apt.user.name,
    serviceName: apt.service.name,
    date: apt.startTime.toISOString().slice(0, 10),
    time: apt.startTime.toISOString().slice(11, 16),
    reason,
  }
}

export async function findActiveAppointmentsOnDate(ymd: string): Promise<ClinicAffectedAppointment[]> {
  const start = ymdToDate(ymd)
  const end = addDaysYmd(ymd, 1)
  const rows = await prisma.appointment.findMany({
    where: {
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      startTime: { gte: start, lt: ymdToDate(end) },
    },
    include: affectedAppointmentInclude,
  })
  return rows as ClinicAffectedAppointment[]
}

export function filterAppointmentsOutsideHours(
  appointments: ClinicAffectedAppointment[],
  isAvailable: boolean,
  slots: SchedulePeriod[]
): Array<ClinicAffectedAppointment & { cancelReason: string }> {
  const periods = isAvailable ? normalizeSlots(slots) : []
  const reason = impactReason(isAvailable)
  return appointments
    .filter((apt) => !appointmentFitsPeriods(apt.startTime, apt.endTime, periods))
    .map((apt) => ({ ...apt, cancelReason: reason }))
}

export async function findManagerScheduleImpact(
  days: ManagerDayInput[]
): Promise<Array<ClinicAffectedAppointment & { cancelReason: string }>> {
  const today = spTodayYmd()
  const [appointments, overrides] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        startTime: { gte: ymdToDate(today) },
      },
      include: affectedAppointmentInclude,
    }),
    prisma.scheduleOverride.findMany({
      where: { date: { gte: ymdToDate(today) } },
      select: { date: true },
    }),
  ])

  const overrideYmds = new Set(overrides.map((row) => dateToYmd(row.date)))
  const byDow = new Map(days.map((day) => [day.dayOfWeek, day]))
  const affected: Array<ClinicAffectedAppointment & { cancelReason: string }> = []

  for (const apt of appointments as ClinicAffectedAppointment[]) {
    const ymd = apt.startTime.toISOString().slice(0, 10)
    if (ymd < today) continue
    if (overrideYmds.has(ymd)) continue

    const day = byDow.get(apt.startTime.getUTCDay())
    if (!day) continue

    const periods = day.isAvailable ? normalizeSlots(day.availableSlots) : []
    if (!appointmentFitsPeriods(apt.startTime, apt.endTime, periods)) {
      affected.push({ ...apt, cancelReason: impactReason(day.isAvailable) })
    }
  }

  return affected
}

export function resolveWeekDayEffective(
  input: WeekDayInput,
  defaultAvailable: boolean,
  defaultSlots: SchedulePeriod[]
): { isAvailable: boolean; availableSlots: SchedulePeriod[]; useDefault: boolean } {
  const useDefault = Boolean(input.useDefault)
  if (useDefault) {
    return {
      isAvailable: defaultAvailable,
      availableSlots: normalizeSlots(defaultSlots),
      useDefault: true,
    }
  }
  return {
    isAvailable: input.isAvailable,
    availableSlots: input.isAvailable ? normalizeSlots(input.availableSlots) : [],
    useDefault: false,
  }
}

type DefaultByDow = Map<number, { isAvailable: boolean; availableSlots: SchedulePeriod[] }>

async function loadDefaultsByDow(): Promise<DefaultByDow> {
  const schedules = await prisma.managerSchedule.findMany()
  return new Map(
    schedules.map((row) => [
      row.dayOfWeek,
      {
        isAvailable: row.isAvailable,
        availableSlots: normalizeSlots(row.availableSlots as SchedulePeriod[]),
      },
    ])
  )
}

function defaultForDow(byDow: DefaultByDow, dow: number) {
  const found = byDow.get(dow)
  return {
    isAvailable: Boolean(found?.isAvailable),
    availableSlots: found?.availableSlots || [],
  }
}

export async function computeWeekImpact(weekStart: string, days: WeekDayInput[]) {
  const monday = mondayOfWeek(weekStart)
  const dates = weekDatesFromMonday(monday)
  const today = spTodayYmd()
  const byDow = await loadDefaultsByDow()
  const inputByDate = new Map(days.map((day) => [day.date, day]))
  const affected: Array<ClinicAffectedAppointment & { cancelReason: string }> = []

  for (const ymd of dates) {
    if (ymd < today) continue
    const dow = ymdToDate(ymd).getUTCDay()
    const defaults = defaultForDow(byDow, dow)
    const input = inputByDate.get(ymd) || {
      date: ymd,
      isAvailable: defaults.isAvailable,
      availableSlots: defaults.availableSlots,
      useDefault: true,
    }
    const effective = resolveWeekDayEffective(input, defaults.isAvailable, defaults.availableSlots)
    const appointments = await findActiveAppointmentsOnDate(ymd)
    affected.push(
      ...filterAppointmentsOutsideHours(appointments, effective.isAvailable, effective.availableSlots)
    )
  }

  return affected
}

export async function applyWeekSchedule(weekStart: string, days: WeekDayInput[]) {
  const monday = mondayOfWeek(weekStart)
  const dates = weekDatesFromMonday(monday)
  const today = spTodayYmd()
  const byDow = await loadDefaultsByDow()
  const inputByDate = new Map(days.map((day) => [day.date, day]))

  for (const ymd of dates) {
    if (ymd < today) continue
    const dow = ymdToDate(ymd).getUTCDay()
    const defaults = defaultForDow(byDow, dow)
    const input = inputByDate.get(ymd) || {
      date: ymd,
      isAvailable: defaults.isAvailable,
      availableSlots: defaults.availableSlots,
      useDefault: true,
    }
    const effective = resolveWeekDayEffective(input, defaults.isAvailable, defaults.availableSlots)
    const targetDate = ymdToDate(ymd)
    const matchesDefault = matchesDefaultSchedule(
      effective.isAvailable,
      effective.availableSlots,
      defaults.isAvailable,
      defaults.availableSlots
    )

    if (effective.useDefault || matchesDefault) {
      await prisma.scheduleOverride.deleteMany({ where: { date: targetDate } })
      continue
    }

    await prisma.scheduleOverride.upsert({
      where: { date: targetDate },
      update: {
        isAvailable: effective.isAvailable,
        availableSlots: effective.isAvailable ? effective.availableSlots : [],
        reason: effective.isAvailable ? 'Horário personalizado' : 'Folga',
      },
      create: {
        date: targetDate,
        isAvailable: effective.isAvailable,
        availableSlots: effective.isAvailable ? effective.availableSlots : [],
        reason: effective.isAvailable ? 'Horário personalizado' : 'Folga',
      },
    })
  }
}

export async function applyManagerSchedule(days: ManagerDayInput[]) {
  for (const day of days) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) continue
    await prisma.managerSchedule.upsert({
      where: { dayOfWeek: day.dayOfWeek },
      update: {
        isAvailable: day.isAvailable,
        availableSlots: day.isAvailable ? normalizeSlots(day.availableSlots) : [],
      },
      create: {
        dayOfWeek: day.dayOfWeek,
        isAvailable: day.isAvailable,
        availableSlots: day.isAvailable ? normalizeSlots(day.availableSlots) : [],
      },
    })
  }
}
