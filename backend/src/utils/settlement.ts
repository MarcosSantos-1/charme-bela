import { prisma } from '../lib/prisma'
import { logger } from './logger'
import { refundPaymentWithFallback } from '../lib/asaas'
import { createNotification, notifyVoucherReceived } from './notifications'

export type SettlementChoiceValue = 'REFUND' | 'CREDIT'

export type PaidSingleSettlement = {
  settlementChoice: SettlementChoiceValue | null
  creditVoucher: {
    id: string
    discountAmount: number | null
    remainingAmount: number | null
    expiresAt: Date | null
  } | null
  refunded: boolean
  refundStatus: 'NOT_APPLICABLE' | 'PROCESSING' | 'DONE' | 'MANUAL_REQUIRED'
  refundAmount: number | null
  feeAmount: number | null
  usedNetValue: boolean
}

function brl(value: number) {
  return value.toFixed(2).replace('.', ',')
}

export async function notifyManualRefundRequired(params: {
  appointmentId: string
  clientName: string
  serviceName: string
  amount: number
  asaasPaymentId?: string | null
  errorMessage: string
}) {
  await createNotification({
    userId: null,
    type: 'SYSTEM_MESSAGE',
    title: 'Reembolso Manual Necessário',
    message:
      `${params.clientName} cancelou ${params.serviceName}. ` +
      `Estorno automático de R$ ${brl(params.amount)} falhou` +
      (params.asaasPaymentId ? ` (Asaas ${params.asaasPaymentId})` : ' (sem cobrança Asaas)') +
      `. ${params.errorMessage}`,
    icon: 'ALERT',
    priority: 'URGENT',
    actionUrl: '/admin/agendamentos',
    actionLabel: 'Ver Agendamentos',
    metadata: {
      appointmentId: params.appointmentId,
      paymentId: params.asaasPaymentId,
      amount: params.amount,
    },
  })
}

export async function createReusableCreditVoucher(params: {
  userId: string
  amount: number
  serviceName: string
  monthsValid: number
  grantedReason: string
}) {
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + params.monthsValid)
  const amount = Number(params.amount.toFixed(2))

  const voucher = await prisma.voucher.create({
    data: {
      userId: params.userId,
      type: 'DISCOUNT',
      description: `Crédito de cancelamento - ${params.serviceName}`,
      discountAmount: amount,
      remainingAmount: amount,
      anyService: true,
      expiresAt,
      grantedBy: 'system',
      grantedReason: params.grantedReason,
    },
  })

  await notifyVoucherReceived(params.userId, {
    description: voucher.description,
    type: 'DISCOUNT',
    expiresAt: voucher.expiresAt || undefined,
  })

  return voucher
}

export async function tryAsaasRefund(params: {
  appointmentId: string
  userId: string
  clientName: string
  serviceName: string
  asaasPaymentId: string | null | undefined
  amount: number
  description: string
  allowNetValueFallback: boolean
  feeAmount?: number | null
  lateFeePercent?: number
}): Promise<{
  refunded: boolean
  refundStatus: 'PROCESSING' | 'DONE' | 'MANUAL_REQUIRED'
  refundAmount: number
  usedNetValue: boolean
  error?: string
}> {
  const amount = Number(params.amount.toFixed(2))

  if (!params.asaasPaymentId) {
    const error = 'Agendamento sem cobrança Asaas — estorne manualmente (pagamento na clínica ou registro antigo).'
    await prisma.appointment.update({
      where: { id: params.appointmentId },
      data: {
        refundStatus: 'MANUAL_REQUIRED',
        refundError: error,
        settlementChoice: 'REFUND',
      },
    })
    await notifyManualRefundRequired({
      appointmentId: params.appointmentId,
      clientName: params.clientName,
      serviceName: params.serviceName,
      amount,
      errorMessage: error,
    })
    return { refunded: false, refundStatus: 'MANUAL_REQUIRED', refundAmount: amount, usedNetValue: false, error }
  }

  try {
    const result = await refundPaymentWithFallback(
      params.asaasPaymentId,
      amount,
      params.description,
      { allowNetValueFallback: params.allowNetValueFallback },
    )

    const asaasDone = result.payment.status === 'REFUNDED'
    const refundStatus = asaasDone ? 'DONE' : 'PROCESSING'

    await prisma.appointment.update({
      where: { id: params.appointmentId },
      data: {
        paymentStatus: 'REFUNDED',
        refundStatus,
        refundError: result.usedNetValue
          ? `Estorno líquido (taxas Asaas não retornam): R$ ${brl(result.refundedValue)}`
          : null,
        settlementChoice: 'REFUND',
      },
    })

    const feeMsg =
      params.feeAmount && params.feeAmount > 0
        ? ` Foi aplicada multa de ${params.lateFeePercent}% (R$ ${brl(params.feeAmount)}).`
        : ''
    const timing =
      'Pix volta na hora; cartão pode levar até 10 dias úteis.'

    await createNotification({
      userId: params.userId,
      type: 'PAYMENT_REFUNDED',
      title: 'Reembolso Processado',
      message: `Seu pagamento de R$ ${brl(result.refundedValue)} foi reembolsado.${feeMsg} ${timing}`,
      icon: 'CARD',
      priority: 'HIGH',
      actionUrl: '/cliente/pagamentos',
      actionLabel: 'Ver Pagamentos',
    })

    logger.success(
      `Reembolso Asaas ${params.asaasPaymentId}: R$ ${result.refundedValue}` +
        (result.usedNetValue ? ' (líquido)' : ''),
    )

    return {
      refunded: true,
      refundStatus,
      refundAmount: result.refundedValue,
      usedNetValue: result.usedNetValue,
    }
  } catch (error: any) {
    const message = error?.message || 'Falha no estorno Asaas'
    logger.error(`Estorno Asaas falhou para ${params.appointmentId}: ${message}`)

    await prisma.appointment.update({
      where: { id: params.appointmentId },
      data: {
        refundStatus: 'MANUAL_REQUIRED',
        refundError: message,
        settlementChoice: 'REFUND',
      },
    })

    await notifyManualRefundRequired({
      appointmentId: params.appointmentId,
      clientName: params.clientName,
      serviceName: params.serviceName,
      amount,
      asaasPaymentId: params.asaasPaymentId,
      errorMessage: message,
    })

    return {
      refunded: false,
      refundStatus: 'MANUAL_REQUIRED',
      refundAmount: amount,
      usedNetValue: false,
      error: message,
    }
  }
}

export async function settlePaidSingleCancel(params: {
  appointmentId: string
  userId: string
  clientName: string
  serviceName: string
  asaasPaymentId: string | null | undefined
  paidAmount: number
  isLate: boolean
  isMachineSpecial: boolean
  lateFeePercent: number
  minHours: number
  settlement?: SettlementChoiceValue | null
}): Promise<PaidSingleSettlement | { requiresSettlement: true; paymentAmount: number }> {
  const paidAmount = Number(params.paidAmount.toFixed(2))

  if (params.isMachineSpecial && params.isLate) {
    const feeAmount = Math.round(paidAmount * (params.lateFeePercent / 100) * 100) / 100
    const netRefund = Math.round((paidAmount - feeAmount) * 100) / 100
    const refund = await tryAsaasRefund({
      appointmentId: params.appointmentId,
      userId: params.userId,
      clientName: params.clientName,
      serviceName: params.serviceName,
      asaasPaymentId: params.asaasPaymentId,
      amount: netRefund,
      description: `Cancelamento de ${params.serviceName} (multa ${params.lateFeePercent}%)`,
      allowNetValueFallback: false,
      feeAmount,
      lateFeePercent: params.lateFeePercent,
    })
    return {
      settlementChoice: 'REFUND',
      creditVoucher: null,
      refunded: refund.refunded,
      refundStatus: refund.refundStatus,
      refundAmount: refund.refundAmount,
      feeAmount,
      usedNetValue: refund.usedNetValue,
    }
  }

  if (params.isLate) {
    const voucher = await createReusableCreditVoucher({
      userId: params.userId,
      amount: paidAmount,
      serviceName: params.serviceName,
      monthsValid: 3,
      grantedReason: `Cancelamento com menos de ${params.minHours}h de antecedência. Valor convertido em crédito reutilizável.`,
    })
    await prisma.appointment.update({
      where: { id: params.appointmentId },
      data: {
        settlementChoice: 'CREDIT',
        refundStatus: 'NOT_APPLICABLE',
        refundError: null,
      },
    })
    return {
      settlementChoice: 'CREDIT',
      creditVoucher: voucher,
      refunded: false,
      refundStatus: 'NOT_APPLICABLE',
      refundAmount: null,
      feeAmount: null,
      usedNetValue: false,
    }
  }

  if (params.settlement !== 'REFUND' && params.settlement !== 'CREDIT') {
    return { requiresSettlement: true, paymentAmount: paidAmount }
  }

  if (params.settlement === 'CREDIT') {
    const voucher = await createReusableCreditVoucher({
      userId: params.userId,
      amount: paidAmount,
      serviceName: params.serviceName,
      monthsValid: 6,
      grantedReason: 'Cancelamento com antecedência. Cliente optou por crédito reutilizável.',
    })
    await prisma.appointment.update({
      where: { id: params.appointmentId },
      data: {
        settlementChoice: 'CREDIT',
        refundStatus: 'NOT_APPLICABLE',
        refundError: null,
      },
    })
    return {
      settlementChoice: 'CREDIT',
      creditVoucher: voucher,
      refunded: false,
      refundStatus: 'NOT_APPLICABLE',
      refundAmount: null,
      feeAmount: null,
      usedNetValue: false,
    }
  }

  const refund = await tryAsaasRefund({
    appointmentId: params.appointmentId,
    userId: params.userId,
    clientName: params.clientName,
    serviceName: params.serviceName,
    asaasPaymentId: params.asaasPaymentId,
    amount: paidAmount,
    description: `Cancelamento de ${params.serviceName}`,
    allowNetValueFallback: true,
  })

  return {
    settlementChoice: 'REFUND',
    creditVoucher: null,
    refunded: refund.refunded,
    refundStatus: refund.refundStatus,
    refundAmount: refund.refundAmount,
    feeAmount: null,
    usedNetValue: refund.usedNetValue,
  }
}

export async function retryAppointmentRefund(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { user: true, service: true },
  })
  if (!appointment) {
    throw Object.assign(new Error('Agendamento não encontrado'), { statusCode: 404 })
  }
  if (appointment.refundStatus !== 'MANUAL_REQUIRED') {
    throw Object.assign(new Error('Este agendamento não está marcado para estorno manual'), { statusCode: 400 })
  }
  if (!appointment.paymentAmount) {
    throw Object.assign(new Error('Agendamento sem valor de pagamento'), { statusCode: 400 })
  }

  return tryAsaasRefund({
    appointmentId: appointment.id,
    userId: appointment.userId,
    clientName: appointment.user.name,
    serviceName: appointment.service.name,
    asaasPaymentId: appointment.asaasPaymentId,
    amount: appointment.paymentAmount,
    description: `Estorno manual — ${appointment.service.name}`,
    allowNetValueFallback: true,
  })
}
