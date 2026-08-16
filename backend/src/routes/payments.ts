import { timingSafeEqual } from 'crypto'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import {
  AsaasError,
  AsaasPayment,
  AsaasSubscription,
  cancelPaymentSilent,
  createCustomer,
  createPayment,
  createSubscription,
  getPayment,
  isAsaasConfigured,
  isAsaasPaidStatus,
  listPayments,
  listSubscriptionPayments,
  mapAsaasBillingType,
  refundPayment,
  toCheckoutPayload,
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

type CheckoutBody = {
  userId?: string
  serviceId: string
  appointmentId?: string
  packagePurchaseId?: string
  customAmount?: number
  customDescription?: string
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

async function ensureAsaasCustomer(user: {
  id: string
  name: string
  email: string
  phone: string | null
  asaasCustomerId: string | null
}) {
  if (user.asaasCustomerId) return user.asaasCustomerId
  const customer = await createCustomer({
    name: user.name,
    email: user.email,
    phone: user.phone,
    externalReference: user.id,
  })
  await prisma.user.update({
    where: { id: user.id },
    data: { asaasCustomerId: customer.id },
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

async function reuseOrCreateCharge(opts: {
  customerId: string
  value: number
  description: string
  externalReference: string
  existingPaymentId?: string | null
  expiresAt?: Date | null
}) {
  if (opts.existingPaymentId) {
    try {
      const existing = await getPayment(opts.existingPaymentId)
      if (existing.status === 'PENDING' || existing.status === 'OVERDUE') {
        return toCheckoutPayload(existing, { expiresAt: opts.expiresAt, description: opts.description })
      }
    } catch (error: any) {
      logger.warning(`Cobrança Asaas anterior indisponível (${opts.existingPaymentId}): ${error.message}`)
    }
  }

  const payment = await createPayment({
    customer: opts.customerId,
    value: opts.value,
    description: opts.description,
    externalReference: opts.externalReference,
    billingType: 'UNDEFINED',
  })
  return toCheckoutPayload(payment, { expiresAt: opts.expiresAt, description: opts.description })
}

async function listCardMethods(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.asaasCustomerId) return []
  const payments = await listPayments({
    customer: user.asaasCustomerId,
    billingType: 'CREDIT_CARD',
    limit: 20,
  })
  const unique = new Map<string, { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean }>()
  for (const payment of payments.data || []) {
    const last4 = payment.creditCard?.creditCardNumber || ''
    const brand = (payment.creditCard?.creditCardBrand || 'card').toLowerCase()
    if (!last4) continue
    const key = `${brand}-${last4}`
    if (!unique.has(key)) {
      unique.set(key, {
        id: payment.id,
        brand,
        last4,
        expMonth: 0,
        expYear: 0,
        isDefault: unique.size === 0,
      })
    }
  }
  return Array.from(unique.values())
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

      const customerId = await ensureAsaasCustomer(user)
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

      const body = request.body as { userId?: string; planId: string }
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

      const user = await prisma.user.findUnique({ where: { id: resolved.userId } })
      if (!user) {
        return reply.status(404).send({ success: false, error: 'Usuário não encontrado' })
      }
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: body.planId } })
      if (!plan) {
        return reply.status(404).send({ success: false, error: 'Plano não encontrado' })
      }

      const customerId = await ensureAsaasCustomer(user)
      const subscription = await createSubscription({
        customer: customerId,
        value: plan.price,
        description: `Charme & Bela Club - ${plan.name}`,
        externalReference: `sub_${user.id}_${plan.id}`,
      })

      const payments = await listSubscriptionPayments(subscription.id)
      const first = payments.data?.[0]
      const checkout = first
        ? await toCheckoutPayload(first, { description: `Assinatura ${plan.name}` })
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

      logger.success(`Assinatura Asaas criada: ${subscription.id}`)
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

  app.post('/payments/manage', async (request, reply) => {
    logger.route('POST', '/payments/manage')
    try {
      if (!isAsaasConfigured()) {
        return reply.status(503).send({ success: false, error: 'Asaas não configurado (ASAAS_API_KEY)' })
      }
      const body = request.body as { userId?: string }
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
      if (!user) {
        return reply.status(404).send({ success: false, error: 'Usuário não encontrado' })
      }
      if (!user.asaasCustomerId) {
        return reply.status(404).send({
          success: false,
          error: 'Nenhum pagamento Asaas encontrado. Assine um plano primeiro.',
        })
      }

      let url: string | null = null
      if (user.subscription?.asaasSubscriptionId) {
        const subPayments = await listSubscriptionPayments(user.subscription.asaasSubscriptionId)
        const pending = subPayments.data?.find((item) => item.status === 'PENDING' || item.status === 'OVERDUE')
        url = pending?.invoiceUrl || subPayments.data?.[0]?.invoiceUrl || null
      }
      if (!url) {
        const history = await listPayments({ customer: user.asaasCustomerId, limit: 1 })
        url = history.data?.[0]?.invoiceUrl || null
      }
      if (!url) {
        return reply.status(404).send({
          success: false,
          error: 'Não há fatura Asaas disponível no momento.',
        })
      }

      return reply.status(200).send({ success: true, data: { url } })
    } catch (error: any) {
      logger.error('Erro ao abrir gestão Asaas:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao abrir portal de pagamentos', details: error.message })
    }
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

      await cancelPaymentSilent(paymentId)
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
      const payment = await getPayment(paymentId)
      return reply.status(200).send({
        success: true,
        data: {
          paymentId: payment.id,
          status: payment.status,
          paid: isAsaasPaidStatus(payment.status),
          billingType: mapAsaasBillingType(payment.billingType),
          value: payment.value,
          invoiceUrl: payment.invoiceUrl || null,
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
      const user = await prisma.user.findUnique({ where: { id: resolved.userId } })
      if (!user?.asaasCustomerId) {
        return reply.status(200).send({ success: true, data: [] })
      }
      const payments = await listPayments({ customer: user.asaasCustomerId, limit: 50 })
      const history = (payments.data || []).map((payment) => ({
        id: payment.id,
        type: payment.subscription ? ('subscription' as const) : ('single' as const),
        amount: payment.value,
        totalAmount: payment.value,
        currency: 'brl',
        status: isAsaasPaidStatus(payment.status)
          ? payment.subscription
            ? 'paid'
            : 'succeeded'
          : payment.status.toLowerCase(),
        description: payment.description || (payment.subscription ? 'Assinatura Charme & Bela Club' : 'Tratamento avulso'),
        paidAt: payment.paymentDate || payment.confirmedDate || null,
        createdAt: payment.dueDate || new Date().toISOString(),
        invoicePdf: null,
        hostedInvoiceUrl: payment.invoiceUrl || null,
        receiptUrl: payment.invoiceUrl || null,
      }))
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
    const user = await prisma.user.findUnique({ where: { id: resolved.userId || userId } })
    if (!user?.asaasCustomerId) {
      return reply.status(200).send({ success: true, data: [] })
    }
    try {
      const payments = await listPayments({ customer: user.asaasCustomerId, limit: 50 })
      const history = (payments.data || []).map((payment) => ({
        id: payment.id,
        type: payment.subscription ? ('subscription' as const) : ('single' as const),
        amount: payment.value,
        totalAmount: payment.value,
        currency: 'brl',
        status: isAsaasPaidStatus(payment.status)
          ? payment.subscription
            ? 'paid'
            : 'succeeded'
          : payment.status.toLowerCase(),
        description: payment.description || (payment.subscription ? 'Assinatura Charme & Bela Club' : 'Tratamento avulso'),
        paidAt: payment.paymentDate || payment.confirmedDate || null,
        createdAt: payment.dueDate || new Date().toISOString(),
        invoicePdf: null,
        hostedInvoiceUrl: payment.invoiceUrl || null,
        receiptUrl: payment.invoiceUrl || null,
      }))
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

function parseExternalReference(ref?: string | null) {
  if (!ref) return { kind: null as string | null, id: null as string | null, extra: null as string | null }
  if (ref.startsWith('pkg_')) return { kind: 'package', id: ref.slice(4), extra: null }
  if (ref.startsWith('apt_')) return { kind: 'appointment', id: ref.slice(4), extra: null }
  if (ref.startsWith('sub_')) {
    const rest = ref.slice(4)
    const split = rest.split('_')
    return { kind: 'subscription', id: split[0] || null, extra: split.slice(1).join('_') || null }
  }
  return { kind: null, id: null, extra: null }
}

async function handlePaymentPaid(payment: AsaasPayment) {
  if (!isAsaasPaidStatus(payment.status)) return

  if (payment.subscription) {
    await handleSubscriptionInvoicePaid(payment)
    return
  }

  const ref = parseExternalReference(payment.externalReference)
  const method = mapAsaasBillingType(payment.billingType)
  const paidAmount = payment.value

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
  const asaasSubscriptionId = payment.subscription as string
  let user = await prisma.user.findFirst({
    where: { asaasCustomerId: payment.customer },
    include: { subscription: { include: { plan: true } } },
  })

  let planId = ref.extra || user?.subscription?.planId
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
  if (!planId) {
    logger.error(`Pagamento de assinatura sem planId: ${payment.id}`)
    return
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })
  const isNew = !existing || existing.status !== 'ACTIVE' || existing.planId !== planId

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      planId,
      asaasSubscriptionId,
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
  const endDate = new Date()
  await prisma.subscription.update({
    where: { id: db.id },
    data: { status: 'CANCELED', canceledAt: new Date(), endDate },
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
