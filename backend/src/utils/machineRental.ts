import {
  MachineKind,
  MachineRentalDefaultRule,
  MachineRentalStatus,
  type MachineRentalOccurrence,
  type MachineRentalSettings,
} from '@prisma/client'
import { prisma } from '../lib/prisma'
import { wallClockNowAsStoredUtc } from './wallClock'

/** YYYY-MM-DD em America/Sao_Paulo. */
export function spTodayYmd(now: Date = new Date()): string {
  return now
    .toLocaleString('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .split(',')[0]
}

export function dateToYmd(date: Date): string {
  // Datas @db.Date e wall-clock: usar UTC date parts
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`)
}

export function parseYearMonth(ymdOrNow?: string): { year: number; month: number } {
  const ymd = ymdOrNow ?? spTodayYmd()
  const [y, m] = ymd.split('-').map(Number)
  return { year: y, month: m }
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

/** Última ocorrência de `weekday` (0=dom … 6=sáb) no mês. */
export function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(Date.UTC(year, month, 0)) // último dia do mês
  const day = lastDay.getUTCDay()
  const diff = (day - weekday + 7) % 7
  lastDay.setUTCDate(lastDay.getUTCDate() - diff)
  return lastDay
}

/** N-ésima ocorrência de `weekday` no mês (1-based). */
export function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): Date {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const firstDow = first.getUTCDay()
  const offset = (weekday - firstDow + 7) % 7
  const day = 1 + offset + (n - 1) * 7
  return new Date(Date.UTC(year, month - 1, day))
}

export function dateFromDefaultRule(
  year: number,
  month: number,
  rule: MachineRentalDefaultRule
): Date {
  switch (rule) {
    case MachineRentalDefaultRule.LAST_THURSDAY:
      return lastWeekdayOfMonth(year, month, 4)
    case MachineRentalDefaultRule.SECOND_SATURDAY:
      return nthWeekdayOfMonth(year, month, 6, 2)
    default:
      return lastWeekdayOfMonth(year, month, 4)
  }
}

export async function ensureMachineRentalSettings(): Promise<MachineRentalSettings[]> {
  const defaults: Array<{
    kind: MachineKind
    defaultRule: MachineRentalDefaultRule
    exclusiveDay: boolean
  }> = [
    {
      kind: MachineKind.LASER,
      defaultRule: MachineRentalDefaultRule.LAST_THURSDAY,
      exclusiveDay: true,
    },
    {
      kind: MachineKind.CRYO,
      defaultRule: MachineRentalDefaultRule.SECOND_SATURDAY,
      exclusiveDay: false,
    },
  ]

  for (const d of defaults) {
    await prisma.machineRentalSettings.upsert({
      where: { kind: d.kind },
      update: {},
      create: {
        kind: d.kind,
        defaultRule: d.defaultRule,
        exclusiveDay: d.exclusiveDay,
        suggestedReleaseDaysBefore: 14,
        lateCancelHours: 24,
        lateCancelFeePercent: 25,
      },
    })
  }

  return prisma.machineRentalSettings.findMany({ orderBy: { kind: 'asc' } })
}

/**
 * Garante ocorrências HELD para mês atual + próximo (se ainda não existirem
 * e não tiverem sido canceladas/criadas).
 */
export async function ensureCurrentAndNextOccurrences(): Promise<MachineRentalOccurrence[]> {
  const settings = await ensureMachineRentalSettings()
  await finalizePastReleasedOccurrences()

  const today = parseYearMonth()
  const months = [today, addMonths(today.year, today.month, 1)]

  for (const settingsRow of settings) {
    for (const { year, month } of months) {
      const existing = await prisma.machineRentalOccurrence.findUnique({
        where: {
          kind_year_month: { kind: settingsRow.kind, year, month },
        },
      })
      if (existing) continue

      const date = dateFromDefaultRule(year, month, settingsRow.defaultRule)
      await prisma.machineRentalOccurrence.create({
        data: {
          kind: settingsRow.kind,
          year,
          month,
          date,
          status: MachineRentalStatus.HELD,
        },
      })
    }
  }

  return prisma.machineRentalOccurrence.findMany({
    where: {
      OR: months.map(({ year, month }) => ({ year, month })),
    },
    include: { banner: true },
    orderBy: [{ year: 'asc' }, { month: 'asc' }, { kind: 'asc' }],
  })
}

/** Marca ocorrências RELEASED cujo dia já passou como DONE e desativa banner. */
export async function finalizePastReleasedOccurrences(now: Date = new Date()): Promise<number> {
  const todayYmd = spTodayYmd(now)
  const todayDate = ymdToDate(todayYmd)

  const past = await prisma.machineRentalOccurrence.findMany({
    where: {
      status: MachineRentalStatus.RELEASED,
      date: { lt: todayDate },
    },
    include: { banner: true },
  })

  for (const occ of past) {
    await prisma.$transaction(async (tx) => {
      await tx.machineRentalOccurrence.update({
        where: { id: occ.id },
        data: { status: MachineRentalStatus.DONE },
      })
      if (occ.banner) {
        await tx.banner.update({
          where: { id: occ.banner.id },
          data: { isActive: false },
        })
      }
    })
  }

  return past.length
}

export function machineLinkPath(kind: MachineKind): string {
  return `/servicos?machine=${kind}`
}

export async function getReleasedMachineKinds(): Promise<Set<MachineKind>> {
  await finalizePastReleasedOccurrences()
  const rows = await prisma.machineRentalOccurrence.findMany({
    where: { status: MachineRentalStatus.RELEASED },
    select: { kind: true },
  })
  return new Set(rows.map((r) => r.kind))
}

export async function getOccurrenceForDate(
  kind: MachineKind,
  ymd: string
): Promise<MachineRentalOccurrence | null> {
  return prisma.machineRentalOccurrence.findFirst({
    where: {
      kind,
      date: ymdToDate(ymd),
      status: { in: [MachineRentalStatus.HELD, MachineRentalStatus.RELEASED] },
    },
  })
}

export async function getExclusiveLaserDatesInRange(
  fromYmd: string,
  toYmd: string
): Promise<string[]> {
  const rows = await prisma.machineRentalOccurrence.findMany({
    where: {
      kind: MachineKind.LASER,
      status: { in: [MachineRentalStatus.HELD, MachineRentalStatus.RELEASED] },
      date: {
        gte: ymdToDate(fromYmd),
        lte: ymdToDate(toYmd),
      },
    },
  })
  return rows.map((r) => dateToYmd(r.date))
}

export async function isLaserExclusiveDate(ymd: string): Promise<boolean> {
  const occ = await prisma.machineRentalOccurrence.findFirst({
    where: {
      kind: MachineKind.LASER,
      date: ymdToDate(ymd),
      status: { in: [MachineRentalStatus.HELD, MachineRentalStatus.RELEASED, MachineRentalStatus.DONE] },
    },
  })
  // DONE no mesmo dia ainda é exclusivo se for "hoje"; past DONE doesn't need block for booking past
  if (!occ) return false
  if (occ.status === MachineRentalStatus.CANCELED) return false
  if (occ.status === MachineRentalStatus.DONE && dateToYmd(occ.date) < spTodayYmd()) return false
  return true
}

export async function assertMachineBookingAllowed(
  machineKind: MachineKind | null | undefined,
  ymd: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!machineKind) {
    if (await isLaserExclusiveDate(ymd)) {
      return {
        ok: false,
        error: 'Esta data está reservada para depilação a laser. Escolha outro dia.',
      }
    }
    return { ok: true }
  }

  const occ = await prisma.machineRentalOccurrence.findFirst({
    where: {
      kind: machineKind,
      date: ymdToDate(ymd),
      status: MachineRentalStatus.RELEASED,
    },
  })

  if (!occ) {
    const label = machineKind === MachineKind.LASER ? 'depilação a laser' : 'criolipólise'
    return {
      ok: false,
      error: `Agendamento de ${label} só é permitido no dia liberado pela clínica.`,
    }
  }

  return { ok: true }
}

export async function getLateCancelPolicyForKind(kind: MachineKind): Promise<{
  lateCancelHours: number
  lateCancelFeePercent: number
}> {
  const settings = await prisma.machineRentalSettings.findUnique({ where: { kind } })
  return {
    lateCancelHours: settings?.lateCancelHours ?? 24,
    lateCancelFeePercent: settings?.lateCancelFeePercent ?? 25,
  }
}

/** Horas até o início no referencial wall-clock (mesmo das outras regras). */
export function hoursUntilAppointment(startTime: Date, now: Date = new Date()): number {
  return (startTime.getTime() - wallClockNowAsStoredUtc(now).getTime()) / (1000 * 60 * 60)
}
