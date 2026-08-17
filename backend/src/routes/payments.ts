import { timingSafeEqual } from 'crypto'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import {
  AsaasError,
  AsaasPayment,
  AsaasSubscription,
  addressFromAnamnesisPersonalData,
  enrichAsaasAddress,
  phoneFromAnamnesisPersonalData,
  cancelPaymentSilent,
  cancelPendingByExternalReference,
  cancelSubscriptionSilent,
  createCreditCardCheckout,
  createCustomer,
  createPayment,
  createPaymentWithCardToken,
  createSubscription,
  extractCardToken,
  getCheckout,
  getPayment,
  getPixQrCode,
  getSubscription,
  isAsaasConfigured,
  isAsaasPaidStatus,
  isCheckoutSessionId,
  listPayments,
  listSubscriptions,
  listSubscriptionPayments,
  mapAsaasBillingType,
  normalizeCpfCnpj,
  normalizeAsaasMobilePhone,
  payChargeWithCardToken,
  pickAsaasPhone,
  refundPayment,
  asaasCustomerEmail,
  toCheckoutPayload,
  updateCustomer,
  updateSubscriptionCreditCard,
} from '../lib/asaas'
import { cancelUnpaidPackagePurchase, markPackagePurchasePaid } from '../utils/packages'
import {
  notifyPaymentSucceeded,
  notifyPaymentFailed,
  notifySubscriptionRenewed,
  notifySubscriptionActivated,
  notifySubscriptionCanceled,
  createNotification,
} from '../utils/notifications'
import {
  applyPlanChange,
  clubSubscriptionReference,
  hasPaidClubSubscription,
  isLikelyUpgradeHistoryPayment,
  isUpgradePaymentLabel,
  parseExternalReference,
  recoverMissedUpgrade,
  syncAsaasSubscriptionPlan,
  upgradeHistoryDescription,
  upgradeReference,
} from '../utils/planChange'

type CheckoutBody = {
  userId?: string
  serviceId: string
  appointmentId?: string
  packagePurchaseId?: string
  customAmount?: number
  customDescription?: string
  cpf?: string
}

function webhookTokensMatch(received: string | undefined, expected: string) {
  if (!received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function resolveUserId(request: FastifyRequest, bodyUserId?: string) {
  const auth = request.authUser
  if (auth?.role === 'CLIENT') {
    if (bodyUserId && bodyUserId !== auth.id) {
      return { error: 'forbidden' as const, userId: null }
    }
    return { error: null, userId: auth.id }
  }
  const userId = bodyUserId || auth?.id
  if (!userId) return { error: 'missing' as const, userId: null }
  return { error: null, userId }
}

async function loadAsaasPayer(userId: string) {
  const form = await prisma.anamnesisForm.findUnique({
    where: { userId },
    select: { personalData: true },
  })
  const address = await enrichAsaasAddress(addressFromAnamnesisPersonalData(form?.personalData))
  const anamnesisPhone = phoneFromAnamnesisPersonalData(form?.personalData)
  return { address, anamnesisPhone }
}

async function ensureAsaasCustomer(
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    cpf: string | null
    asaasCustomerId: string | null
  },
  cpfCnpj: string,
  address?: ReturnType<typeof addressFromAnamnesisPersonalData>,
  phone?: string | null,
) {
  const payer = address === undefined || phone === undefined ? await loadAsaasPayer(user.id) : null
  const resolvedAddress = address === undefined ? payer?.address ?? null : address
  const resolvedPhone =
    pickAsaasPhone(phone, user.phone, payer?.anamnesisPhone) || phone || user.phone || payer?.anamnesisPhone || null
  if (user.asaasCustomerId) {
    await updateCustomer(user.asaasCustomerId, {
      name: user.name,
      email: user.email,
      phone: resolvedPhone,
      cpfCnpj,
      address: resolvedAddress,
    })
    if (user.cpf !== cpfCnpj) {
      await prisma.user.update({ where: { id: user.id }, data: { cpf: cpfCnpj } })
    }
    return user.asaasCustomerId
  }
  const customer = await createCustomer({
    name: user.name,
    email: user.email,
    phone: resolvedPhone,
    cpfCnpj,
    externalReference: user.id,
    address: resolvedAddress,
  })
  await prisma.user.update({
    where: { id: user.id },
    data: { asaasCustomerId: customer.id, cpf: cpfCnpj },
  })
  logger.info(`Customer Asaas criado para ${user.id}`)
  return customer.id
}

async function persistPaymentId(opts: {
  appointmentId?: string | null
  packagePurchaseId?: string | null
  paymentId: string
}) {
  if (opts.packagePurchaseId) {
    await prisma.packagePurchase.update({
      where: { id: opts.packagePurchaseId },
      data: { asaasPaymentId: opts.paymentId },
    })
    await prisma.appointment.updateMany({
      where: { packagePurchaseId: opts.packagePurchaseId, status: 'PENDING', paymentStatus: 'PENDING' },
      data: { asaasPaymentId: opts.paymentId },
    })
    return
  }
  if (opts.appointmentId) {
    await prisma.appointment.update({
      where: { id: opts.appointmentId },
      data: { asaasPaymentId: opts.paymentId },
    })
  }
}

function last4FromAsaas(value?: string | null) {
  const digits = (value || '').replace(/\D/g, '')
  return digits.slice(-4) || null
}

function clientIp(request: FastifyRequest) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0].trim()
  }
  return request.ip || '127.0.0.1'
}

function isCardCapableBilling(billingType?: string | null) {
  return billingType === 'CREDIT_CARD' || billingType === 'DEBIT_CARD'
}

const ASAAS_EMAIL_REQUIRED =
  'Informe um e-mail em Dados pessoais. O Asaas exige esse campo para pagar com cartão.'

function cardKindFromBilling(billingType?: string | null): 'credit' | 'debit' {
  return billingType === 'DEBIT_CARD' ? 'debit' : 'credit'
}

function sanitizeCardNickname(value?: string | null) {
  const nickname = (value || '').trim().slice(0, 40)
  return nickname || null
}

async function creditCardHolderInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, cpf: true },
  })
  if (!user) return null
  const cpfCnpj = normalizeCpfCnpj(user.cpf)
  if (!cpfCnpj) return null
  const payer = await loadAsaasPayer(userId)
  const phone = pickAsaasPhone(payer.anamnesisPhone, user.phone)
  return {
    name: user.name,
    email: user.email,
    cpfCnpj,
    postalCode: payer.address?.postalCode,
    addressNumber: payer.address?.addressNumber,
    addressComplement: payer.address?.complement || null,
    phone,
    mobilePhone: phone,
  }
}

async function syncSubscriptionDefaultCard(opts: {
  userId: string
  asaasToken: string
  remoteIp?: string | null
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId: opts.userId },
    select: { asaasSubscriptionId: true, status: true },
  })
  if (!subscription?.asaasSubscriptionId) return
  if (subscription.status === 'CANCELED') return
  const holder = await creditCardHolderInfo(opts.userId)
  try {
    await updateSubscriptionCreditCard(subscription.asaasSubscriptionId, {
      creditCardToken: opts.asaasToken,
      remoteIp: opts.remoteIp || '127.0.0.1',
      holder,
    })
  } catch (error: any) {
    logger.warning(`Não foi possível atualizar o cartão da assinatura Asaas: ${error.message}`)
    throw error
  }
}

async function ensureCardInvoice(opts: {
  customerId: string
  value: number
  description: string
  externalReference: string
}) {
  const listed = await listPayments({
    customer: opts.customerId,
    externalReference: opts.externalReference,
    limit: 10,
  })
  const pending = (listed.data || []).find(
    (item) =>
      item.billingType === 'CREDIT_CARD' &&
      (item.status === 'PENDING' || item.status === 'OVERDUE') &&
      !item.deleted,
  )
  if (pending?.invoiceUrl) return pending
  return createPayment({
    customer: opts.customerId,
    value: opts.value,
    description: opts.description,
    externalReference: opts.externalReference,
    billingType: 'CREDIT_CARD',
  })
}

async function reuseOrCreateCharge(opts: {
  customerId: string
  value: number
  description: string
  externalReference: string
  existingPaymentId?: string | null
  expiresAt?: Date | null
}) {
  let pix: AsaasPayment | null = null
  if (opts.existingPaymentId) {
    try {
      const existing = await getPayment(opts.existingPaymentId)
      if (existing.status === 'PENDING' || existing.status === 'OVERDUE') {
        pix = existing
      }
    } catch (error: any) {
      logger.warning(`Cobrança Asaas anterior indisponível (${opts.existingPaymentId}): ${error.message}`)
    }
  }

  if (!pix) {
    pix = await createPayment({
      customer: opts.customerId,
      value: opts.value,
      description: opts.description,
      externalReference: opts.externalReference,
      billingType: 'PIX',
    })
  }

  let cardInvoiceUrl: string | null = null
  try {
    const card = await ensureCardInvoice({
      customerId: opts.customerId,
      value: opts.value,
      description: opts.description,
      externalReference: opts.externalReference,
    })
    cardInvoiceUrl = card.invoiceUrl || null
  } catch (error: any) {
    logger.warning(`Fatura de cartão indisponível para ${opts.externalReference}: ${error.message}`)
  }

  return toCheckoutPayload(pix, {
    expiresAt: opts.expiresAt,
    description: opts.description,
    invoiceUrl: cardInvoiceUrl,
  })
}

async function listCardMethods(userId: string) {
  const cards = await prisma.savedCard.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return cards.map((card) => ({
    id: card.id,
    brand: (card.brand || 'card').toLowerCase(),
    last4: card.last4,
    nickname: card.nickname,
    kind: card.kind === 'debit' ? 'debit' : 'credit',
    expMonth: 0,
    expYear: 0,
    isDefault: card.isDefault,
    updatedAt: card.updatedAt.toISOString(),
  }))
}

async function persistSavedCard(payment: AsaasPayment) {
  let token = extractCardToken(payment)
  let last4 = last4FromAsaas(payment.creditCard?.creditCardNumber)
  let brand = (payment.creditCard?.creditCardBrand || '').toLowerCase() || null

  if (!token) {
    try {
      const full = await getPayment(payment.id)
      token = extractCardToken(full)
      last4 = last4FromAsaas(full.creditCard?.creditCardNumber) || last4
      brand = (full.creditCard?.creditCardBrand || '').toLowerCase() || brand
    } catch {
      // segue para a assinatura
    }
  }

  if (!token && payment.subscription) {
    try {
      const subscription = await getSubscription(payment.subscription)
      token = extractCardToken(subscription)
      last4 = last4FromAsaas(subscription.creditCard?.creditCardNumber) || last4
      brand = (subscription.creditCard?.creditCardBrand || '').toLowerCase() || brand
    } catch {
      // tokenização pode estar desligada
    }
  }

  if (!token || !payment.customer) {
    if (payment.billingType === 'CREDIT_CARD' || payment.creditCard) {
      logger.warning(
        `Pagamento ${payment.id} sem token de cartão. No sandbox a tokenização já vem ligada; em produção o gerente Asaas precisa liberar.`,
      )
    }
    return
  }

  const user = await prisma.user.findFirst({
    where: { asaasCustomerId: payment.customer },
    select: { id: true },
  })
  if (!user) return

  const digits = last4 || '****'
  const kind = cardKindFromBilling(payment.billingType)
  const existing = await prisma.savedCard.findFirst({
    where: {
      userId: user.id,
      OR: [
        { asaasToken: token },
        ...(digits !== '****' && brand ? [{ last4: digits, brand }] : []),
      ],
    },
  })

  await prisma.$transaction(async (tx) => {
    const makeDefault = kind === 'credit'
    if (makeDefault) {
      await tx.savedCard.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      })
    }
    if (existing) {
      await tx.savedCard.update({
        where: { id: existing.id },
        data: {
          asaasToken: token!,
          brand,
          last4: digits,
          kind,
          isDefault: makeDefault ? true : existing.isDefault,
        },
      })
      return
    }
    await tx.savedCard.create({
      data: {
        userId: user.id,
        asaasToken: token!,
        brand,
        last4: digits,
        kind,
        isDefault: makeDefault,
      },
    })
  })

  if (kind === 'credit') {
    try {
      await syncSubscriptionDefaultCard({ userId: user.id, asaasToken: token })
    } catch {
      // o cartão já ficou salvo no app; a assinatura Asaas tenta de novo no "usar no débito automático"
    }
  }
}

async function cancelOrphanUnpaidSubscriptions(customerId: string, keepId?: string | null) {
  try {
    const listed = await listSubscriptions({ customer: customerId, limit: 50 })
    for (const subscription of listed.data || []) {
      if (keepId && subscription.id === keepId) continue
      const payments = await listSubscriptionPayments(subscription.id)
      const rows = payments.data || []
      if (rows.some((item) => isAsaasPaidStatus(item.status))) continue
      await cancelSubscriptionSilent(subscription.id)
      for (const item of rows) {
        if (item.status === 'PENDING' || item.status === 'OVERDUE') {
          await cancelPaymentSilent(item.id)
        }
      }
    }
  } catch (error: any) {
    logger.warning(`Não foi possível limpar assinaturas órfãs de ${customerId}: ${error.message}`)
  }
}

function toHistoryItem(payment: AsaasPayment, upgradeOverride = false) {
  const upgrade = upgradeOverride || isUpgradePaymentLabel(payment)
  return {
    id: payment.id,
    type: payment.subscription ? ('subscription' as const) : upgrade ? ('subscription' as const) : ('single' as const),
    amount: payment.value,
    totalAmount: payment.value,
    currency: 'brl',
    status: isAsaasPaidStatus(payment.status)
      ? payment.subscription || upgrade
        ? 'paid'
        : 'succeeded'
      : payment.status === 'REFUNDED' || payment.status === 'REFUND_REQUESTED'
        ? 'refunded'
        : payment.status.toLowerCase(),
    description: upgrade
      ? upgradeHistoryDescription(payment)
      : payment.description || (payment.subscription ? 'Assinatura Charme & Bela Club' : 'Tratamento avulso'),
    paidAt: payment.paymentDate || payment.confirmedDate || null,
    createdAt: payment.dueDate || new Date().toISOString(),
    invoicePdf: null,
    hostedInvoiceUrl: payment.invoiceUrl || null,
    receiptUrl: payment.transactionReceiptUrl || payment.invoiceUrl || null,
  }
}

function isVisibleHistoryStatus(status?: string | null) {
  if (!status) return false
  if (status === 'PENDING' || status === 'OVERDUE' || status === 'DELETED') return false
  return true
}

async function toHistoryItems(payments: AsaasPayment[]) {
  const candidates = payments.filter(
    (payment) => !payment.subscription && !parseExternalReference(payment.externalReference).kind,
  )
  const linked = candidates.length
    ? await prisma.appointment.findMany({
        where: { asaasPaymentId: { in: candidates.map((item) => item.id) } },
        select: { asaasPaymentId: true },
      })
    : []
  const linkedAppointmentIds = new Set(
    linked.map((item) => item.asaasPaymentId).filter((id): id is string => Boolean(id)),
  )
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    select: { price: true, name: true },
  })
  const planPrices = plans.map((plan) => plan.price)
  const planNames = plans.map((plan) => plan.name)
  return payments.map((payment) =>
    toHistoryItem(
      payment,
      isLikelyUpgradeHistoryPayment(payment, { linkedAppointmentIds, planPrices, planNames }),
    ),
  )
}

async function rejectStandaloneCardSave(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = (request.body || {}) as { userId?: string }
    const resolved = resolveUserId(request, body.userId)
    if (resolved.userId) {
      await cancelPendingByExternalReference(`addcard_${resolved.userId}`)
    }
  } catch (error: any) {
    logger.warning(`Não foi possível cancelar cobrança avulsa de cartão: ${error.message}`)
  }
  return reply.status(410).send({
    success: false,
    error: 'O cartão é memorizado no primeiro pagamento. Não cobramos para cadastrar cartão.',
  })
}

async function checkoutPaidStatus(payment: AsaasPayment) {
  if (isAsaasPaidStatus(payment.status)) {
    return {
      paid: true,
      status: payment.status,
      billingType: mapAsaasBillingType(payment.billingType),
      invoiceUrl: payment.invoiceUrl || null,
    }
  }

  let invoiceUrl = isCardCapableBilling(payment.billingType) ? payment.invoiceUrl || null : null
  if (payment.externalReference) {
    try {
      const siblings = await listPayments({
        externalReference: payment.externalReference,
        limit: 20,
      })
      const paidSibling = (siblings.data || []).find((item) => isAsaasPaidStatus(item.status))
      if (paidSibling) {
        return {
          paid: true,
          status: paidSibling.status,
          billingType: mapAsaasBillingType(paidSibling.billingType),
          invoiceUrl: paidSibling.invoiceUrl || invoiceUrl || payment.invoiceUrl || null,
        }
      }
      const card = (siblings.data || []).find(
        (item) =>
          isCardCapableBilling(item.billingType) &&
          (item.status === 'PENDING' || item.status === 'OVERDUE') &&
          item.invoiceUrl,
      )
      if (card?.invoiceUrl) invoiceUrl = card.invoiceUrl
    } catch (error: any) {
      logger.warning(`Não foi possível listar cobranças irmãs de ${payment.id}: ${error.message}`)
    }
  }

  return {
    paid: false,
    status: payment.status,
    billingType: mapAsaasBillingType(payment.billingType),
    invoiceUrl,
  }
}

export async function paymentsRoutes(app: FastifyInstance) {
  app.post('/payments/checkout', async (request, reply) => {
    logger.route('POST', '/payments/checkout')
    try {
      if (!isAsaasConfigured()) {
        return reply.status(503).send({ success: false, error: 'Asaas não configurado (ASAAS_API_KEY)' })
      }

      const body = request.body as CheckoutBody
      const resolved = resolveUserId(request, body.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Você só pode pagar as próprias reservas' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }
      if (!body.serviceId) {
        return reply.status(400).send({ success: false, error: 'serviceId é obrigatório' })
      }

      const user = await prisma.user.findUnique({ where: { id: resolved.userId } })
      if (!user) {
        return reply.status(404).send({ success: false, error: 'Usuário não encontrado' })
      }

      const service = await prisma.service.findUnique({ where: { id: body.serviceId } })
      if (!service) {
        return reply.status(404).send({ success: false, error: 'Serviço não encontrado' })
      }

      let resolvedPackagePurchaseId = body.packagePurchaseId || ''
      let appointmentId = body.appointmentId || ''
      let expiresAt: Date | null = null
      let existingPaymentId: string | null = null

      if (body.packagePurchaseId) {
        const purchase = await prisma.packagePurchase.findUnique({
          where: { id: body.packagePurchaseId },
          include: { appointments: { select: { id: true, status: true, paymentStatus: true } } },
        })
        if (!purchase) {
          return reply.status(404).send({ success: false, error: 'Compra de pacote não encontrada' })
        }
        if (purchase.userId !== user.id && request.authUser?.role !== 'MANAGER') {
          return reply.status(403).send({ success: false, error: 'Pacote de outro cliente' })
        }
        if (purchase.status !== 'PENDING' || purchase.paymentStatus !== 'PENDING') {
          return reply.status(409).send({
            success: false,
            error: 'Esta compra de pacote não está mais aguardando pagamento.',
          })
        }
        appointmentId = purchase.appointments.find((item) => item.status === 'PENDING' && item.paymentStatus === 'PENDING')?.id || appointmentId
        expiresAt = purchase.paymentExpiresAt
        existingPaymentId = purchase.asaasPaymentId
      } else if (body.appointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: body.appointmentId },
          select: {
            status: true,
            paymentStatus: true,
            packagePurchaseId: true,
            paymentExpiresAt: true,
            asaasPaymentId: true,
            userId: true,
          },
        })
        if (!appointment) {
          return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' })
        }
        if (appointment.userId !== user.id && request.authUser?.role !== 'MANAGER') {
          return reply.status(403).send({ success: false, error: 'Reserva de outro cliente' })
        }
        if (appointment.status !== 'PENDING' || appointment.paymentStatus !== 'PENDING') {
          return reply.status(409).send({
            success: false,
            error: 'Esta reserva não está mais aguardando pagamento. Faça um novo agendamento.',
          })
        }
        if (appointment.packagePurchaseId) {
          resolvedPackagePurchaseId = appointment.packagePurchaseId
        }
        expiresAt = appointment.paymentExpiresAt
        existingPaymentId = appointment.asaasPaymentId
      }

      const finalAmount = body.customAmount !== undefined ? body.customAmount : service.price
      const isPackageCheckout = Boolean(resolvedPackagePurchaseId) || service.category === 'COMBO'
      const description = isPackageCheckout
        ? `Pacote ${service.name} - Charme & Bela`
        : `${service.name} - Charme & Bela`

      const cpfCnpj = normalizeCpfCnpj(body.cpf) || normalizeCpfCnpj(user.cpf)
      if (!cpfCnpj) {
        return reply.status(400).send({
          success: false,
          error: 'Informe o CPF para emitir a cobrança. O Asaas exige o documento do pagador.',
        })
      }
      if (!asaasCustomerEmail(user.email)) {
        return reply.status(400).send({ success: false, error: ASAAS_EMAIL_REQUIRED })
      }

      const payer = await loadAsaasPayer(user.id)
      const customerPhone = pickAsaasPhone(payer.anamnesisPhone, user.phone)
      const customerId = await ensureAsaasCustomer(user, cpfCnpj, payer.address, customerPhone)
      const externalReference = resolvedPackagePurchaseId
        ? `pkg_${resolvedPackagePurchaseId}`
        : `apt_${appointmentId || service.id}`

      const checkout = await reuseOrCreateCharge({
        customerId,
        value: finalAmount,
        description: body.customDescription ? `${description} (${body.customDescription})` : description,
        externalReference,
        existingPaymentId,
        expiresAt,
      })

      await persistPaymentId({
        appointmentId: appointmentId || null,
        packagePurchaseId: resolvedPackagePurchaseId || null,
        paymentId: checkout.paymentId,
      })

      logger.success(`Checkout Asaas criado: ${checkout.paymentId}`)
      return reply.status(200).send({ success: true, data: checkout })
    } catch (error: any) {
      logger.error('Erro ao criar checkout Asaas:', error)
      const status = error instanceof AsaasError ? Math.min(error.statusCode, 502) || 502 : 500
      return reply.status(status >= 400 && status < 600 ? status : 500).send({
        success: false,
        error: 'Erro ao criar sessão de pagamento',
        details: error.message,
      })
    }
  })

  app.post('/payments/subscribe', async (request, reply) => {
    logger.route('POST', '/payments/subscribe')
    try {
      if (!isAsaasConfigured()) {
        return reply.status(503).send({ success: false, error: 'Asaas não configurado (ASAAS_API_KEY)' })
      }

      const body = request.body as { userId?: string; planId: string; cpf?: string }
      const resolved = resolveUserId(request, body.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Você só pode assinar no próprio cadastro' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }
      if (!body.planId) {
        return reply.status(400).send({ success: false, error: 'planId é obrigatório' })
      }

      const user = await prisma.user.findUnique({
        where: { id: resolved.userId },
        include: { subscription: true },
      })
      if (!user) {
        return reply.status(404).send({ success: false, error: 'Usuário não encontrado' })
      }
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } })
      if (!plan) {
        return reply.status(404).send({ success: false, error: 'Plano não encontrado' })
      }
      if (hasPaidClubSubscription(user.subscription)) {
        return reply.status(400).send({
          success: false,
          error: 'Você já tem um plano ativo. Use a troca de plano para upgrade ou downgrade.',
        })
      }

      const cpfCnpj = normalizeCpfCnpj(body.cpf) || normalizeCpfCnpj(user.cpf)
      if (!cpfCnpj) {
        return reply.status(400).send({
          success: false,
          error: 'Informe o CPF para emitir a cobrança. O Asaas exige o documento do pagador.',
        })
      }
      if (!asaasCustomerEmail(user.email)) {
        return reply.status(400).send({ success: false, error: ASAAS_EMAIL_REQUIRED })
      }

      const payer = await loadAsaasPayer(user.id)
      const customerPhone = pickAsaasPhone(payer.anamnesisPhone, user.phone)
      const customerId = await ensureAsaasCustomer(user, cpfCnpj, payer.address, customerPhone)
      const externalReference = clubSubscriptionReference(user.id, plan.id)
      await cancelOrphanUnpaidSubscriptions(customerId, user.subscription?.asaasSubscriptionId)

      try {
        const checkoutSession = await createCreditCardCheckout({
          customerId,
          customerName: user.name,
          customerEmail: user.email,
          customerCpf: cpfCnpj,
          customerPhone,
          customerAddress: payer.address,
          value: plan.price,
          name: plan.name,
          description: `Charme & Bela Club - ${plan.name}`,
          externalReference,
          recurrent: true,
          successQuery: 'success=true&plan=1',
        })

        logger.success(`Checkout de assinatura Asaas criado: ${checkoutSession.id}`)
        return reply.status(200).send({
          success: true,
          data: {
            paymentId: checkoutSession.id,
            sessionId: checkoutSession.id,
            url: checkoutSession.link || null,
            invoiceUrl: checkoutSession.link || null,
            pixCopyPaste: null,
            pixQrBase64: null,
            expiresAt: null,
            amount: plan.price,
            description: `Assinatura ${plan.name}`,
            asaasSubscriptionId: null,
          },
        })
      } catch (checkoutError: any) {
        logger.warning(`Checkout Asaas indisponível, usando fatura de crédito: ${checkoutError.message}`)
      }

      const subscription = await createSubscription({
        customer: customerId,
        value: plan.price,
        description: `Charme & Bela Club - ${plan.name}`,
        externalReference,
        billingType: 'CREDIT_CARD',
      })
      const payments = await listSubscriptionPayments(subscription.id)
      const first = payments.data?.[0]
      const checkout = first
        ? await toCheckoutPayload(first, {
            description: `Assinatura ${plan.name}`,
            invoiceUrl: first.invoiceUrl || null,
          })
        : {
            paymentId: subscription.id,
            sessionId: subscription.id,
            url: null,
            invoiceUrl: null,
            pixCopyPaste: null,
            pixQrBase64: null,
            expiresAt: null,
            amount: plan.price,
            description: `Assinatura ${plan.name}`,
          }
      return reply.status(200).send({
        success: true,
        data: {
          ...checkout,
          asaasSubscriptionId: subscription.id,
        },
      })
    } catch (error: any) {
      logger.error('Erro ao criar assinatura Asaas:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar sessão de pagamento',
        details: error.message,
      })
    }
  })

  app.post('/payments/upgrade', async (request, reply) => {
    logger.route('POST', '/payments/upgrade')
    try {
      if (!isAsaasConfigured()) {
        return reply.status(503).send({ success: false, error: 'Asaas não configurado (ASAAS_API_KEY)' })
      }

      const body = request.body as { userId?: string; planId: string; cpf?: string }
      const resolved = resolveUserId(request, body.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Você só pode trocar o próprio plano' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }
      if (!body.planId) {
        return reply.status(400).send({ success: false, error: 'planId é obrigatório' })
      }

      const user = await prisma.user.findUnique({
        where: { id: resolved.userId },
        include: { subscription: { include: { plan: true } } },
      })
      if (!user) {
        return reply.status(404).send({ success: false, error: 'Usuário não encontrado' })
      }
      if (!hasPaidClubSubscription(user.subscription) || !user.subscription) {
        return reply.status(400).send({
          success: false,
          error: 'Upgrade só vale para quem já tem um plano pago ativo',
        })
      }
      const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } })
      if (!newPlan) {
        return reply.status(404).send({ success: false, error: 'Plano não encontrado' })
      }
      if (newPlan.price <= user.subscription.plan.price) {
        return reply.status(400).send({
          success: false,
          error: 'Este plano não é um upgrade. Use a troca de plano para reduzir o valor.',
        })
      }

      const difference = Number((newPlan.price - user.subscription.plan.price).toFixed(2))
      const cpfCnpj = normalizeCpfCnpj(body.cpf) || normalizeCpfCnpj(user.cpf)
      if (!cpfCnpj) {
        return reply.status(400).send({
          success: false,
          error: 'Informe o CPF para emitir a cobrança. O Asaas exige o documento do pagador.',
        })
      }
      if (!asaasCustomerEmail(user.email)) {
        return reply.status(400).send({ success: false, error: ASAAS_EMAIL_REQUIRED })
      }

      const payer = await loadAsaasPayer(user.id)
      const customerPhone = pickAsaasPhone(payer.anamnesisPhone, user.phone)
      const customerId = await ensureAsaasCustomer(user, cpfCnpj, payer.address, customerPhone)
      const externalReference = upgradeReference(user.id, newPlan.id)
      const description = `Upgrade Charme & Bela Club - ${user.subscription.plan.name} → ${newPlan.name}`
      await cancelPendingByExternalReference(externalReference)

      const charge = await ensureCardInvoice({
        customerId,
        value: difference,
        description,
        externalReference,
      })
      const checkout = await toCheckoutPayload(charge, {
        description,
        invoiceUrl: charge.invoiceUrl || null,
      })
      logger.success(`Cobrança de upgrade Asaas criada: ${charge.id}`)
      return reply.status(200).send({
        success: true,
        data: {
          ...checkout,
          amount: difference,
          upgrade: true,
          newPlanId: newPlan.id,
          newPlanName: newPlan.name,
        },
      })
    } catch (error: any) {
      logger.error('Erro ao criar checkout de upgrade:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar sessão de pagamento do upgrade',
        details: error.message,
      })
    }
  })

  app.post('/payments/manage', async (request, reply) => {
    logger.route('POST', '/payments/manage')
    return rejectStandaloneCardSave(request, reply)
  })

  app.post('/payments/add-card', async (request, reply) => {
    logger.route('POST', '/payments/add-card')
    return rejectStandaloneCardSave(request, reply)
  })

  app.post('/payments/abandon', async (request, reply) => {
    logger.route('POST', '/payments/abandon')
    try {
      const body = request.body as {
        userId?: string
        appointmentId?: string
        packagePurchaseId?: string
        paymentId?: string
      }
      const resolved = resolveUserId(request, body.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Acesso negado' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }

      const cancelReason = 'Pagamento cancelado no checkout'
      let paymentId = body.paymentId || null

      if (body.packagePurchaseId || body.appointmentId) {
        const appointment = body.appointmentId
          ? await prisma.appointment.findUnique({ where: { id: body.appointmentId } })
          : await prisma.appointment.findFirst({
              where: { packagePurchaseId: body.packagePurchaseId, userId: resolved.userId },
              orderBy: { createdAt: 'desc' },
            })

        if (!appointment) {
          return reply.status(404).send({ success: false, error: 'Reserva não encontrada' })
        }
        if (appointment.userId !== resolved.userId && request.authUser?.role !== 'MANAGER') {
          return reply.status(403).send({ success: false, error: 'Acesso negado' })
        }

        const isUnpaidHold =
          appointment.status === 'PENDING' &&
          appointment.paymentStatus === 'PENDING' &&
          appointment.paymentExpiresAt !== null
        if (!isUnpaidHold) {
          return reply.status(200).send({ success: true, released: false, message: 'Reserva não está mais aguardando pagamento' })
        }

        paymentId = paymentId || appointment.asaasPaymentId
        const purchaseId = body.packagePurchaseId || appointment.packagePurchaseId
        if (purchaseId) {
          const purchase = await prisma.packagePurchase.findUnique({ where: { id: purchaseId } })
          paymentId = paymentId || purchase?.asaasPaymentId || null
          await prisma.$transaction(async (tx) => {
            await cancelUnpaidPackagePurchase(tx, purchaseId, cancelReason)
          })
        } else {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              status: 'CANCELED',
              canceledBy: 'client',
              canceledAt: new Date(),
              cancelReason,
              paymentExpiresAt: null,
            },
          })
        }
      }

      let externalReference: string | null = body.packagePurchaseId
        ? `pkg_${body.packagePurchaseId}`
        : body.appointmentId
          ? `apt_${body.appointmentId}`
          : null
      if (!externalReference && paymentId) {
        try {
          const payment = await getPayment(paymentId)
          externalReference = payment.externalReference || null
        } catch {
          // cancela só o id abaixo
        }
      }
      if (externalReference) {
        await cancelPendingByExternalReference(externalReference)
      } else {
        await cancelPaymentSilent(paymentId)
      }
      return reply.status(200).send({ success: true, released: true, message: 'Horário liberado' })
    } catch (error: any) {
      logger.error('Erro ao abandonar checkout:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao cancelar pagamento' })
    }
  })

  app.get('/payments/status/:paymentId', async (request, reply) => {
    const { paymentId } = request.params as { paymentId: string }
    logger.route('GET', `/payments/status/${paymentId}`)
    try {
      if (!isAsaasConfigured()) {
        return reply.status(503).send({ success: false, error: 'Asaas não configurado' })
      }
      if (isCheckoutSessionId(paymentId)) {
        const checkout = await getCheckout(paymentId)
        const paidCheckout = checkout.status === 'PAID'
        let paidByRef = false
        let value = 0
        let invoiceUrl = checkout.link || null
        if (checkout.externalReference) {
          const siblings = await listPayments({
            externalReference: checkout.externalReference,
            limit: 20,
          })
          const paidSibling = (siblings.data || []).find((item) => isAsaasPaidStatus(item.status))
          if (paidSibling) {
            paidByRef = true
            value = paidSibling.value
            if (paidSibling.creditCardToken || paidSibling.creditCard) {
              await persistSavedCard(paidSibling)
            }
            const paidRef = parseExternalReference(paidSibling.externalReference || checkout.externalReference)
            if (paidRef.kind === 'upgrade') {
              await handlePaymentPaid(paidSibling)
            }
          }
        }
        if ((paidCheckout || paidByRef) && request.authUser?.id) {
          await recoverMissedUpgrade(request.authUser.id)
        }
        return reply.status(200).send({
          success: true,
          data: {
            paymentId: checkout.id,
            status: paidCheckout || paidByRef ? 'CONFIRMED' : checkout.status || 'PENDING',
            paid: paidCheckout || paidByRef,
            billingType: 'credit_card',
            value,
            invoiceUrl,
            pixCopyPaste: null,
            pixQrBase64: null,
          },
        })
      }
      const payment = await getPayment(paymentId)
      const paidInfo = await checkoutPaidStatus(payment)
      if (paidInfo.paid) {
        const ref = parseExternalReference(payment.externalReference)
        if (ref.kind === 'upgrade') {
          await handlePaymentPaid(payment)
        } else if (!payment.subscription && request.authUser?.id) {
          await recoverMissedUpgrade(request.authUser.id)
        }
      }
      const pix =
        paidInfo.paid || payment.billingType === 'CREDIT_CARD' || payment.billingType === 'DEBIT_CARD'
          ? null
          : await getPixQrCode(payment.id)
      return reply.status(200).send({
        success: true,
        data: {
          paymentId: payment.id,
          status: paidInfo.status,
          paid: paidInfo.paid,
          billingType: paidInfo.billingType,
          value: payment.value,
          invoiceUrl: paidInfo.invoiceUrl,
          pixCopyPaste: pix?.payload || null,
          pixQrBase64: pix?.encodedImage || null,
        },
      })
    } catch (error: any) {
      return reply.status(404).send({ success: false, error: 'Cobrança não encontrada' })
    }
  })

  app.get('/payments/methods', async (request, reply) => {
    logger.route('GET', '/payments/methods')
    try {
      const query = request.query as { userId?: string }
      const resolved = resolveUserId(request, query.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Acesso negado' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }
      const data = await listCardMethods(resolved.userId)
      return reply.status(200).send({ success: true, data })
    } catch (error: any) {
      logger.error('Erro ao listar métodos Asaas:', error)
      return reply.status(200).send({ success: true, data: [] })
    }
  })

  app.get('/payments/methods/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('GET', `/payments/methods/${userId}`)
    const resolved = resolveUserId(request, userId)
    if (resolved.error === 'forbidden') {
      return reply.status(403).send({ success: false, error: 'Acesso negado' })
    }
    if (!resolved.userId) {
      return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
    }
    try {
      const data = await listCardMethods(resolved.userId)
      return reply.status(200).send({ success: true, data })
    } catch (error: any) {
      logger.error('Erro ao listar métodos Asaas:', error)
      return reply.status(200).send({ success: true, data: [] })
    }
  })

  app.patch('/payments/methods/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PATCH', `/payments/methods/${id}`)
    try {
      const body = (request.body || {}) as { userId?: string; nickname?: string | null; isDefault?: boolean }
      const resolved = resolveUserId(request, body.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Acesso negado' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }
      const card = await prisma.savedCard.findFirst({
        where: { id, userId: resolved.userId },
      })
      if (!card) {
        return reply.status(404).send({ success: false, error: 'Cartão não encontrado' })
      }
      if (body.isDefault === true && card.kind === 'debit') {
        return reply.status(400).send({
          success: false,
          error: 'Cartão de débito não pode ser o débito automático da assinatura. Escolha um cartão de crédito.',
        })
      }

      if (body.isDefault === true) {
        await prisma.$transaction(async (tx) => {
          await tx.savedCard.updateMany({
            where: { userId: resolved.userId! },
            data: { isDefault: false },
          })
          await tx.savedCard.update({
            where: { id: card.id },
            data: {
              isDefault: true,
              ...(body.nickname !== undefined ? { nickname: sanitizeCardNickname(body.nickname) } : {}),
            },
          })
        })
        try {
          await syncSubscriptionDefaultCard({
            userId: resolved.userId,
            asaasToken: card.asaasToken,
            remoteIp: clientIp(request),
          })
        } catch (error: any) {
          return reply.status(502).send({
            success: false,
            error:
              error.message ||
              'Cartão marcado no app, mas o Asaas não atualizou o débito automático. Tente de novo em instantes.',
          })
        }
      } else if (body.nickname !== undefined) {
        await prisma.savedCard.update({
          where: { id: card.id },
          data: { nickname: sanitizeCardNickname(body.nickname) },
        })
      }

      return reply.status(200).send({ success: true, data: await listCardMethods(resolved.userId) })
    } catch (error: any) {
      logger.error('Erro ao atualizar cartão salvo:', error)
      return reply.status(500).send({ success: false, error: 'Não foi possível atualizar o cartão' })
    }
  })

  app.delete('/payments/methods/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/payments/methods/${id}`)
    try {
      const query = request.query as { userId?: string }
      const body = (request.body || {}) as { userId?: string }
      const resolved = resolveUserId(request, body.userId || query.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Acesso negado' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }
      const card = await prisma.savedCard.findFirst({
        where: { id, userId: resolved.userId },
      })
      if (!card) {
        return reply.status(404).send({ success: false, error: 'Cartão não encontrado' })
      }
      const wasDefault = card.isDefault
      await prisma.savedCard.delete({ where: { id: card.id } })
      if (wasDefault) {
        const next = await prisma.savedCard.findFirst({
          where: { userId: resolved.userId, kind: 'credit' },
          orderBy: { createdAt: 'desc' },
        })
        if (next) {
          await prisma.savedCard.update({ where: { id: next.id }, data: { isDefault: true } })
          try {
            await syncSubscriptionDefaultCard({
              userId: resolved.userId,
              asaasToken: next.asaasToken,
              remoteIp: clientIp(request),
            })
          } catch (error: any) {
            logger.warning(`Cartão removido, mas o Asaas não atualizou o débito automático: ${error.message}`)
          }
        }
      }
      return reply.status(200).send({ success: true, data: await listCardMethods(resolved.userId) })
    } catch (error: any) {
      logger.error('Erro ao remover cartão salvo:', error)
      return reply.status(500).send({ success: false, error: 'Não foi possível remover o cartão' })
    }
  })

  app.post('/payments/charge-saved-card', async (request, reply) => {
    logger.route('POST', '/payments/charge-saved-card')
    try {
      if (!isAsaasConfigured()) {
        return reply.status(503).send({ success: false, error: 'Asaas não configurado (ASAAS_API_KEY)' })
      }
      const body = request.body as {
        userId?: string
        paymentId?: string
        appointmentId?: string
        packagePurchaseId?: string
        savedCardId?: string
        planId?: string
      }
      const resolved = resolveUserId(request, body.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Acesso negado' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }

      const user = await prisma.user.findUnique({
        where: { id: resolved.userId },
        include: { subscription: true },
      })
      if (!user?.asaasCustomerId) {
        return reply.status(400).send({
          success: false,
          error: 'Nenhum cartão salvo. Pague uma vez no checkout seguro para guardar o cartão.',
        })
      }

      const savedCard = body.savedCardId
        ? await prisma.savedCard.findFirst({ where: { id: body.savedCardId, userId: user.id } })
        : await prisma.savedCard.findFirst({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          })
      if (!savedCard) {
        return reply.status(400).send({
          success: false,
          error: 'Nenhum cartão salvo. Pague uma vez no checkout seguro para guardar o cartão.',
        })
      }
      if (body.planId && savedCard.kind === 'debit') {
        return reply.status(400).send({
          success: false,
          error: 'A assinatura só renova no crédito. Escolha um cartão de crédito ou pague no checkout seguro.',
        })
      }

      const remoteIp = clientIp(request)

      if (body.planId) {
        if (hasPaidClubSubscription(user.subscription)) {
          return reply.status(400).send({
            success: false,
            error: 'Você já tem um plano ativo. Use a troca de plano para upgrade ou downgrade.',
          })
        }
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } })
        if (!plan) {
          return reply.status(404).send({ success: false, error: 'Plano não encontrado' })
        }
        const cpfCnpj = normalizeCpfCnpj(user.cpf)
        if (!cpfCnpj) {
          return reply.status(400).send({
            success: false,
            error: 'Informe o CPF para emitir a cobrança. O Asaas exige o documento do pagador.',
          })
        }
        await cancelOrphanUnpaidSubscriptions(user.asaasCustomerId, user.subscription?.asaasSubscriptionId)
        const subscription = await createSubscription({
          customer: user.asaasCustomerId,
          value: plan.price,
          description: `Charme & Bela Club - ${plan.name}`,
          externalReference: clubSubscriptionReference(user.id, plan.id),
          billingType: 'CREDIT_CARD',
          creditCardToken: savedCard.asaasToken,
          remoteIp,
        })
        const subPayments = await listSubscriptionPayments(subscription.id)
        const first = subPayments.data?.[0] || null
        if (first) {
          await persistSavedCard(first)
          if (isAsaasPaidStatus(first.status)) {
            await handlePaymentPaid(first)
          }
        }
        return reply.status(200).send({
          success: true,
          data: {
            paid: Boolean(first && isAsaasPaidStatus(first.status)),
            paymentId: first?.id || subscription.id,
            status: first?.status || subscription.status,
            brand: savedCard.brand,
            last4: savedCard.last4,
          },
        })
      }

      let paymentId = body.paymentId || null
      if (paymentId && isCheckoutSessionId(paymentId)) {
        try {
          const checkout = await getCheckout(paymentId)
          const ref = checkout.externalReference || null
          if (ref) {
            const siblings = await listPayments({ externalReference: ref, limit: 20 })
            const paidSibling = (siblings.data || []).find((item) => isAsaasPaidStatus(item.status))
            if (paidSibling) {
              await handlePaymentPaid(paidSibling)
              return reply.status(200).send({
                success: true,
                data: {
                  paid: true,
                  paymentId: paidSibling.id,
                  status: paidSibling.status,
                  brand: savedCard.brand,
                  last4: savedCard.last4,
                },
              })
            }
            const pending = (siblings.data || []).find(
              (item) => (item.status === 'PENDING' || item.status === 'OVERDUE') && !item.deleted,
            )
            paymentId = pending?.id || null
            if (!paymentId && parseExternalReference(ref).kind === 'upgrade') {
              const parsed = parseExternalReference(ref)
              if (parsed.id === user.id && parsed.extra) {
                const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: parsed.extra } })
                const currentPrice = user.subscription
                  ? (await prisma.subscription.findUnique({
                      where: { userId: user.id },
                      include: { plan: true },
                    }))?.plan.price
                  : 0
                if (newPlan && currentPrice != null && newPlan.price > currentPrice) {
                  const charged = await createPaymentWithCardToken({
                    customer: user.asaasCustomerId,
                    value: Number((newPlan.price - currentPrice).toFixed(2)),
                    description: `Upgrade Charme & Bela Club - ${newPlan.name}`,
                    externalReference: ref,
                    creditCardToken: savedCard.asaasToken,
                    remoteIp,
                  })
                  await persistSavedCard(charged)
                  if (isAsaasPaidStatus(charged.status)) {
                    await handlePaymentPaid(charged)
                  }
                  return reply.status(200).send({
                    success: true,
                    data: {
                      paid: isAsaasPaidStatus(charged.status),
                      paymentId: charged.id,
                      status: charged.status,
                      brand: savedCard.brand,
                      last4: savedCard.last4,
                    },
                  })
                }
              }
            }
          } else {
            paymentId = null
          }
        } catch (checkoutError: any) {
          logger.warning(`Checkout ${paymentId} não resolvido: ${checkoutError.message}`)
          paymentId = null
        }
      }
      if (!paymentId && body.packagePurchaseId) {
        const purchase = await prisma.packagePurchase.findUnique({
          where: { id: body.packagePurchaseId },
          select: { asaasPaymentId: true, userId: true },
        })
        if (purchase?.userId !== resolved.userId && request.authUser?.role !== 'MANAGER') {
          return reply.status(403).send({ success: false, error: 'Acesso negado' })
        }
        paymentId = purchase?.asaasPaymentId || null
      }
      if (!paymentId && body.appointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: body.appointmentId },
          select: { asaasPaymentId: true, userId: true },
        })
        if (appointment?.userId !== resolved.userId && request.authUser?.role !== 'MANAGER') {
          return reply.status(403).send({ success: false, error: 'Acesso negado' })
        }
        paymentId = appointment?.asaasPaymentId || null
      }
      if (!paymentId) {
        return reply.status(400).send({ success: false, error: 'Cobrança não encontrada para cobrar o cartão salvo' })
      }

      const payment = await getPayment(paymentId)
      if (payment.customer !== user.asaasCustomerId) {
        return reply.status(403).send({ success: false, error: 'Essa cobrança não pertence a você' })
      }
      if (savedCard.kind === 'debit' && isUpgradePaymentLabel(payment)) {
        return reply.status(400).send({
          success: false,
          error: 'A diferença do upgrade só pode ser paga no crédito. Escolha um cartão de crédito.',
        })
      }
      if (isAsaasPaidStatus(payment.status)) {
        return reply.status(200).send({
          success: true,
          data: { paid: true, paymentId: payment.id, status: payment.status },
        })
      }

      let charged: AsaasPayment | null = null
      const tryPay = async (id: string) => {
        charged = await payChargeWithCardToken(id, savedCard.asaasToken, remoteIp)
      }

      try {
        await tryPay(payment.id)
      } catch (firstError: any) {
        logger.warning(`payWithCreditCard em ${payment.id} falhou: ${firstError.message}`)
        try {
          const card = await ensureCardInvoice({
            customerId: user.asaasCustomerId,
            value: payment.value,
            description: payment.description || 'Charme & Bela',
            externalReference: payment.externalReference || payment.id,
          })
          await tryPay(card.id)
        } catch (secondError: any) {
          logger.warning(`Cobrança de cartão irmã falhou: ${secondError.message}`)
          charged = await createPaymentWithCardToken({
            customer: user.asaasCustomerId,
            value: payment.value,
            description: payment.description || 'Charme & Bela',
            externalReference: payment.externalReference || payment.id,
            creditCardToken: savedCard.asaasToken,
            remoteIp,
          })
        }
      }

      if (!charged) {
        return reply.status(502).send({ success: false, error: 'Não foi possível cobrar o cartão salvo' })
      }

      await persistSavedCard(charged)
      if (isAsaasPaidStatus(charged.status)) {
        await handlePaymentPaid(charged)
      }

      return reply.status(200).send({
        success: true,
        data: {
          paid: isAsaasPaidStatus(charged.status),
          paymentId: charged.id,
          status: charged.status,
          brand: savedCard.brand,
          last4: savedCard.last4,
        },
      })
    } catch (error: any) {
      logger.error('Erro ao cobrar cartão salvo:', error)
      const status = error instanceof AsaasError ? Math.min(error.statusCode, 502) || 502 : 500
      return reply.status(status >= 400 && status < 600 ? status : 500).send({
        success: false,
        error:
          error.message ||
          'Não foi possível cobrar o cartão salvo. Use o checkout seguro.',
      })
    }
  })

  app.get('/payments/history', async (request, reply) => {
    logger.route('GET', '/payments/history')
    try {
      const query = request.query as { userId?: string }
      const resolved = resolveUserId(request, query.userId)
      if (resolved.error === 'forbidden') {
        return reply.status(403).send({ success: false, error: 'Acesso negado' })
      }
      if (!resolved.userId) {
        return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
      }
      const user = await prisma.user.findUnique({
        where: { id: resolved.userId },
        include: { subscription: true },
      })
      if (!user?.asaasCustomerId) {
        return reply.status(200).send({ success: true, data: [] })
      }
      await recoverMissedUpgrade(user.id)
      await cancelOrphanUnpaidSubscriptions(user.asaasCustomerId, user.subscription?.asaasSubscriptionId)
      const payments = await listPayments({ customer: user.asaasCustomerId, limit: 50 })
      const history = await toHistoryItems(
        (payments.data || []).filter(
          (payment) =>
            isVisibleHistoryStatus(payment.status) &&
            !payment.deleted &&
            !String(payment.externalReference || '').startsWith('addcard_'),
        ),
      )
      return reply.status(200).send({ success: true, data: history })
    } catch (error: any) {
      logger.error('Erro ao buscar histórico Asaas:', error)
      return reply.status(200).send({ success: true, data: [] })
    }
  })

  app.get('/payments/history/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('GET', `/payments/history/${userId}`)
    const resolved = resolveUserId(request, userId)
    if (resolved.error === 'forbidden') {
      return reply.status(403).send({ success: false, error: 'Acesso negado' })
    }
    if (!resolved.userId) {
      return reply.status(400).send({ success: false, error: 'Usuário não autenticado' })
    }
    const user = await prisma.user.findUnique({
      where: { id: resolved.userId || userId },
      include: { subscription: true },
    })
    if (!user?.asaasCustomerId) {
      return reply.status(200).send({ success: true, data: [] })
    }
    try {
      await recoverMissedUpgrade(user.id)
      await cancelOrphanUnpaidSubscriptions(user.asaasCustomerId, user.subscription?.asaasSubscriptionId)
      const payments = await listPayments({ customer: user.asaasCustomerId, limit: 50 })
      const history = await toHistoryItems(
        (payments.data || []).filter(
          (payment) =>
            isVisibleHistoryStatus(payment.status) &&
            !payment.deleted &&
            !String(payment.externalReference || '').startsWith('addcard_'),
        ),
      )
      return reply.status(200).send({ success: true, data: history })
    } catch {
      return reply.status(200).send({ success: true, data: [] })
    }
  })

  app.get('/payments/monthly-revenue', async (request, reply) => {
    logger.route('GET', '/payments/monthly-revenue')
    try {
      if (request.authUser?.role && request.authUser.role !== 'MANAGER') {
        return reply.status(403).send({ success: false, error: 'Apenas a gestora pode ver a receita' })
      }
      if (!isAsaasConfigured()) {
        return reply.status(200).send({
          success: true,
          data: emptyRevenue(),
        })
      }

      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const ge = start.toISOString().slice(0, 10)
      const le = end.toISOString().slice(0, 10)

      let offset = 0
      let subscriptionRevenue = 0
      let singlePaymentRevenue = 0
      let paymentCount = 0
      let hasMore = true

      while (hasMore && offset < 500) {
        const page = await listPayments({
          'paymentDate[ge]': ge,
          'paymentDate[le]': le,
          offset,
          limit: 100,
        })
        const rows = page.data || []
        for (const payment of rows) {
          if (!isAsaasPaidStatus(payment.status)) continue
          paymentCount += 1
          if (payment.subscription) subscriptionRevenue += payment.value
          else singlePaymentRevenue += payment.value
        }
        hasMore = Boolean(page.hasMore) && rows.length === 100
        offset += 100
      }

      return reply.status(200).send({
        success: true,
        data: {
          totalRevenue: subscriptionRevenue + singlePaymentRevenue,
          subscriptionRevenue,
          singlePaymentRevenue,
          paymentCount,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      })
    } catch (error: any) {
      logger.error('Erro ao calcular receita Asaas:', error)
      return reply.status(200).send({ success: true, data: emptyRevenue() })
    }
  })

  app.post('/asaas/webhook', async (request, reply) => {
    logger.route('POST', '/asaas/webhook')
    const expected = process.env.ASAAS_WEBHOOK_TOKEN
    if (!expected) {
      logger.error('ASAAS_WEBHOOK_TOKEN não configurado')
      return reply.status(500).send({ error: 'Webhook Asaas não configurado' })
    }
    const received =
      (request.headers['asaas-access-token'] as string | undefined) ||
      (request.headers['asaas-access-token'.toLowerCase()] as string | undefined)
    if (!webhookTokensMatch(received, expected)) {
      return reply.status(401).send({ error: 'Webhook não autorizado' })
    }

    const payload = request.body as {
      id?: string
      event?: string
      dateCreated?: string
      payment?: AsaasPayment
      subscription?: AsaasSubscription
    }
    const eventName = payload.event || ''
    const eventId = [
      payload.id || 'asaas',
      eventName,
      payload.payment?.id || payload.subscription?.id || '',
      payload.payment?.status || payload.subscription?.status || '',
      payload.dateCreated || '',
    ].join(':')

    try {
      const already = await prisma.processedWebhookEvent.findUnique({ where: { id: eventId } })
      if (already) {
        return reply.status(200).send({ received: true, duplicate: true })
      }

      logger.info(`Webhook Asaas: ${eventName}`)

      switch (eventName) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
          if (payload.payment) await handlePaymentPaid(payload.payment)
          break
        case 'PAYMENT_OVERDUE':
          if (payload.payment?.subscription) await handleSubscriptionPaymentFailed(payload.payment)
          break
        case 'PAYMENT_DELETED':
          break
        case 'PAYMENT_REFUNDED':
        case 'PAYMENT_REFUND_REQUESTED':
          if (payload.payment) await handlePaymentRefunded(payload.payment)
          break
        case 'PAYMENT_CHARGEBACK_REQUESTED':
        case 'PAYMENT_CHARGEBACK_DISPUTE':
        case 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL':
          if (payload.payment) await handleChargeback(payload.payment)
          break
        case 'PAYMENT_CHARGEBACK_REVERSED':
          break
        case 'SUBSCRIPTION_CREATED':
        case 'SUBSCRIPTION_UPDATED':
          if (payload.subscription) await handleSubscriptionUpdated(payload.subscription)
          break
        case 'SUBSCRIPTION_INACTIVATED':
        case 'SUBSCRIPTION_DELETED':
          if (payload.subscription) await handleSubscriptionCanceled(payload.subscription)
          break
        default:
          logger.warning(`Evento Asaas não tratado: ${eventName || 'desconhecido'}`)
      }

      await prisma.processedWebhookEvent.create({
        data: { id: eventId, source: 'asaas', event: eventName || 'unknown' },
      })
      return reply.status(200).send({ received: true })
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(200).send({ received: true, duplicate: true })
      }
      logger.error('Erro no webhook Asaas:', error)
      return reply.status(500).send({ error: error.message })
    }
  })
}

function emptyRevenue() {
  const now = new Date()
  return {
    totalRevenue: 0,
    subscriptionRevenue: 0,
    singlePaymentRevenue: 0,
    paymentCount: 0,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

async function handlePaymentPaid(payment: AsaasPayment) {
  if (!isAsaasPaidStatus(payment.status)) return

  await persistSavedCard(payment)
  if (payment.externalReference?.startsWith('addcard_')) {
    try {
      await refundPayment(payment.id, undefined, 'Estorno do cadastro de cartão')
    } catch (error: any) {
      logger.warning(`Estorno add-card falhou para ${payment.id}: ${error.message}`)
    }
    return
  }
  const ref = parseExternalReference(payment.externalReference)
  await cancelPendingByExternalReference(payment.externalReference, payment.id)
  if (payment.customer && ref.kind !== 'upgrade') {
    await cancelOrphanUnpaidSubscriptions(payment.customer, payment.subscription || null)
  }

  if (payment.subscription) {
    await handleSubscriptionInvoicePaid(payment)
    return
  }

  const method = mapAsaasBillingType(payment.billingType)
  const paidAmount = payment.value

  if (ref.kind === 'upgrade' && ref.id && ref.extra) {
    try {
      const result = await applyPlanChange(ref.id, ref.extra)
      await createNotification({
        userId: null,
        type: 'PAYMENT_SUCCEEDED',
        title: 'Pagamento Recebido',
        message: `Upgrade para ${result.newPlan.name} - R$ ${payment.value.toFixed(2).replace('.', ',')}`,
        icon: 'CARD',
        priority: 'NORMAL',
        actionUrl: '/admin/atividades',
        actionLabel: 'Ver Atividades',
        metadata: { userId: ref.id, amount: payment.value, paymentId: payment.id, kind: 'upgrade' },
      })
    } catch (error: any) {
      logger.error(`Falha ao aplicar upgrade ${ref.id} → ${ref.extra}:`, error.message)
    }
    return
  }

  if (ref.kind === 'subscription') {
    await handleSubscriptionInvoicePaid(payment)
    return
  }

  if (ref.kind === 'package' && ref.id) {
    await confirmPackagePayment(ref.id, paidAmount, method, payment.id)
    return
  }

  if (ref.kind === 'appointment' && ref.id) {
    await confirmAppointmentPayment(ref.id, paidAmount, method, payment.id)
    return
  }

  const byPayment = await prisma.appointment.findFirst({
    where: { asaasPaymentId: payment.id },
  })
  if (byPayment?.packagePurchaseId) {
    await confirmPackagePayment(byPayment.packagePurchaseId, paidAmount, method, payment.id)
    return
  }
  if (byPayment) {
    await confirmAppointmentPayment(byPayment.id, paidAmount, method, payment.id)
    return
  }

  const payer = await prisma.user.findFirst({
    where: { asaasCustomerId: payment.customer },
    select: { id: true },
  })
  if (payer) {
    await recoverMissedUpgrade(payer.id)
  }
}

async function confirmPackagePayment(
  packagePurchaseId: string,
  paidAmount: number,
  method: string,
  paymentId: string,
) {
  const purchase = await prisma.packagePurchase.findUnique({
    where: { id: packagePurchaseId },
    include: { packageService: { select: { name: true } }, user: true },
  })
  if (!purchase) {
    logger.error(`Webhook de pacote para compra inexistente: ${packagePurchaseId}`)
    return
  }
  if (purchase.paymentStatus === 'PAID') {
    logger.info(`Pacote ${packagePurchaseId} já estava pago`)
    return
  }

  await prisma.$transaction(async (tx) => {
    await markPackagePurchasePaid(tx, packagePurchaseId, paidAmount, method)
    await tx.packagePurchase.update({
      where: { id: packagePurchaseId },
      data: { asaasPaymentId: paymentId },
    })
  })

  await notifyPaymentSucceeded(purchase.userId, {
    amount: paidAmount,
    description: `Pacote: ${purchase.packageService.name}`,
  })
  await createNotification({
    userId: null,
    type: 'PAYMENT_SUCCEEDED',
    title: 'Pagamento de Pacote Recebido',
    message: `${purchase.user.name} - R$ ${paidAmount.toFixed(2).replace('.', ',')} (${purchase.packageService.name})`,
    icon: 'CARD',
    priority: 'NORMAL',
    actionUrl: '/admin/atividades',
    actionLabel: 'Ver Atividades',
    metadata: { userId: purchase.userId, amount: paidAmount, packagePurchaseId, paymentId },
  })
}

async function confirmAppointmentPayment(
  appointmentId: string,
  paidAmount: number,
  method: string,
  paymentId: string,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: { select: { name: true } }, user: true },
  })
  if (!appointment) {
    logger.error(`Webhook de pagamento para agendamento inexistente: ${appointmentId}`)
    return
  }
  if (appointment.paymentStatus === 'PAID') {
    logger.info(`Agendamento ${appointmentId} já estava pago`)
    return
  }

  if (appointment.status !== 'CANCELED') {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: method,
        paymentAmount: paidAmount,
        paymentExpiresAt: null,
        asaasPaymentId: paymentId,
      },
    })
    if (appointment.voucherId) {
      try {
        const { markVoucherUsed } = await import('../utils/vouchers')
        await markVoucherUsed(appointment.voucherId)
      } catch (voucherError) {
        logger.error('Erro ao consumir voucher após pagamento Asaas:', voucherError)
      }
    }
  } else {
    const revived = await reviveOrRefundAppointment(appointment, paidAmount, method, paymentId)
    if (!revived) return
  }

  await notifyPaymentSucceeded(appointment.userId, {
    amount: paidAmount,
    description: `Tratamento: ${appointment.service.name}`,
  })
  await createNotification({
    userId: null,
    type: 'PAYMENT_SUCCEEDED',
    title: 'Pagamento Avulso Recebido',
    message: `${appointment.user.name} - R$ ${paidAmount.toFixed(2).replace('.', ',')} (${appointment.service.name})`,
    icon: 'CARD',
    priority: 'NORMAL',
    actionUrl: '/admin/atividades',
    actionLabel: 'Ver Atividades',
    metadata: { userId: appointment.userId, amount: paidAmount, appointmentId, paymentId },
  })
}

async function reviveOrRefundAppointment(
  appointment: {
    id: string
    userId: string
    startTime: Date
    endTime: Date
    voucherId: string | null
    service: { name: string }
  },
  paidAmount: number,
  method: string,
  paymentId: string,
) {
  const config = await prisma.systemConfig.findFirst()
  const maxSimultaneous = config?.maxSimultaneous || 1
  let revived = false

  try {
    await prisma.$transaction(async (tx) => {
      const overlapping = await tx.appointment.count({
        where: {
          id: { not: appointment.id },
          status: { not: 'CANCELED' },
          startTime: { lt: appointment.endTime },
          endTime: { gt: appointment.startTime },
        },
      })
      if (overlapping >= maxSimultaneous) {
        throw new Error('SLOT_TAKEN')
      }
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'PENDING',
          paymentStatus: 'PAID',
          paymentMethod: method,
          paymentAmount: paidAmount,
          paymentExpiresAt: null,
          asaasPaymentId: paymentId,
          canceledBy: null,
          canceledAt: null,
          cancelReason: null,
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    revived = true
    if (appointment.voucherId) {
      try {
        const { markVoucherUsed } = await import('../utils/vouchers')
        await markVoucherUsed(appointment.voucherId)
      } catch (voucherError) {
        logger.error('Erro ao consumir voucher após revive Asaas:', voucherError)
      }
    }
    logger.success(`Agendamento ${appointment.id} revivido após pagamento tardio`)
  } catch {
    revived = false
  }

  if (revived) return true

  logger.warning(`Pagamento de ${appointment.id} chegou com horário ocupado. Estornando...`)
  try {
    await refundPayment(paymentId, paidAmount, 'Horário ocupado antes da confirmação do pagamento')
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { paymentStatus: 'REFUNDED', paymentExpiresAt: null },
    })
    await createNotification({
      userId: appointment.userId,
      type: 'PAYMENT_REFUNDED',
      title: 'Horário Indisponível - Reembolso Automático',
      message: `O horário do seu agendamento de ${appointment.service.name} foi ocupado antes da confirmação do pagamento. Seu pagamento de R$ ${paidAmount.toFixed(2).replace('.', ',')} foi reembolsado automaticamente.`,
      icon: 'ALERT',
      priority: 'URGENT',
      actionUrl: '/cliente/servicos',
      actionLabel: 'Agendar Novamente',
    })
  } catch (refundError: any) {
    logger.error(`Falha no reembolso automático de ${appointment.id}:`, refundError.message)
    await createNotification({
      userId: null,
      type: 'SYSTEM_MESSAGE',
      title: 'Reembolso Manual Necessário',
      message: `Pagamento recebido para agendamento ${appointment.id} (${appointment.service.name}), mas o horário já estava ocupado e o estorno Asaas falhou. Estorne manualmente no dashboard Asaas.`,
      icon: 'ALERT',
      priority: 'URGENT',
      actionUrl: '/admin/agendamentos',
      actionLabel: 'Ver Agendamentos',
      metadata: { appointmentId: appointment.id, paymentId },
    })
  }
  return false
}

async function handleSubscriptionInvoicePaid(payment: AsaasPayment) {
  const ref = parseExternalReference(payment.externalReference)
  let user = await prisma.user.findFirst({
    where: { asaasCustomerId: payment.customer },
    include: { subscription: { include: { plan: true } } },
  })

  if (ref.kind === 'subscription' && ref.id) {
    user = (await prisma.user.findUnique({
      where: { id: ref.id },
      include: { subscription: { include: { plan: true } } },
    })) || user
  }
  if (!user) {
    logger.error(`Pagamento de assinatura sem usuário: ${payment.id}`)
    return
  }

  const existing = await prisma.subscription.findUnique({
    where: { userId: user.id },
  })
  const pendingPlanId = existing?.pendingPlanId || null
  const planId = pendingPlanId || existing?.planId || ref.extra || null
  if (!planId) {
    logger.error(`Pagamento de assinatura sem planId: ${payment.id}`)
    return
  }

  if (pendingPlanId) {
    try {
      await applyPlanChange(user.id, pendingPlanId)
    } catch (error: any) {
      logger.error(`Falha ao aplicar downgrade pendente ${user.id}:`, error.message)
    }
    await createNotification({
      userId: null,
      type: 'PAYMENT_SUCCEEDED',
      title: 'Pagamento Recebido',
      message: `${user.name} - R$ ${payment.value.toFixed(2).replace('.', ',')} (Assinatura)`,
      icon: 'CARD',
      priority: 'NORMAL',
      actionUrl: '/admin/atividades',
      actionLabel: 'Ver Atividades',
      metadata: { userId: user.id, amount: payment.value, paymentId: payment.id },
    })
    return
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  const asaasSubscriptionId = payment.subscription || existing?.asaasSubscriptionId || null
  const isNew = !existing || existing.status !== 'ACTIVE'

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      planId,
      ...(asaasSubscriptionId ? { asaasSubscriptionId } : {}),
      status: 'ACTIVE',
      startDate: existing?.status === 'ACTIVE' ? existing.startDate : new Date(),
      minimumCommitmentEnd: null,
      endDate: null,
      canceledAt: null,
      cancelReason: null,
    },
    create: {
      userId: user.id,
      planId,
      asaasSubscriptionId,
      status: 'ACTIVE',
      startDate: new Date(),
    },
  })

  if (plan && asaasSubscriptionId) {
    try {
      await syncAsaasSubscriptionPlan({
        asaasSubscriptionId,
        userId: user.id,
        plan: { id: plan.id, name: plan.name, price: plan.price },
        updatePendingPayments: false,
      })
    } catch (error: any) {
      logger.warning(`Não sincronizou descrição Asaas na renovação: ${error.message}`)
    }
  }

  if (isNew && plan) {
    await notifySubscriptionActivated(user.id, {
      planName: plan.name,
      maxTreatments: plan.maxTreatmentsPerMonth,
    })
    await createNotification({
      userId: null,
      type: 'SUBSCRIPTION_ACTIVATED',
      title: 'Nova Assinatura Ativada',
      message: `${user.name} assinou o plano ${plan.name} (${plan.tier})`,
      icon: 'STAR',
      priority: 'HIGH',
      actionUrl: '/admin/atividades',
      actionLabel: 'Ver Atividades',
      metadata: { userId: user.id, planId: plan.id, planName: plan.name },
    })
  } else if (plan && existing?.status === 'ACTIVE') {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    await notifySubscriptionRenewed(user.id, {
      planName: plan.name,
      amount: payment.value,
      nextBillingDate: next,
    })
  }

  await createNotification({
    userId: null,
    type: 'PAYMENT_SUCCEEDED',
    title: 'Pagamento Recebido',
    message: `${user.name} - R$ ${payment.value.toFixed(2).replace('.', ',')} (${plan?.name || 'Assinatura'})`,
    icon: 'CARD',
    priority: 'NORMAL',
    actionUrl: '/admin/atividades',
    actionLabel: 'Ver Atividades',
    metadata: { userId: user.id, amount: payment.value, paymentId: payment.id },
  })
}

async function handlePaymentRefunded(payment: AsaasPayment) {
  await prisma.appointment.updateMany({
    where: { asaasPaymentId: payment.id },
    data: { paymentStatus: 'REFUNDED' },
  })
  await prisma.packagePurchase.updateMany({
    where: { asaasPaymentId: payment.id },
    data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' },
  })
}

async function handleChargeback(payment: AsaasPayment) {
  await prisma.appointment.updateMany({
    where: { asaasPaymentId: payment.id },
    data: { paymentStatus: 'FAILED' },
  })
  await createNotification({
    userId: null,
    type: 'SYSTEM_MESSAGE',
    title: 'Chargeback Asaas',
    message: `Cobrança ${payment.id} entrou em chargeback (R$ ${payment.value.toFixed(2).replace('.', ',')}). Verifique no dashboard Asaas.`,
    icon: 'ALERT',
    priority: 'URGENT',
    actionUrl: '/admin/atividades',
    actionLabel: 'Ver Atividades',
    metadata: { paymentId: payment.id },
  })
}

async function handleSubscriptionUpdated(subscription: AsaasSubscription) {
  const db = await prisma.subscription.findFirst({
    where: { asaasSubscriptionId: subscription.id },
  })
  if (!db) return
  if (db.status === 'CANCELED' && db.endDate && db.endDate > new Date()) {
    return
  }
  let status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'PAUSED' = 'ACTIVE'
  if (subscription.status === 'INACTIVE' || subscription.status === 'EXPIRED') status = 'CANCELED'
  else if (subscription.status === 'OVERDUE') status = 'PAST_DUE'
  await prisma.subscription.update({
    where: { id: db.id },
    data: { status },
  })
}

async function handleSubscriptionCanceled(subscription: AsaasSubscription) {
  const db = await prisma.subscription.findFirst({
    where: { asaasSubscriptionId: subscription.id },
    include: { plan: true },
  })
  if (!db) return
  if (db.status === 'CANCELED') {
    return
  }
  const endDate = db.endDate && db.endDate > new Date() ? db.endDate : new Date()
  await prisma.subscription.update({
    where: { id: db.id },
    data: {
      status: 'CANCELED',
      canceledAt: db.canceledAt || new Date(),
      endDate,
    },
  })
  await notifySubscriptionCanceled(db.userId, {
    planName: db.plan.name,
    endDate,
  })
}

async function handleSubscriptionPaymentFailed(payment: AsaasPayment) {
  const user = await prisma.user.findFirst({
    where: { asaasCustomerId: payment.customer },
    include: { subscription: { include: { plan: true } } },
  })
  if (!user?.subscription) return
  await prisma.subscription.updateMany({
    where: { userId: user.id },
    data: { status: 'PAST_DUE' },
  })
  await notifyPaymentFailed(user.id, {
    amount: payment.value,
    description: `Assinatura ${user.subscription.plan.name}`,
    reason: 'Pagamento da assinatura não confirmado no prazo',
  })
}
