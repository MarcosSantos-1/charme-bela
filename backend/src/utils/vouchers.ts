import { prisma } from '../lib/prisma'
import { logger } from './logger'

const ACTIVE_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED'] as const

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
  await prisma.voucher.update({
    where: { id: voucherId },
    data: {
      isUsed: true,
      usedAt: new Date()
    }
  })
  logger.success(`🎫 Voucher ${voucherId} marcado como usado`)
}

/**
 * Libera voucher quando o agendamento é cancelado sem conclusão.
 * Só libera se não restar outro hold ativo no mesmo voucher.
 */
export async function releaseVoucherOnCancel(voucherId: string | null | undefined): Promise<void> {
  if (!voucherId) return

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
