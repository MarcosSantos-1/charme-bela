import type { Voucher } from './api'

type CreditFields = Pick<
  Voucher,
  'type' | 'discountAmount' | 'discountPercent' | 'remainingAmount' | 'isUsed' | 'expiresAt'
> & { description?: string }

export function isAmountCreditVoucher(voucher: Pick<Voucher, 'type' | 'discountAmount' | 'discountPercent'>): boolean {
  return (
    voucher.type === 'DISCOUNT' &&
    voucher.discountAmount != null &&
    !(Number(voucher.discountPercent) > 0)
  )
}

export function isPackageReschedulePlaceholderVoucher(voucher: {
  type: string
  description?: string | null
}): boolean {
  return voucher.type === 'FREE_TREATMENT' && Boolean(voucher.description?.startsWith('Crédito para reagendar'))
}

export function voucherCreditBalance(voucher: CreditFields): number {
  if (!isAmountCreditVoucher(voucher)) return 0
  if (voucher.remainingAmount != null) return Number(voucher.remainingAmount)
  return voucher.isUsed ? 0 : Number(voucher.discountAmount || 0)
}

export function isVoucherAvailable(voucher: CreditFields): boolean {
  if (isPackageReschedulePlaceholderVoucher(voucher)) return false
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) return false
  if (isAmountCreditVoucher(voucher)) return voucherCreditBalance(voucher) > 0.009
  return !voucher.isUsed
}
