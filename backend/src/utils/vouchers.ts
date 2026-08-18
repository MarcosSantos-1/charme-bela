import { prisma } from '../lib/prisma'
import { logger } from './logger'

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED'] as const

type VoucherLike = {
  type: string
  discountAmount?: number | null
  discountPercent?: number | null
  remainingAmount?: number | null
  isUsed?: boolean
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
