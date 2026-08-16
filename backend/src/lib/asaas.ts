import { logger } from '../utils/logger'

const DEFAULT_SANDBOX = 'https://api-sandbox.asaas.com'

export function asaasBaseUrl() {
  return (process.env.ASAAS_BASE_URL || DEFAULT_SANDBOX).replace(/\/$/, '')
}

export function isAsaasConfigured() {
  return Boolean(process.env.ASAAS_API_KEY)
}

export class AsaasError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 500) {
    super(message)
    this.name = 'AsaasError'
    this.statusCode = statusCode
  }
}

export type AsaasBillingType =
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BOLETO'
  | 'UNDEFINED'

export type AsaasPaymentStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'RECEIVED_IN_CASH'
  | 'REFUND_REQUESTED'
  | 'REFUND_IN_PROGRESS'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL'
  | 'DELETED'
  | string

export type AsaasCustomer = {
  id: string
  name: string
  email?: string
  cpfCnpj?: string
}

export type AsaasCreditCardSummary = {
  creditCardNumber?: string
  creditCardBrand?: string
}

export type AsaasPayment = {
  id: string
  customer: string
  subscription?: string | null
  billingType: AsaasBillingType | string
  value: number
  netValue?: number
  status: AsaasPaymentStatus
  description?: string
  externalReference?: string | null
  invoiceUrl?: string | null
  dueDate?: string
  paymentDate?: string | null
  confirmedDate?: string | null
  creditCard?: AsaasCreditCardSummary | null
  deleted?: boolean
}

export type AsaasPixQr = {
  encodedImage?: string
  payload?: string
  expirationDate?: string
}

export type AsaasSubscription = {
  id: string
  customer: string
  billingType: string
  value: number
  cycle: string
  description?: string
  status: string
  nextDueDate?: string
  externalReference?: string | null
}

export type AsaasList<T> = {
  data: T[]
  hasMore?: boolean
  totalCount?: number
}

type AsaasErrorBody = {
  errors?: Array<{ code?: string; description?: string }>
  message?: string
}

function apiKey() {
  const key = process.env.ASAAS_API_KEY
  if (!key) {
    throw new AsaasError('ASAAS_API_KEY não configurada no servidor', 503)
  }
  return key
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${asaasBaseUrl()}/v3${path}`
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: apiKey(),
      ...(init?.headers || {}),
    },
  })

  const text = await response.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const body = json as AsaasErrorBody | null
    const description =
      body?.errors?.[0]?.description || body?.message || `Asaas HTTP ${response.status}`
    logger.error(`Asaas ${init?.method || 'GET'} ${path} falhou: ${description}`)
    throw new AsaasError(description, response.status)
  }

  return json as T
}

export function todaySaoPauloISODate(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function mapAsaasBillingType(billingType?: string | null): 'pix' | 'credit_card' | 'debit_card' | string {
  if (billingType === 'PIX') return 'pix'
  if (billingType === 'CREDIT_CARD') return 'credit_card'
  if (billingType === 'DEBIT_CARD') return 'debit_card'
  return (billingType || 'unknown').toLowerCase()
}

export function isAsaasPaidStatus(status?: string | null) {
  return status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH'
}

function digitsOnly(value?: string | null) {
  return (value || '').replace(/\D/g, '')
}

export async function createCustomer(input: {
  name: string
  email: string
  phone?: string | null
  externalReference: string
}) {
  const mobile = digitsOnly(input.phone)
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      mobilePhone: mobile.length >= 10 ? mobile : undefined,
      notificationDisabled: false,
      externalReference: input.externalReference,
    }),
  })
}

export async function createPayment(input: {
  customer: string
  value: number
  description: string
  externalReference: string
  billingType?: AsaasBillingType
}) {
  return asaasFetch<AsaasPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType || 'UNDEFINED',
      value: Number(input.value.toFixed(2)),
      dueDate: todaySaoPauloISODate(),
      description: input.description.slice(0, 500),
      externalReference: input.externalReference.slice(0, 100),
      postalService: false,
    }),
  })
}

export async function getPayment(id: string) {
  return asaasFetch<AsaasPayment>(`/payments/${id}`)
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQr | null> {
  try {
    return await asaasFetch<AsaasPixQr>(`/payments/${paymentId}/pixQrCode`)
  } catch (error) {
    if (error instanceof AsaasError && (error.statusCode === 400 || error.statusCode === 404)) {
      return null
    }
    throw error
  }
}

export async function cancelPayment(paymentId: string) {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`, { method: 'DELETE' })
}

export async function cancelPaymentSilent(paymentId: string | null | undefined) {
  if (!paymentId) return
  try {
    await cancelPayment(paymentId)
    logger.info(`Cobrança Asaas cancelada: ${paymentId}`)
  } catch (error: any) {
    logger.warning(`Não foi possível cancelar cobrança Asaas ${paymentId}: ${error.message}`)
  }
}

export async function refundPayment(paymentId: string, value?: number, description?: string) {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify({
      ...(value != null ? { value: Number(value.toFixed(2)) } : {}),
      ...(description ? { description: description.slice(0, 255) } : {}),
    }),
  })
}

export async function listPayments(params: {
  customer?: string
  subscription?: string
  status?: string
  billingType?: string
  'dateCreated[ge]'?: string
  'dateCreated[le]'?: string
  'paymentDate[ge]'?: string
  'paymentDate[le]'?: string
  offset?: number
  limit?: number
}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return asaasFetch<AsaasList<AsaasPayment>>(`/payments${qs ? `?${qs}` : ''}`)
}

export async function createSubscription(input: {
  customer: string
  value: number
  description: string
  externalReference: string
  cycle?: 'MONTHLY' | 'WEEKLY' | 'YEARLY'
}) {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customer,
      billingType: 'UNDEFINED',
      value: Number(input.value.toFixed(2)),
      nextDueDate: todaySaoPauloISODate(),
      cycle: input.cycle || 'MONTHLY',
      description: input.description.slice(0, 500),
      externalReference: input.externalReference.slice(0, 100),
    }),
  })
}

export async function getSubscription(id: string) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`)
}

export async function listSubscriptionPayments(subscriptionId: string) {
  return asaasFetch<AsaasList<AsaasPayment>>(`/subscriptions/${subscriptionId}/payments`)
}

export async function updateSubscriptionValue(id: string, value: number) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      value: Number(value.toFixed(2)),
      updatePendingPayments: true,
    }),
  })
}

export async function cancelSubscription(id: string) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`, { method: 'DELETE' })
}

export type CheckoutPayload = {
  paymentId: string
  sessionId: string
  url: string | null
  invoiceUrl: string | null
  pixCopyPaste: string | null
  pixQrBase64: string | null
  expiresAt?: string | null
  amount: number
  description: string
}

export async function toCheckoutPayload(
  payment: AsaasPayment,
  extras?: { expiresAt?: Date | string | null; description?: string },
): Promise<CheckoutPayload> {
  const pix = await getPixQrCode(payment.id)
  const invoiceUrl = payment.invoiceUrl || null
  return {
    paymentId: payment.id,
    sessionId: payment.id,
    url: invoiceUrl,
    invoiceUrl,
    pixCopyPaste: pix?.payload || null,
    pixQrBase64: pix?.encodedImage || null,
    expiresAt: extras?.expiresAt ? new Date(extras.expiresAt).toISOString() : pix?.expirationDate || null,
    amount: payment.value,
    description: extras?.description || payment.description || 'Charme & Bela',
  }
}
