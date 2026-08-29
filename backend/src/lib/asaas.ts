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
  code?: string
  constructor(message: string, statusCode = 500, code?: string) {
    super(message)
    this.name = 'AsaasError'
    this.statusCode = statusCode
    this.code = code
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
  creditCardToken?: string
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
  transactionReceiptUrl?: string | null
  dueDate?: string
  paymentDate?: string | null
  confirmedDate?: string | null
  creditCard?: AsaasCreditCardSummary | null
  creditCardToken?: string | null
  installment?: string | null
  installmentCount?: number | null
  installmentNumber?: number | null
  deleted?: boolean
}

export function asaasInstallmentCount(payment: Pick<AsaasPayment, 'installment' | 'installmentCount'>): number {
  if (typeof payment.installmentCount === 'number' && payment.installmentCount >= 2) {
    return payment.installmentCount
  }
  return payment.installment ? 0 : 1
}

export function chargeMatchesInstallments(
  payment: Pick<AsaasPayment, 'installment' | 'installmentCount'>,
  requested?: number,
) {
  const want = requested && requested >= 2 ? requested : 1
  const have = asaasInstallmentCount(payment)
  return have === want
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
  creditCard?: AsaasCreditCardSummary | null
}

export type AsaasCheckout = {
  id: string
  link?: string | null
  status?: string
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
      'User-Agent': 'CharmeBela/1.0 (Node.js)',
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
    throw new AsaasError(description, response.status, body?.errors?.[0]?.code)
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

/** CPF (11) ou CNPJ (14). Asaas recusa cobrança se o cliente não tiver documento. */
export function normalizeCpfCnpj(value?: string | null): string | null {
  const digits = digitsOnly(value)
  if (digits.length === 11 || digits.length === 14) return digits
  return null
}

/** DDD + número local. Rejeita placeholder tipo 11999999999 (Asaas: "celular informado é inválido"). */
export function isPlausibleBrLocalPhone(local: string): boolean {
  if (local.length !== 10 && local.length !== 11) return false
  if (local[0] === '0') return false
  const subscriber = local.slice(2)
  if (!subscriber || /^(\d)\1+$/.test(subscriber)) return false
  if (local.length === 11 && subscriber[0] !== '9') return false
  return true
}

/**
 * Celular/fixo BR para o Asaas: DDD + número, sem DDI 55.
 * `+5511987654321` / `5511987654321` → `11987654321`.
 * Não remove `55` de números com 10–11 dígitos (DDD 55 existe no RS).
 */
export function normalizeAsaasMobilePhone(value?: string | null): string | null {
  let digits = digitsOnly(value)
  while (digits.startsWith('0') && digits.length > 11) {
    digits = digits.replace(/^0+/, '')
  }
  while (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2)
  }
  if (!isPlausibleBrLocalPhone(digits)) return null
  return digits
}

/** Primeiro telefone que o Asaas aceita, entre cadastro Firebase e anamnese. */
export function pickAsaasPhone(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (normalizeAsaasMobilePhone(value)) return value || null
  }
  return null
}

/**
 * Asaas: no cadastro do cliente, `phone` é fixo (10 dígitos, não pode começar com 9 após o DDD)
 * e `mobilePhone` é celular. Checkout hospedado usa um único `customerData.phone` (10 ou 11 dígitos).
 */
export function asaasPhonePayload(value?: string | null): { phone?: string; mobilePhone?: string } {
  const local = normalizeAsaasMobilePhone(value)
  if (!local) return {}
  const subscriber = local.slice(2)
  if (local.length === 11 || subscriber.startsWith('9')) {
    return { mobilePhone: local }
  }
  return { phone: local }
}

/** Campo único do checkout hospedado — aceita celular 11 dígitos (`47988887777`). */
export function asaasCheckoutPhone(value?: string | null): string | null {
  return normalizeAsaasMobilePhone(value)
}

export function isAsaasPhoneError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return (
    /celular informado é inválido/i.test(message) ||
    /telefone informado é inválido/i.test(message) ||
    /invalid (phone|mobile)/i.test(message)
  )
}

export function asaasCustomerEmail(email?: string | null) {
  const value = (email || '').trim()
  if (!value) return null
  if (value.toLowerCase().endsWith('@phone.charmebela.local')) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
  return value
}

export type AsaasCustomerAddress = {
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  /** Código IBGE da cidade (Asaas exige integer em `city`, não o nome). */
  cityIbge?: string
}

export function addressFromAnamnesisPersonalData(personalData: unknown): AsaasCustomerAddress | null {
  if (!personalData || typeof personalData !== 'object') return null
  const addr = (personalData as { address?: Record<string, unknown> }).address
  if (!addr || typeof addr !== 'object') return null
  const postalCode = digitsOnly(String(addr.cep ?? ''))
  const street = String(addr.street ?? '').trim()
  const addressNumber = String(addr.number ?? '').trim()
  const complement = String(addr.complement ?? '').trim()
  const province = String(addr.neighborhood ?? '').trim()
  const cityIbge = digitsOnly(String(addr.ibge ?? ''))
  if (!postalCode && !street) return null
  return {
    ...(postalCode ? { postalCode } : {}),
    ...(street ? { address: street } : {}),
    ...(addressNumber ? { addressNumber } : {}),
    ...(complement ? { complement } : {}),
    ...(province ? { province } : {}),
    ...(cityIbge ? { cityIbge } : {}),
  }
}

export function phoneFromAnamnesisPersonalData(personalData: unknown): string | null {
  if (!personalData || typeof personalData !== 'object') return null
  const phone = (personalData as { phone?: unknown }).phone
  return normalizeAsaasMobilePhone(phone == null ? null : String(phone))
}

/** Completa o IBGE pelo CEP quando a ficha ainda não gravou o código. */
export async function enrichAsaasAddress(
  address?: AsaasCustomerAddress | null,
): Promise<AsaasCustomerAddress | null> {
  if (!address) return null
  if (digitsOnly(address.cityIbge).length >= 6) return address
  const cep = digitsOnly(address.postalCode)
  if (cep.length !== 8) return address
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = (await response.json()) as { erro?: boolean; ibge?: string; bairro?: string }
    if (data?.erro || !data?.ibge) return address
    return {
      ...address,
      cityIbge: digitsOnly(data.ibge),
      ...(!address.province && data.bairro ? { province: String(data.bairro).trim() } : {}),
    }
  } catch {
    return address
  }
}

function asaasAddressPayload(address?: AsaasCustomerAddress | null) {
  if (!address) return {}
  const postalCode = digitsOnly(address.postalCode)
  const cityIbge = digitsOnly(address.cityIbge)
  const rawNumber = address.addressNumber?.trim() || ''
  return {
    ...(postalCode.length === 8 ? { postalCode } : {}),
    ...(address.address?.trim() ? { address: address.address.trim() } : {}),
    ...(rawNumber
      ? { addressNumber: /^\d+$/.test(rawNumber) ? Number(rawNumber) : rawNumber }
      : {}),
    ...(address.complement?.trim() ? { complement: address.complement.trim() } : {}),
    ...(address.province?.trim() ? { province: address.province.trim() } : {}),
    ...(cityIbge.length >= 6 ? { city: Number(cityIbge) } : {}),
  }
}

export async function createCustomer(input: {
  name: string
  email: string
  phone?: string | null
  cpfCnpj: string
  externalReference: string
  address?: AsaasCustomerAddress | null
}) {
  const email = asaasCustomerEmail(input.email)
  const body = {
    name: input.name,
    ...(email ? { email } : {}),
    cpfCnpj: input.cpfCnpj,
    ...asaasAddressPayload(input.address),
    notificationDisabled: true,
    externalReference: input.externalReference,
  }
  try {
    const customer = await asaasFetch<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({ ...body, ...asaasPhonePayload(input.phone) }),
    })
    await silenceAsaasCustomer(customer.id)
    return customer
  } catch (error) {
    if (!isAsaasPhoneError(error)) throw error
    logger.warning('Asaas recusou o telefone na criação do cliente; repetindo sem phone/mobilePhone')
    const customer = await asaasFetch<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    await silenceAsaasCustomer(customer.id)
    return customer
  }
}

export async function updateCustomer(
  id: string,
  input: {
    name?: string
    email?: string
    phone?: string | null
    cpfCnpj: string
    address?: AsaasCustomerAddress | null
  },
) {
  const email = asaasCustomerEmail(input.email)
  const body = {
    ...(input.name ? { name: input.name } : {}),
    ...(email ? { email } : {}),
    cpfCnpj: input.cpfCnpj,
    ...asaasAddressPayload(input.address),
    notificationDisabled: true,
  }
  try {
    const customer = await asaasFetch<AsaasCustomer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...body, ...asaasPhonePayload(input.phone) }),
    })
    await silenceAsaasCustomer(id)
    return customer
  } catch (error) {
    if (!isAsaasPhoneError(error)) throw error
    logger.warning(`Asaas recusou o telefone ao atualizar ${id}; repetindo sem phone/mobilePhone`)
    const customer = await asaasFetch<AsaasCustomer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    await silenceAsaasCustomer(id)
    return customer
  }
}

type AsaasCustomerNotification = {
  id: string
  enabled?: boolean
  emailEnabledForCustomer?: boolean
  smsEnabledForCustomer?: boolean
  phoneCallEnabledForCustomer?: boolean
  whatsappEnabledForCustomer?: boolean
}

/** Desliga e-mail/SMS/WhatsApp do pagador. Evita o e-mail de Pix cancelado. */
export async function silenceAsaasCustomer(customerId: string | null | undefined) {
  if (!customerId) return
  try {
    await asaasFetch<AsaasCustomer>(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify({ notificationDisabled: true }),
    })
  } catch (error: any) {
    logger.warning(`Não foi possível marcar notificationDisabled em ${customerId}: ${error.message}`)
  }
  try {
    const listed = await asaasFetch<AsaasList<AsaasCustomerNotification>>(
      `/customers/${customerId}/notifications`,
    )
    const notifications = (listed.data || []).map((item) => ({
      id: item.id,
      enabled: false,
      emailEnabledForCustomer: false,
      smsEnabledForCustomer: false,
      phoneCallEnabledForCustomer: false,
      whatsappEnabledForCustomer: false,
    }))
    if (!notifications.length) return
    await asaasFetch('/notifications/batch', {
      method: 'POST',
      body: JSON.stringify({ customer: customerId, notifications }),
    })
  } catch (error: any) {
    logger.warning(`Não foi possível desligar notificações Asaas de ${customerId}: ${error.message}`)
  }
}

export async function createPayment(input: {
  customer: string
  value: number
  description: string
  externalReference: string
  billingType?: AsaasBillingType
  notificationDisabled?: boolean
  installmentCount?: number
}) {
  const installmentCount =
    input.installmentCount && input.installmentCount >= 2 ? input.installmentCount : undefined
  const total = Number(input.value.toFixed(2))
  return asaasFetch<AsaasPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType || 'UNDEFINED',
      ...(installmentCount
        ? { installmentCount, totalValue: total }
        : { value: total }),
      dueDate: todaySaoPauloISODate(),
      description: input.description.slice(0, 500),
      externalReference: input.externalReference.slice(0, 100),
      postalService: false,
      notificationDisabled: input.notificationDisabled ?? true,
    }),
  })
}

export async function getPayment(id: string) {
  return asaasFetch<AsaasPayment>(`/payments/${id}`)
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQr | null> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const pix = await asaasFetch<AsaasPixQr>(`/payments/${paymentId}/pixQrCode`)
      if (pix?.payload || pix?.encodedImage) return pix
    } catch (error) {
      lastError = error
      const retryable =
        error instanceof AsaasError && (error.statusCode === 400 || error.statusCode === 404)
      if (!retryable) throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
  }
  if (lastError instanceof AsaasError) {
    logger.warning(`Pix QR indisponível para ${paymentId}: ${lastError.message}`)
  }
  return null
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

/**
 * Tenta estornar o valor pedido. Se o Asaas recusar por saldo (taxas do PIX
 * não voltam), tenta `netValue` da cobrança — só quando o pedido é o valor cheio.
 */
export async function refundPaymentWithFallback(
  paymentId: string,
  requestedValue: number,
  description?: string,
  options?: { allowNetValueFallback?: boolean },
): Promise<{ payment: AsaasPayment; refundedValue: number; usedNetValue: boolean }> {
  const amount = Number(requestedValue.toFixed(2))
  try {
    const payment = await refundPayment(paymentId, amount, description)
    return { payment, refundedValue: amount, usedNetValue: false }
  } catch (error) {
    const allowFallback = options?.allowNetValueFallback !== false
    if (!allowFallback || !(error instanceof AsaasError) || error.statusCode !== 400) {
      throw error
    }

    const current = await getPayment(paymentId)
    const net = current.netValue != null ? Number(current.netValue.toFixed(2)) : null
    if (net == null || net <= 0 || net >= amount - 0.009) {
      throw error
    }

    logger.warning(
      `Estorno de R$ ${amount.toFixed(2)} recusado para ${paymentId}. Tentando líquido R$ ${net.toFixed(2)}.`,
    )
    const payment = await refundPayment(paymentId, net, description)
    return { payment, refundedValue: net, usedNetValue: true }
  }
}

export async function cancelPendingByExternalReference(
  externalReference?: string | null,
  exceptPaymentId?: string | null,
) {
  if (!externalReference) return
  try {
    const listed = await listPayments({ externalReference, limit: 20 })
    for (const payment of listed.data || []) {
      if (exceptPaymentId && payment.id === exceptPaymentId) continue
      if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
        await cancelPaymentSilent(payment.id)
      }
    }
  } catch (error: any) {
    logger.warning(
      `Não foi possível cancelar cobranças irmãs de ${externalReference}: ${error.message}`,
    )
  }
}

export async function payChargeWithCardToken(
  paymentId: string,
  creditCardToken: string,
  remoteIp: string,
) {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}/payWithCreditCard`, {
    method: 'POST',
    body: JSON.stringify({ creditCardToken, remoteIp }),
  })
}

export async function createPaymentWithCardToken(input: {
  customer: string
  value: number
  description: string
  externalReference: string
  creditCardToken: string
  remoteIp: string
  installmentCount?: number
}) {
  const installmentCount =
    input.installmentCount && input.installmentCount >= 2 ? input.installmentCount : undefined
  const total = Number(input.value.toFixed(2))
  return asaasFetch<AsaasPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customer,
      billingType: 'CREDIT_CARD',
      ...(installmentCount
        ? { installmentCount, totalValue: total }
        : { value: total }),
      dueDate: todaySaoPauloISODate(),
      description: input.description.slice(0, 500),
      externalReference: input.externalReference.slice(0, 100),
      creditCardToken: input.creditCardToken,
      remoteIp: input.remoteIp,
      postalService: false,
      notificationDisabled: true,
    }),
  })
}

export function cardBrandLabel(brand?: string | null) {
  const value = (brand || '').toLowerCase()
  if (value.includes('master')) return 'Mastercard'
  if (value.includes('visa')) return 'Visa'
  if (value.includes('amex') || value.includes('american')) return 'American Express'
  if (value.includes('elo')) return 'Elo'
  if (value.includes('hiper')) return 'Hipercard'
  if (value.includes('diners')) return 'Diners'
  return brand ? brand : 'Cartão'
}

export async function listPayments(params: {
  customer?: string
  subscription?: string
  status?: string
  billingType?: string
  externalReference?: string
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
  billingType?: AsaasBillingType
  creditCardToken?: string
  remoteIp?: string
  nextDueDate?: string
}) {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customer,
      billingType: input.billingType || 'CREDIT_CARD',
      value: Number(input.value.toFixed(2)),
      nextDueDate: input.nextDueDate || todaySaoPauloISODate(),
      cycle: input.cycle || 'MONTHLY',
      description: input.description.slice(0, 500),
      externalReference: input.externalReference.slice(0, 100),
      notificationDisabled: true,
      ...(input.creditCardToken
        ? { creditCardToken: input.creditCardToken, remoteIp: input.remoteIp }
        : {}),
    }),
  })
}

export async function getSubscription(id: string) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`)
}

export async function listSubscriptionPayments(subscriptionId: string) {
  return asaasFetch<AsaasList<AsaasPayment>>(`/subscriptions/${subscriptionId}/payments`)
}

export async function updateSubscription(
  id: string,
  input: {
    value?: number
    description?: string
    externalReference?: string
    updatePendingPayments?: boolean
    status?: 'ACTIVE' | 'INACTIVE'
    nextDueDate?: string
  },
) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...(input.value != null ? { value: Number(input.value.toFixed(2)) } : {}),
      ...(input.description ? { description: input.description.slice(0, 500) } : {}),
      ...(input.externalReference ? { externalReference: input.externalReference.slice(0, 100) } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.nextDueDate ? { nextDueDate: input.nextDueDate } : {}),
      updatePendingPayments: input.updatePendingPayments !== false,
    }),
  })
}

export async function cancelPendingSubscriptionPayments(subscriptionId: string) {
  try {
    const listed = await listSubscriptionPayments(subscriptionId)
    for (const item of listed.data || []) {
      if (item.status === 'PENDING' || item.status === 'OVERDUE') {
        await cancelPaymentSilent(item.id)
      }
    }
  } catch (error: any) {
    logger.warning(`Não foi possível limpar cobranças pendentes de ${subscriptionId}: ${error.message}`)
  }
}

export async function updateSubscriptionValue(id: string, value: number, updatePendingPayments = true) {
  return updateSubscription(id, { value, updatePendingPayments })
}

export type AsaasCreditCardHolderInfo = {
  name: string
  email: string
  cpfCnpj: string
  postalCode?: string
  addressNumber?: string
  addressComplement?: string | null
  phone?: string | null
  mobilePhone?: string | null
}

/** Troca o cartão da assinatura sem gerar cobrança nova. */
export async function updateSubscriptionCreditCard(
  id: string,
  input: {
    creditCardToken: string
    remoteIp: string
    holder?: AsaasCreditCardHolderInfo | null
  },
) {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${id}/creditCard`, {
    method: 'PUT',
    body: JSON.stringify({
      creditCardToken: input.creditCardToken,
      remoteIp: input.remoteIp,
      ...(input.holder
        ? {
            creditCardHolderInfo: {
              name: input.holder.name,
              email: input.holder.email,
              cpfCnpj: input.holder.cpfCnpj,
              ...(input.holder.postalCode ? { postalCode: input.holder.postalCode } : {}),
              ...(input.holder.addressNumber ? { addressNumber: input.holder.addressNumber } : {}),
              ...(input.holder.addressComplement
                ? { addressComplement: input.holder.addressComplement }
                : {}),
              ...asaasPhonePayload(input.holder.mobilePhone || input.holder.phone),
            },
          }
        : {}),
    }),
  })
}

export function extractCardToken(payment: {
  creditCardToken?: string | null
  creditCard?: AsaasCreditCardSummary | null
}) {
  return payment.creditCardToken || payment.creditCard?.creditCardToken || null
}

export function isCheckoutSessionId(id?: string | null) {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
}

export async function cancelSubscriptionSilent(subscriptionId: string | null | undefined) {
  if (!subscriptionId) return
  try {
    await cancelSubscription(subscriptionId)
    logger.info(`Assinatura Asaas cancelada: ${subscriptionId}`)
  } catch (error: any) {
    logger.warning(`Não foi possível cancelar assinatura Asaas ${subscriptionId}: ${error.message}`)
  }
}

export async function listSubscriptions(params: {
  customer?: string
  externalReference?: string
  status?: string
  offset?: number
  limit?: number
}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return asaasFetch<AsaasList<AsaasSubscription>>(`/subscriptions${qs ? `?${qs}` : ''}`)
}

const CHECKOUT_ITEM_IMAGE =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

/** Checkout hospedado Asaas só aceita CREDIT_CARD e PIX — DEBIT_CARD retorna "billingTypes inválido". */
export function hostedCheckoutBillingTypes(requested?: AsaasBillingType[]): Array<'CREDIT_CARD' | 'PIX'> {
  const allowed = (requested || []).filter((type): type is 'CREDIT_CARD' | 'PIX' => type === 'CREDIT_CARD' || type === 'PIX')
  if (allowed.length) return [...new Set(allowed)]
  return ['CREDIT_CARD']
}

export async function createCreditCardCheckout(input: {
  customerId?: string
  customerName: string
  customerEmail: string
  customerCpf: string
  customerPhone?: string | null
  customerAddress?: AsaasCustomerAddress | null
  value: number
  name: string
  description: string
  externalReference: string
  recurrent?: boolean
  billingTypes?: AsaasBillingType[]
  successQuery?: string
}) {
  const frontend = (process.env.FRONTEND_URL || 'https://localhost').replace(/\/$/, '')
  const email = asaasCustomerEmail(input.customerEmail)
  const checkoutPhone = asaasCheckoutPhone(input.customerPhone)
  const customerData = {
    name: input.customerName,
    cpfCnpj: input.customerCpf,
    ...(email ? { email } : {}),
    ...(checkoutPhone ? { phone: checkoutPhone } : {}),
    ...asaasAddressPayload(input.customerAddress),
  }

  const postCheckout = (customerPayload: { customer: string } | { customerData: typeof customerData }) =>
    asaasFetch<AsaasCheckout>('/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        billingTypes: hostedCheckoutBillingTypes(input.billingTypes),
        chargeTypes: input.recurrent ? ['RECURRENT'] : ['DETACHED'],
        minutesToExpire: 60,
        externalReference: input.externalReference.slice(0, 200),
        callback: {
          successUrl: `${frontend}/cliente/checkout?${input.successQuery || 'success=true'}`,
          cancelUrl: `${frontend}/cliente/checkout?canceled=true`,
          expiredUrl: `${frontend}/cliente/checkout?canceled=true`,
        },
        items: [
          {
            name: input.name.slice(0, 30),
            description: input.description.slice(0, 150),
            quantity: 1,
            value: Number(input.value.toFixed(2)),
            imageBase64: CHECKOUT_ITEM_IMAGE,
          },
        ],
        ...customerPayload,
        ...(input.recurrent
          ? {
              subscription: {
                cycle: 'MONTHLY',
                nextDueDate: todaySaoPauloISODate(),
              },
            }
          : {}),
      }),
    })

  if (!input.customerId) {
    try {
      return await postCheckout({ customerData })
    } catch (error) {
      if (!isAsaasPhoneError(error) || !checkoutPhone) throw error
      logger.warning('Checkout Asaas recusou customerData.phone; gerando sem telefone para o cliente preencher')
      return postCheckout({
        customerData: {
          name: input.customerName,
          cpfCnpj: input.customerCpf,
          ...(email ? { email } : {}),
          ...asaasAddressPayload(input.customerAddress),
        },
      })
    }
  }
  try {
    return await postCheckout({ customer: input.customerId })
  } catch (error) {
    if (!isAsaasPhoneError(error)) throw error
    logger.warning(
      `Checkout Asaas recusou o telefone do cliente ${input.customerId}; tentando customerData`,
    )
    try {
      return await postCheckout({ customerData })
    } catch (second) {
      if (!isAsaasPhoneError(second)) throw second
      logger.warning('Checkout Asaas recusou customerData.phone; gerando sem telefone para o cliente preencher')
      return postCheckout({
        customerData: {
          name: input.customerName,
          cpfCnpj: input.customerCpf,
          ...(email ? { email } : {}),
          ...asaasAddressPayload(input.customerAddress),
        },
      })
    }
  }
}

export async function getCheckout(id: string) {
  return asaasFetch<AsaasCheckout>(`/checkouts/${id}`)
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
  installmentCount?: number
}

export async function toCheckoutPayload(
  payment: AsaasPayment,
  extras?: {
    expiresAt?: Date | string | null
    description?: string
    invoiceUrl?: string | null
    amount?: number
    installmentCount?: number
  },
): Promise<CheckoutPayload> {
  const canHavePix = payment.billingType !== 'CREDIT_CARD' && payment.billingType !== 'BOLETO'
  const pix = canHavePix ? await getPixQrCode(payment.id) : null
  const invoiceUrl = extras?.invoiceUrl || payment.invoiceUrl || null
  const installmentCount = extras?.installmentCount || asaasInstallmentCount(payment)
  return {
    paymentId: payment.id,
    sessionId: payment.id,
    url: invoiceUrl,
    invoiceUrl,
    pixCopyPaste: pix?.payload || null,
    pixQrBase64: pix?.encodedImage || null,
    expiresAt: extras?.expiresAt ? new Date(extras.expiresAt).toISOString() : pix?.expirationDate || null,
    amount: extras?.amount ?? payment.value,
    description: extras?.description || payment.description || 'Charme & Bela',
    ...(installmentCount >= 2 ? { installmentCount } : {}),
  }
}
