import { prisma } from '../lib/prisma'
import { logger } from './logger'

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED'] as const

type VoucherLike = {
  type: string
  discountAmount?: number | null
  discountPercent?: number | null
  remainingAmount?: number | null
  isUsed?: boolean
  expiresAt?: Date | null
}

export function isAmountCreditVoucher(voucher: VoucherLike): boolean {
  return (
    voucher.type === 'DISCOUNT' &&
    voucher.discountAmount != null &&
    !(Number(voucher.discountPercent) > 0)
  )
}

export function creditBalance(voucher: VoucherLike): number {
  if (!isAmountCreditVoucher(voucher)) return 0
  if (voucher.remainingAmount != null) return Number(voucher.remainingAmount)
  return voucher.isUsed ? 0 : Number(voucher.discountAmount || 0)
}

export function isCurrentlyAvailableVoucher(voucher: VoucherLike): boolean {
  if (voucher.expiresAt && voucher.expiresAt < new Date()) return false
  if (isAmountCreditVoucher(voucher)) return creditBalance(voucher) > 0.009
  return !voucher.isUsed
}

export class MergeCreditsError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'MergeCreditsError'
    this.statusCode = statusCode
  }
}

function earliestExpiry(dates: Array<Date | null | undefined>): Date | null {
  const valid = dates.filter((value): value is Date => value instanceof Date)
  if (valid.length === 0) return null
  return valid.reduce((min, date) => (date < min ? date : min))
}

/** Soma saldos de créditos em R$ num único voucher e aponta agendamentos para ele. */
export async function mergeReusableCredits(params: {
  userId: string
  voucherIds: string[]
}) {
  const uniqueIds = [...new Set(params.voucherIds.filter(Boolean))]
  if (uniqueIds.length < 2) {
    throw new MergeCreditsError('Selecione pelo menos dois créditos para unificar')
  }

  return prisma.$transaction(async (tx) => {
    const vouchers = await tx.voucher.findMany({
      where: { id: { in: uniqueIds } },
    })
    if (vouchers.length !== uniqueIds.length) {
      throw new MergeCreditsError('Um dos créditos não foi encontrado')
    }

    for (const voucher of vouchers) {
      if (voucher.userId !== params.userId) {
        throw new MergeCreditsError('Crédito não pertence a este cliente', 403)
      }
      if (!isAmountCreditVoucher(voucher) || creditBalance(voucher) <= 0.009) {
        throw new MergeCreditsError('Só é possível unificar créditos em reais com saldo')
      }
      if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        throw new MergeCreditsError('Um dos créditos já expirou')
      }
    }

    const survivor = [...vouchers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    const others = vouchers.filter((voucher) => voucher.id !== survivor.id)
    const total = Number(vouchers.reduce((sum, voucher) => sum + creditBalance(voucher), 0).toFixed(2))
    const expiresAt = earliestExpiry(vouchers.map((voucher) => voucher.expiresAt))

    const merged = await tx.voucher.update({
      where: { id: survivor.id },
      data: {
        remainingAmount: total,
        discountAmount: total,
        description: 'Crédito unificado',
        grantedReason: `Unificação de ${vouchers.length} créditos`,
        expiresAt,
        anyService: true,
        isUsed: false,
        usedAt: null,
      },
    })

    for (const other of others) {
      await tx.appointment.updateMany({
        where: { voucherId: other.id },
        data: { voucherId: survivor.id },
      })
      await tx.voucher.update({
        where: { id: other.id },
        data: {
          remainingAmount: 0,
          isUsed: true,
          usedAt: new Date(),
          grantedReason: `Unificado no crédito ${survivor.id}`,
        },
      })
    }

    logger.success(`🎫 Créditos unificados em ${survivor.id}: R$ ${total.toFixed(2)}`)
    return merged
  })
}

/** Créditos em R$ com saldo não podem ficar presos em isUsed por um hold parcial. */
export async function repairReusableCredits(userId?: string): Promise<number> {
  const result = await prisma.voucher.updateMany({
    where: {
      type: 'DISCOUNT',
      remainingAmount: { gt: 0 },
      isUsed: true,
      ...(userId ? { userId } : {}),
      OR: [{ discountPercent: null }, { discountPercent: 0 }],
    },
    data: { isUsed: false, usedAt: null },
  })
  if (result.count > 0) {
    logger.info(`🎫 ${result.count} crédito(s) reutilizável(is) reaberto(s) com saldo restante`)
  }
  return result.count
}

/** Há agendamento ativo (pendente/confirmado) segurando este voucher? */
export async function voucherHasActiveHold(voucherId: string): Promise<boolean> {
  const count = await prisma.appointment.count({
    where: {
      voucherId,
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] }
    }
  })
  return count > 0
}

/** Marca voucher como consumido (pagamento aprovado / tratamento concluído). */
export async function markVoucherUsed(voucherId: string): Promise<void> {
  const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } })
  if (!voucher) return

  if (isAmountCreditVoucher(voucher) && creditBalance(voucher) > 0.009) {
    logger.info(`🎫 Crédito ${voucherId} ainda tem saldo R$ ${creditBalance(voucher).toFixed(2)} — não marca usado`)
    return
  }

  await prisma.voucher.update({
    where: { id: voucherId },
    data: {
      isUsed: true,
      usedAt: new Date(),
      ...(isAmountCreditVoucher(voucher) ? { remainingAmount: 0 } : {}),
    }
  })
  logger.success(`🎫 Voucher ${voucherId} marcado como usado`)
}

/**
 * Libera voucher quando o agendamento é cancelado sem conclusão.
 * Crédito em R$: devolve o valor debitado. Outros tipos: volta isUsed=false.
 */
export async function releaseVoucherOnCancel(
  voucherId: string | null | undefined,
  amountApplied?: number | null,
): Promise<void> {
  if (!voucherId) return

  const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } })
  if (!voucher) return

  if (isAmountCreditVoucher(voucher) && amountApplied && amountApplied > 0) {
    const next = Number((creditBalance(voucher) + amountApplied).toFixed(2))
    await prisma.voucher.update({
      where: { id: voucherId },
      data: {
        remainingAmount: next,
        isUsed: next <= 0.009,
        usedAt: next <= 0.009 ? voucher.usedAt : null,
      },
    })
    logger.success(`🎫 Crédito ${voucherId} restaurado: +R$ ${amountApplied.toFixed(2)} (saldo R$ ${next.toFixed(2)})`)
    return
  }

  const stillHeld = await voucherHasActiveHold(voucherId)
  if (stillHeld) {
    logger.info(`🎫 Voucher ${voucherId} ainda vinculado a outro agendamento ativo — não liberado`)
    return
  }

  await prisma.voucher.update({
    where: { id: voucherId },
    data: {
      isUsed: false,
      usedAt: null
    }
  })
  logger.success(`🎫 Voucher ${voucherId} liberado após cancelamento`)
}
