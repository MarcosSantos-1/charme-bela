import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'

export type PackageItemSnapshot = {
  serviceId: string
  name: string
  durationMinutes: number
  category: string
  sortOrder: number
}

export const PACKAGE_SERVICE_INCLUDE = {
  packageItems: {
    include: {
      includedService: {
        select: {
          id: true,
          name: true,
          category: true,
          duration: true,
          isActive: true,
          machineKind: true,
        },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.ServiceInclude

export const PACKAGE_PURCHASE_INCLUDE = {
  packageService: {
    include: PACKAGE_SERVICE_INCLUDE,
  },
  appointments: {
    include: {
      service: true,
    },
    orderBy: { packageSessionIndex: 'asc' as const },
  },
} satisfies Prisma.PackagePurchaseInclude

type Tx = Prisma.TransactionClient | PrismaClient

export function remainingSessions(purchase: { sessionCount: number; sessionsScheduled: number }) {
  return Math.max(0, purchase.sessionCount - purchase.sessionsScheduled)
}

export function isPackageService(service: { category: string; packageSessionCount?: number | null }) {
  return service.category === 'COMBO'
}

export function snapshotFromItems(
  items: Array<{
    includedServiceId: string
    durationMinutes: number
    sortOrder: number
    includedService: { name: string; category: string }
  }>,
): PackageItemSnapshot[] {
  return items.map((item) => ({
    serviceId: item.includedServiceId,
    name: item.includedService.name,
    durationMinutes: item.durationMinutes,
    category: item.includedService.category,
    sortOrder: item.sortOrder,
  }))
}

export function durationFromItems(items: Array<{ durationMinutes: number }>) {
  return items.reduce((sum, item) => sum + item.durationMinutes, 0)
}

export class PackageError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'PackageError'
    this.statusCode = statusCode
  }
}

export async function loadPackageService(serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: PACKAGE_SERVICE_INCLUDE,
  })
  if (!service) {
    throw new PackageError('Pacote não encontrado', 404)
  }
  if (service.category !== 'COMBO') {
    throw new PackageError('Este serviço não é um pacote')
  }
  if (!service.packageSessionCount || service.packageSessionCount < 1) {
    throw new PackageError('Pacote sem número de sessões configurado')
  }
  if (service.packageItems.length === 0) {
    throw new PackageError('Pacote sem procedimentos inclusos')
  }
  return service
}

export async function findActivePurchase(userId: string, packageServiceId: string) {
  return prisma.packagePurchase.findFirst({
    where: {
      userId,
      packageServiceId,
      status: { in: ['PENDING', 'ACTIVE'] },
      paymentStatus: { in: ['PENDING', 'PAID'] },
    },
    include: PACKAGE_PURCHASE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

export async function findPaidActivePurchase(userId: string, packageServiceId: string) {
  return prisma.packagePurchase.findFirst({
    where: {
      userId,
      packageServiceId,
      status: 'ACTIVE',
      paymentStatus: 'PAID',
    },
    include: PACKAGE_PURCHASE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

export function refreshPurchaseStatus(purchase: {
  sessionCount: number
  sessionsScheduled: number
  paymentStatus: string
  status: string
}): 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'REFUNDED' {
  if (purchase.status === 'CANCELED' || purchase.status === 'REFUNDED') {
    return purchase.status
  }
  if (purchase.paymentStatus !== 'PAID') {
    return 'PENDING'
  }
  return remainingSessions(purchase) === 0 ? 'COMPLETED' : 'ACTIVE'
}

export async function releaseSessionOnCancel(tx: Tx, appointment: {
  id: string
  packagePurchaseId: string | null
  status: string
}) {
  if (!appointment.packagePurchaseId) return
  if (appointment.status === 'CANCELED' || appointment.status === 'NO_SHOW') return
  if (appointment.status === 'COMPLETED') return

  const purchase = await tx.packagePurchase.findUnique({
    where: { id: appointment.packagePurchaseId },
  })
  if (!purchase) return
  if (purchase.status === 'CANCELED' || purchase.status === 'REFUNDED') return

  const nextScheduled = Math.max(0, purchase.sessionsScheduled - 1)
  const nextStatus = refreshPurchaseStatus({
    ...purchase,
    sessionsScheduled: nextScheduled,
  })

  await tx.packagePurchase.update({
    where: { id: purchase.id },
    data: {
      sessionsScheduled: nextScheduled,
      status: nextStatus,
    },
  })
}

export async function cancelUnpaidPackagePurchase(tx: Tx, purchaseId: string, cancelReason: string) {
  const purchase = await tx.packagePurchase.findUnique({
    where: { id: purchaseId },
    include: { appointments: true },
  })
  if (!purchase) return
  if (purchase.paymentStatus === 'PAID') return

  await tx.packagePurchase.update({
    where: { id: purchaseId },
    data: {
      status: 'CANCELED',
      paymentStatus: 'FAILED',
      paymentExpiresAt: null,
    },
  })

  const now = new Date()
  for (const appointment of purchase.appointments) {
    if (appointment.status === 'CANCELED') continue
    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'CANCELED',
        canceledBy: 'system',
        canceledAt: now,
        cancelReason,
        paymentExpiresAt: null,
      },
    })
  }
}

export async function markPackagePurchasePaid(
  tx: Tx,
  purchaseId: string,
  paidAmount: number,
  paymentMethod: string = 'credit_card',
) {
  const purchase = await tx.packagePurchase.findUnique({
    where: { id: purchaseId },
    include: { appointments: true },
  })
  if (!purchase) return null

  const nextStatus = remainingSessions(purchase) === 0 ? 'COMPLETED' : 'ACTIVE'

  await tx.packagePurchase.update({
    where: { id: purchaseId },
    data: {
      paymentStatus: 'PAID',
      pricePaid: paidAmount,
      paymentExpiresAt: null,
      status: nextStatus,
    },
  })

  for (const appointment of purchase.appointments) {
    if (appointment.status === 'CANCELED') continue
    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        paymentStatus: 'PAID',
        paymentMethod,
        paymentAmount: appointment.packageSessionIndex === 1 ? paidAmount : 0,
        paymentExpiresAt: null,
      },
    })
  }

  return tx.packagePurchase.findUnique({
    where: { id: purchaseId },
    include: PACKAGE_PURCHASE_INCLUDE,
  })
}

export function nextSessionIndexes(purchase: {
  sessionCount: number
  appointments: Array<{ packageSessionIndex: number | null; status: string }>
}, count: number) {
  const used = new Set(
    purchase.appointments
      .filter((item) => item.status !== 'CANCELED' && item.packageSessionIndex != null)
      .map((item) => item.packageSessionIndex as number),
  )
  const indexes: number[] = []
  for (let i = 1; i <= purchase.sessionCount && indexes.length < count; i++) {
    if (!used.has(i)) indexes.push(i)
  }
  return indexes
}

export async function syncPackageItems(
  serviceId: string,
  items: Array<{ includedServiceId: string; durationMinutes?: number; sortOrder?: number }>,
) {
  if (!items.length) {
    throw new PackageError('Inclua pelo menos um procedimento no pacote')
  }

  const includedIds = items.map((item) => item.includedServiceId)
  const unique = new Set(includedIds)
  if (unique.size !== includedIds.length) {
    throw new PackageError('Procedimento duplicado no pacote')
  }

  const included = await prisma.service.findMany({
    where: { id: { in: includedIds } },
  })
  if (included.length !== includedIds.length) {
    throw new PackageError('Um ou mais procedimentos não foram encontrados', 404)
  }

  for (const service of included) {
    if (isPackageService(service)) {
      throw new PackageError('Um pacote não pode incluir outro pacote')
    }
    if (service.machineKind) {
      throw new PackageError('Pacotes não podem incluir tratamentos de Laser ou Crio')
    }
  }

  const byId = new Map(included.map((service) => [service.id, service]))
  const normalized = items.map((item, index) => {
    const service = byId.get(item.includedServiceId)!
    return {
      includedServiceId: service.id,
      durationMinutes: item.durationMinutes || service.duration,
      sortOrder: item.sortOrder ?? index,
    }
  })

  const duration = durationFromItems(normalized)
  if (duration < 1) {
    throw new PackageError('A duração do pacote precisa ser maior que zero')
  }

  await prisma.packageItem.deleteMany({ where: { packageServiceId: serviceId } })
  await prisma.packageItem.createMany({
    data: normalized.map((item) => ({
      packageServiceId: serviceId,
      includedServiceId: item.includedServiceId,
      durationMinutes: item.durationMinutes,
      sortOrder: item.sortOrder,
    })),
  })

  return prisma.service.update({
    where: { id: serviceId },
    data: { duration },
    include: PACKAGE_SERVICE_INCLUDE,
  })
}
