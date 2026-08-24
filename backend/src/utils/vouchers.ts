import { Prisma, type PrismaClient, type Voucher } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from './logger'

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED'] as const

type Tx = Prisma.TransactionClient | PrismaClient

type VoucherLike = {
  type: string
  discountAmount?: number | null
  discountPercent?: number | null
  remainingAmount?: number | null
  isUsed?: boolean
  expiresAt?: Date | null
  anyService?: boolean
  serviceId?: string | null
}

export class VoucherUnavailableError extends Error {
  constructor(message = 'Voucher indisponível') {
    super(message)
    this.name = 'VoucherUnavailableError'
  }
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

export function computeVoucherDiscount(
  voucher: VoucherLike,
  price: number,
  catalogServiceId: string,
): { finalPrice: number; appliedDiscount: number } {
  if (voucher.type === 'FREE_MONTH') {
    throw new VoucherUnavailableError('Voucher de mês grátis não pode ser usado em agendamentos')
  }

  if (voucher.type === 'FREE_TREATMENT') {
    if (!(voucher.anyService || voucher.serviceId === catalogServiceId)) {
      throw new VoucherUnavailableError('Voucher não é válido para este serviço')
    }
    return { finalPrice: 0, appliedDiscount: price }
  }

  if (voucher.type === 'DISCOUNT') {
    let appliedDiscount = 0
    if (voucher.discountPercent) {
      appliedDiscount = price * (voucher.discountPercent / 100)
    } else if (voucher.discountAmount) {
      appliedDiscount = Math.min(creditBalance(voucher), price)
    }
    return {
      appliedDiscount,
      finalPrice: Math.max(0, price - appliedDiscount),
    }
  }

  throw new VoucherUnavailableError('Tipo de voucher inválido')
}

/** Valida voucher (dono, validade, hold, serviço) e calcula o desconto. Não consome. */
export async function assertVoucherUsable(params: {
  voucherId: string
  userId: string
  serviceId: string
  price: number
}): Promise<{ voucher: Voucher; finalPrice: number; appliedDiscount: number }> {
  const voucher = await prisma.voucher.findUnique({ where: { id: params.voucherId } })
  if (!voucher) {
    throw new VoucherUnavailableError('Voucher não encontrado')
  }
  if (voucher.userId !== params.userId) {
    throw new VoucherUnavailableError('Voucher não pertence a este usuário')
  }
  if (voucher.isUsed && !(isAmountCreditVoucher(voucher) && creditBalance(voucher) > 0.009)) {
    throw new VoucherUnavailableError('Voucher já foi utilizado')
  }
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    throw new VoucherUnavailableError('Voucher expirado')
  }
  if (!isAmountCreditVoucher(voucher)) {
    if (await voucherHasActiveHold(voucher.id)) {
      throw new VoucherUnavailableError(
        'Este voucher está suspenso em outro agendamento. Conclua o pagamento ou cancele a reserva para usá-lo novamente.',
      )
    }
    if (await voucherConsumedByPackage(voucher.id)) {
      throw new VoucherUnavailableError('Voucher já foi utilizado em um pacote')
    }
  }

  const { finalPrice, appliedDiscount } = computeVoucherDiscount(voucher, params.price, params.serviceId)
  return { voucher, finalPrice, appliedDiscount }
}

/** Trava o voucher na transação e recalcula o desconto (crédito pode ter mudado). */
export async function lockVoucherForApply(
  tx: Tx,
  voucherId: string,
  price: number,
  catalogServiceId: string,
): Promise<{ appliedDiscount: number; finalPrice: number }> {
  const locked = await tx.voucher.findUnique({ where: { id: voucherId } })
  if (!locked) {
    throw new VoucherUnavailableError('Voucher não encontrado')
  }
  if (locked.expiresAt && locked.expiresAt < new Date()) {
    throw new VoucherUnavailableError('Voucher expirado')
  }
  if (isAmountCreditVoucher(locked)) {
    const remaining = creditBalance(locked)
    if (remaining <= 0.009) {
      throw new VoucherUnavailableError('Crédito esgotado')
    }
    const appliedDiscount = Math.min(remaining, price)
    return { appliedDiscount, finalPrice: Math.max(0, price - appliedDiscount) }
  }

  if (locked.isUsed) {
    throw new VoucherUnavailableError('Voucher já foi utilizado')
  }
  const held = await voucherHasActiveHold(voucherId, tx)
  if (held) {
    throw new VoucherUnavailableError(
      'Este voucher está suspenso em outro agendamento. Conclua o pagamento ou cancele a reserva.',
    )
  }
  if (await voucherConsumedByPackage(voucherId, tx)) {
    throw new VoucherUnavailableError('Voucher já foi utilizado em um pacote')
  }
  return computeVoucherDiscount(locked, price, catalogServiceId)
}

/** Debita crédito ou marca voucher como usado — na mesma transação do create. */
export async function debitLockedVoucher(
  tx: Tx,
  voucherId: string,
  appliedDiscount: number,
): Promise<void> {
  const locked = await tx.voucher.findUnique({ where: { id: voucherId } })
  if (!locked) return
  if (isAmountCreditVoucher(locked)) {
    const next = Number((creditBalance(locked) - appliedDiscount).toFixed(2))
    await tx.voucher.update({
      where: { id: voucherId },
      data: {
        remainingAmount: Math.max(0, next),
        isUsed: next <= 0.009,
        usedAt: next <= 0.009 ? new Date() : null,
      },
    })
    return
  }
  await tx.voucher.update({
    where: { id: voucherId },
    data: { isUsed: true, usedAt: new Date() },
  })
}

/**
 * Garante consumo do voucher de um pacote (idempotente).
 * Cobre o caso em que o desconto entrou no pricePaid mas o débito não persistiu —
 * o voucher continuava disponível para outros pacotes.
 */
export async function ensureVoucherConsumedForPackage(
  voucherId: string | null | undefined,
  amountApplied?: number | null,
): Promise<void> {
  if (!voucherId) return
  const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } })
  if (!voucher) return

  if (isAmountCreditVoucher(voucher)) {
    const applied = Number(amountApplied || 0)
    if (applied <= 0.009) return
    const remaining = creditBalance(voucher)
    const original = Number(voucher.discountAmount || 0)
    const alreadyDebited =
      voucher.remainingAmount != null && remaining <= Number((original - applied + 0.05).toFixed(2))
    if (alreadyDebited) {
      if (remaining <= 0.009) await markVoucherUsed(voucherId)
      return
    }
    await debitLockedVoucher(prisma, voucherId, applied)
    logger.success(`🎫 Crédito ${voucherId} debitado no pacote: R$ ${applied.toFixed(2)}`)
    return
  }

  if (!voucher.isUsed) {
    await markVoucherUsed(voucherId)
  }
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
      await tx.packagePurchase.updateMany({
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

/** Pacote não cancelado já usou este voucher (pago ou ainda pendente). */
export async function voucherConsumedByPackage(voucherId: string, db: Tx = prisma): Promise<boolean> {
  const purchaseCount = await db.packagePurchase.count({
    where: {
      voucherId,
      status: { notIn: ['CANCELED', 'REFUNDED'] },
    },
  })
  return purchaseCount > 0
}

/** Há agendamento ou compra de pacote pendente segurando este voucher? */
export async function voucherHasActiveHold(voucherId: string, db: Tx = prisma): Promise<boolean> {
  const appointmentCount = await db.appointment.count({
    where: {
      voucherId,
      status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
    },
  })
  if (appointmentCount > 0) return true
  const purchaseCount = await db.packagePurchase.count({
    where: {
      voucherId,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    },
  })
  return purchaseCount > 0
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
  db: Tx = prisma,
): Promise<void> {
  if (!voucherId) return

  const voucher = await db.voucher.findUnique({ where: { id: voucherId } })
  if (!voucher) return

  if (isAmountCreditVoucher(voucher) && amountApplied && amountApplied > 0) {
    const next = Number((creditBalance(voucher) + amountApplied).toFixed(2))
    await db.voucher.update({
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

  const stillHeld = await voucherHasActiveHold(voucherId, db)
  if (stillHeld) {
    logger.info(`🎫 Voucher ${voucherId} ainda vinculado a outro agendamento ativo — não liberado`)
    return
  }

  await db.voucher.update({
    where: { id: voucherId },
    data: {
      isUsed: false,
      usedAt: null,
    },
  })
  logger.success(`🎫 Voucher ${voucherId} liberado após cancelamento`)
}
