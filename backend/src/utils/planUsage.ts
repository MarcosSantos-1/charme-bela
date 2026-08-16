import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { addMonths, parseYearMonth, spTodayYmd } from './machineRental'
import { wallClockYearMonth, wallClockYmd } from './wallClock'

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export async function buildRemainingByMonth(userId: string, maxPerMonth: number) {
  const current = parseYearMonth(spTodayYmd())
  const next = addMonths(current.year, current.month, 1)
  const usages = await prisma.monthlyUsage.findMany({
    where: {
      userId,
      OR: [
        { month: current.month, year: current.year },
        { month: next.month, year: next.year },
      ],
    },
  })
  const used = (year: number, month: number) =>
    usages.find((row) => row.year === year && row.month === month)?.totalTreatments || 0

  const thisMonth = Math.max(0, maxPerMonth - used(current.year, current.month))
  const nextMonth = Math.max(0, maxPerMonth - used(next.year, next.month))
  const thisMonthKey = monthKey(current.year, current.month)
  const nextMonthKey = monthKey(next.year, next.month)

  return {
    thisMonth,
    byMonth: {
      [thisMonthKey]: thisMonth,
      [nextMonthKey]: nextMonth,
    } as Record<string, number>,
  }
}

export async function incrementMonthlyUsage(
  userId: string,
  appointmentDate: Date,
  tx: Prisma.TransactionClient = prisma
) {
  const { year, month } = wallClockYearMonth(appointmentDate)
  await tx.monthlyUsage.upsert({
    where: { userId_month_year: { userId, month, year } },
    create: {
      userId,
      month,
      year,
      totalTreatments: 1,
      facialTreatments: 0,
      weeklyUsage: {},
    },
    update: {
      totalTreatments: { increment: 1 },
    },
  })
}

export async function decrementMonthlyUsage(
  userId: string,
  appointmentDate: Date,
  tx: Prisma.TransactionClient = prisma
) {
  const { year, month } = wallClockYearMonth(appointmentDate)
  const monthlyUsage = await tx.monthlyUsage.findUnique({
    where: { userId_month_year: { userId, month, year } },
  })
  if (monthlyUsage && monthlyUsage.totalTreatments > 0) {
    await tx.monthlyUsage.update({
      where: { id: monthlyUsage.id },
      data: { totalTreatments: monthlyUsage.totalTreatments - 1 },
    })
  }
}

export async function countSubscriptionAppointmentsOnDay(
  userId: string,
  appointmentDate: Date,
  tx: Prisma.TransactionClient = prisma,
  excludeAppointmentId?: string
) {
  const ymd = wallClockYmd(appointmentDate)
  const dayStart = new Date(`${ymd}T00:00:00.000Z`)
  const dayEnd = new Date(`${ymd}T23:59:59.999Z`)
  return tx.appointment.count({
    where: {
      userId,
      origin: 'SUBSCRIPTION',
      status: { not: 'CANCELED' },
      startTime: { gte: dayStart, lte: dayEnd },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
  })
}

export class PlanQuotaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanQuotaError'
  }
}

export async function assertSubscriptionCapacity(
  userId: string,
  appointmentDate: Date,
  maxPerMonth: number,
  tx: Prisma.TransactionClient = prisma,
  options?: { excludeAppointmentId?: string; skipMonthCheck?: boolean }
) {
  if (!options?.skipMonthCheck) {
    const { year, month } = wallClockYearMonth(appointmentDate)
    const monthlyUsage = await tx.monthlyUsage.findUnique({
      where: { userId_month_year: { userId, month, year } },
    })
    if (monthlyUsage && monthlyUsage.totalTreatments >= maxPerMonth) {
      throw new PlanQuotaError(
        `Limite mensal de ${maxPerMonth} tratamentos atingido para ${month}/${year}`
      )
    }
  }

  const appointmentsOnDay = await countSubscriptionAppointmentsOnDay(
    userId,
    appointmentDate,
    tx,
    options?.excludeAppointmentId
  )
  if (appointmentsOnDay >= 3) {
    throw new PlanQuotaError('Limite de 3 tratamentos por dia atingido')
  }
}
