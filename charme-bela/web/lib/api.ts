// Cliente da API - centraliza todas as chamadas ao backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

// ============================================
// TYPES (importados de types/index.ts)
// ============================================

export interface Service {
  id: string
  name: string
  description: string
  category: 'COMBO' | 'FACIAL' | 'CORPORAL' | 'MASSAGEM'
  duration: number
  price: number
  isActive: boolean
}

export interface Plan {
  id: string
  name: string
  tier: 'BRONZE' | 'SILVER' | 'GOLD'
  description: string
  price: number
  maxTreatmentsPerMonth: number
  maxTreatmentsPerWeek: number
  maxFacialPerMonth: number | null
  services: Service[]
  isActive: boolean
}

export interface Appointment {
  id: string
  userId: string
  serviceId: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'
  origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED'
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paymentMethod?: string
  paymentAmount?: number
  confirmedByAdmin: boolean
  canceledBy?: string
  canceledAt?: string
  cancelReason?: string
  notes?: string
  adminNotes?: string
  service?: Service
  user?: any
  voucher?: Voucher
  createdAt?: string
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  firebaseUid?: string
  role: 'CLIENT' | 'MANAGER'
  isActive: boolean
  profileImageUrl?: string
  subscription?: Subscription
  anamnesisForm?: AnamnesisForm
  appointments?: Appointment[]
  vouchers?: Voucher[]
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  plan: Plan
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'PAUSED'
  startDate: string
  minimumCommitmentEnd?: string
  currentMonthUsage?: {
    totalTreatments: number
  }
  limits?: {
    maxPerMonth: number
    maxPerDay: number
  }
  remaining?: {
    thisMonth: number
  }
}

export interface AnamnesisForm {
  id: string
  userId: string
  personalData: any
  lifestyleData: any
  healthData: any
  objectivesData: any
  termsAccepted: boolean
  termsAcceptedAt?: string
}

export interface Voucher {
  id: string
  userId: string
  type: 'FREE_TREATMENT' | 'FREE_MONTH' | 'DISCOUNT'
  description: string
  serviceId?: string
  anyService: boolean
  discountPercent?: number
  discountAmount?: number
  planId?: string
  isUsed: boolean
  usedAt?: string
  expiresAt?: string
  grantedBy: string
  grantedReason?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ============================================
// HELPER FUNCTION
// ============================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const fullUrl = `${API_URL}${endpoint}`
    console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`)
    
    // Só adiciona Content-Type se tiver body
    const headers: Record<string, string> = { ...options.headers as Record<string, string> }
    if (options.body) {
      headers['Content-Type'] = 'application/json'
    }
    
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    })
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      let errorData: any = {}
      let errorText = ''
      
      try {
        // Tenta ler como texto primeiro
        errorText = await response.text()
        // Tenta parsear como JSON
        errorData = errorText ? JSON.parse(errorText) : {}
      } catch (e) {
        // Se não for JSON válido, usa o texto
        errorData = { error: errorText || `HTTP ${response.status}` }
      }
      
      const errorMessage = errorData.error || errorData.message || errorText || `HTTP error! status: ${response.status}`
      
      // Log detalhado do erro
      console.error(`❌ Erro em ${endpoint}:`, {
        status: response.status,
        message: errorMessage,
        data: errorData,
        rawText: errorText
      })
      
      // Se é 404 em subscription, não é erro - é comportamento esperado
      const isSubscriptionNotFound = response.status === 404 && 
        endpoint.includes('/subscriptions/') && 
        errorMessage.includes('não encontrada')
      
      if (isSubscriptionNotFound) {
        console.log(`ℹ️ Usuário sem assinatura (404 - esperado)`)
      }
      
      throw new Error(errorMessage)
    }

    const result: ApiResponse<T> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Erro na requisição')
    }

    return result.data as T
  } catch (error) {
    // Não logar erro se é 404 de subscription (comportamento esperado)
    const isSubscriptionNotFound = error instanceof Error && 
      error.message.includes('não encontrada') && 
      endpoint.includes('/subscriptions/')
    
    if (!isSubscriptionNotFound) {
      console.error(`❌ Erro em ${endpoint}:`, error)
    }
    throw error
  }
}

// ============================================
// HEALTH & CONFIG
// ============================================

export async function healthCheck() {
  const response = await fetch(`${API_URL}/health`)
  return await response.json()
}

export async function getConfig() {
  return apiRequest('/config', { method: 'GET' })
}

export async function updateConfig(data: any) {
  return apiRequest('/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Buscar preços dos planos do SystemConfig
export async function getPlanPrices() {
  const config: any = await getConfig()
  return {
    bronze: config?.priceBronze || 200.00,
    silver: config?.priceSilver || 300.00,
    gold: config?.priceGold || 450.00
  }
}

// ============================================
// TESTIMONIALS (Depoimentos)
// ============================================

export async function getTestimonials(activeOnly = false) {
  const params = activeOnly ? '?activeOnly=true' : ''
  return apiRequest(`/testimonials${params}`, { method: 'GET' })
}

export async function createTestimonial(data: {
  name: string
  role: string
  avatar: string
  text: string
  rating?: number
  photoUrl?: string
  order?: number
}) {
  return apiRequest('/testimonials', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateTestimonial(id: string, data: {
  name?: string
  role?: string
  avatar?: string
  text?: string
  rating?: number
  photoUrl?: string
  order?: number
  isActive?: boolean
}) {
  return apiRequest(`/testimonials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function deleteTestimonial(id: string) {
  return apiRequest(`/testimonials/${id}`, {
    method: 'DELETE'
  })
}

// ============================================
// SERVICES
// ============================================

export async function getServices(showAll?: boolean): Promise<Service[]> {
  const params = showAll ? '?showAll=true' : ''
  return apiRequest(`/services${params}`, { method: 'GET' })
}

export async function getService(id: string): Promise<Service> {
  return apiRequest(`/services/${id}`, { method: 'GET' })
}

export async function createService(data: {
  name: string
  description: string
  category: 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO'
  duration: number
  price: number
}): Promise<Service> {
  return apiRequest('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateService(id: string, data: {
  name?: string
  description?: string
  category?: 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO'
  duration?: number
  price?: number
  isActive?: boolean
}): Promise<Service> {
  return apiRequest(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deactivateService(id: string): Promise<Service> {
  return apiRequest(`/services/${id}`, { method: 'DELETE' })
}

// ============================================
// PLANS
// ============================================

export async function getPlans(): Promise<Plan[]> {
  return apiRequest('/plans', { method: 'GET' })
}

export async function getPlan(id: string): Promise<Plan> {
  return apiRequest(`/plans/${id}`, { method: 'GET' })
}

export async function getPlanByTier(tier: 'bronze' | 'silver' | 'gold'): Promise<Plan> {
  return apiRequest(`/plans/tier/${tier}`, { method: 'GET' })
}

export async function updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
  return apiRequest(`/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function addServicesToPlan(planId: string, serviceIds: string[]): Promise<Plan> {
  return apiRequest(`/plans/${planId}/services/add`, {
    method: 'PUT',
    body: JSON.stringify({ serviceIds }),
  })
}

export async function removeServicesFromPlan(planId: string, serviceIds: string[]): Promise<Plan> {
  return apiRequest(`/plans/${planId}/services/remove`, {
    method: 'PUT',
    body: JSON.stringify({ serviceIds }),
  })
}

export async function setServicesOnPlan(planId: string, serviceIds: string[]): Promise<Plan> {
  return apiRequest(`/plans/${planId}/services/set`, {
    method: 'PUT',
    body: JSON.stringify({ serviceIds }),
  })
}

// ============================================
// USERS
// ============================================

export async function getUsers(filters?: {
  role?: 'CLIENT' | 'MANAGER'
  isActive?: boolean
}): Promise<User[]> {
  const queryParams = new URLSearchParams()
  if (filters?.role) queryParams.append('role', filters.role)
  if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive))
  
  const query = queryParams.toString()
  return apiRequest(`/users${query ? `?${query}` : ''}`, { method: 'GET' })
}

export async function getUserByFirebaseUid(firebaseUid: string): Promise<User> {
  return apiRequest(`/users/firebase/${firebaseUid}`, { method: 'GET' })
}

export async function getUser(id: string): Promise<User> {
  return apiRequest(`/users/${id}`, { method: 'GET' })
}

export async function createUser(data: {
  name: string
  email: string
  phone?: string
  firebaseUid?: string
  role?: 'CLIENT' | 'MANAGER'
  createdBy?: string
}): Promise<User> {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateUser(id: string, data: {
  name?: string
  email?: string
  phone?: string
  profileImageUrl?: string
  isActive?: boolean
}): Promise<User> {
  return apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deactivateUser(id: string): Promise<User> {
  return apiRequest(`/users/${id}`, { method: 'DELETE' })
}

// ============================================
// ANAMNESIS
// ============================================

export async function getAnamnesisList(): Promise<AnamnesisForm[]> {
  return apiRequest('/anamnesis', { method: 'GET' })
}

export async function getAnamnesisByUserId(userId: string): Promise<AnamnesisForm> {
  return apiRequest(`/anamnesis/user/${userId}`, { method: 'GET' })
}

export async function createAnamnesis(data: {
  userId: string
  personalData: any
  lifestyleData: any
  healthData: any
  objectivesData: any
  termsAccepted: boolean
}): Promise<AnamnesisForm> {
  return apiRequest('/anamnesis', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAnamnesis(userId: string, data: {
  personalData?: any
  lifestyleData?: any
  healthData?: any
  objectivesData?: any
  termsAccepted?: boolean
}): Promise<AnamnesisForm> {
  return apiRequest(`/anamnesis/user/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAnamnesis(userId: string): Promise<void> {
  return apiRequest(`/anamnesis/user/${userId}`, { method: 'DELETE' })
}

// ============================================
// APPOINTMENTS
// ============================================

export async function getAppointments(filters?: {
  userId?: string
  status?: string
  startDate?: string
  endDate?: string
}): Promise<Appointment[]> {
  const queryParams = new URLSearchParams()
  if (filters?.userId) queryParams.append('userId', filters.userId)
  if (filters?.status) queryParams.append('status', filters.status)
  if (filters?.startDate) queryParams.append('startDate', filters.startDate)
  if (filters?.endDate) queryParams.append('endDate', filters.endDate)
  
  const query = queryParams.toString()
  return apiRequest(`/appointments${query ? `?${query}` : ''}`, { method: 'GET' })
}

export async function getAppointment(id: string): Promise<Appointment> {
  return apiRequest(`/appointments/${id}`, { method: 'GET' })
}

export async function createAppointment(data: {
  userId: string
  serviceId: string
  startTime: string
  origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED'
  paymentMethod?: string
  paymentAmount?: number
  voucherId?: string
  notes?: string
}): Promise<Appointment> {
  return apiRequest('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function confirmAppointment(id: string): Promise<Appointment> {
  return apiRequest(`/appointments/${id}/confirm`, { method: 'PUT' })
}

export async function completeAppointment(id: string, paid?: boolean): Promise<Appointment> {
  return apiRequest(`/appointments/${id}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ paid })
  })
}

export async function cancelAppointment(
  id: string,
  data?: { canceledBy?: 'client' | 'admin'; cancelReason?: string; reason?: string }
): Promise<any> {
  return apiRequest(`/appointments/${id}/cancel`, {
    method: 'PUT',
    body: JSON.stringify(data || { canceledBy: 'admin' }),
  })
}

// Deletar agendamento do histórico (soft delete - apenas oculta)
export async function deleteAppointment(id: string): Promise<any> {
  return apiRequest(`/appointments/${id}`, {
    method: 'DELETE',
  })
}

// Limpar histórico completo (oculta todos concluídos/cancelados)
export async function clearHistory(userId: string): Promise<any> {
  return apiRequest(`/appointments/clear-history/${userId}`, {
    method: 'PUT',
  })
}


// ============================================
// SUBSCRIPTIONS
// ============================================

export async function getSubscriptions(filters?: {
  status?: string
}): Promise<Subscription[]> {
  const queryParams = new URLSearchParams()
  if (filters?.status) queryParams.append('status', filters.status)
  
  const query = queryParams.toString()
  return apiRequest(`/subscriptions${query ? `?${query}` : ''}`, { method: 'GET' })
}

export async function getSubscriptionByUserId(userId: string): Promise<Subscription> {
  return apiRequest(`/subscriptions/user/${userId}`, { method: 'GET' })
}

export async function createSubscription(data: {
  userId: string
  planId: string
  stripeSubscriptionId?: string
}): Promise<Subscription> {
  return apiRequest('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function cancelSubscription(
  userId: string,
  cancelReason?: string
): Promise<Subscription> {
  return apiRequest(`/subscriptions/${userId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ cancelReason }),
  })
}

export async function pauseSubscription(userId: string): Promise<Subscription> {
  return apiRequest(`/subscriptions/${userId}/pause`, { method: 'PUT' })
}

export async function reactivateSubscription(userId: string): Promise<Subscription> {
  return apiRequest(`/subscriptions/${userId}/reactivate`, { method: 'PUT' })
}

// ============================================
// SCHEDULE (Horários Disponíveis)
// ============================================

export interface AvailableSlots {
  date: string
  available: boolean
  dayOfWeek: number
  slots: string[]
  totalSlots: number
  serviceDuration: number
  bookedSlots: string[]
  totalAppointments: number
}

export async function getAvailableSlots(date: string, serviceId?: string): Promise<AvailableSlots> {
  const params = new URLSearchParams({ date })
  if (serviceId) params.append('serviceId', serviceId)
  
  return apiRequest(`/schedule/available?${params.toString()}`, {
    method: 'GET',
  })
}

export async function getAdminAvailableSlots(date: string, serviceId?: string): Promise<AvailableSlots> {
  const params = new URLSearchParams({ date })
  if (serviceId) params.append('serviceId', serviceId)
  
  return apiRequest(`/schedule/admin-slots?${params.toString()}`, {
    method: 'GET',
  })
}

export async function getManagerSchedule() {
  return apiRequest('/schedule/manager', { method: 'GET' })
}

export async function setManagerSchedule(data: {
  dayOfWeek: number
  isAvailable: boolean
  availableSlots: Array<{ start: string; end: string }>
}) {
  return apiRequest('/schedule/manager', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getScheduleOverrides(filters?: {
  startDate?: string
  endDate?: string
}) {
  const queryParams = new URLSearchParams()
  if (filters?.startDate) queryParams.append('startDate', filters.startDate)
  if (filters?.endDate) queryParams.append('endDate', filters.endDate)
  
  const query = queryParams.toString()
  return apiRequest(`/schedule/overrides${query ? `?${query}` : ''}`, {
    method: 'GET',
  })
}

export async function createScheduleOverride(data: {
  date: string
  isAvailable: boolean
  availableSlots?: Array<{ start: string; end: string }>
  reason?: string
}) {
  return apiRequest('/schedule/overrides', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteScheduleOverride(date: string) {
  return apiRequest(`/schedule/overrides/${date}`, { method: 'DELETE' })
}

// ============================================
// VOUCHERS
// ============================================

export async function getVouchers(filters?: {
  userId?: string
  isUsed?: boolean
}): Promise<Voucher[]> {
  const queryParams = new URLSearchParams()
  if (filters?.userId) queryParams.append('userId', filters.userId)
  if (filters?.isUsed !== undefined) queryParams.append('isUsed', String(filters.isUsed))
  
  const query = queryParams.toString()
  return apiRequest(`/vouchers${query ? `?${query}` : ''}`, { method: 'GET' })
}

export async function getVouchersByUserId(userId: string): Promise<Voucher[]> {
  return apiRequest(`/vouchers/user/${userId}`, { method: 'GET' })
}

export async function getVoucher(id: string): Promise<Voucher> {
  return apiRequest(`/vouchers/${id}`, { method: 'GET' })
}

export async function createVoucher(data: {
  userId: string
  type: 'FREE_TREATMENT' | 'FREE_MONTH' | 'DISCOUNT'
  description: string
  anyService?: boolean
  serviceId?: string
  discountPercent?: number
  discountAmount?: number
  planId?: string
  expiresAt?: string
  grantedBy: string
  grantedReason?: string
}): Promise<Voucher> {
  return apiRequest('/vouchers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function useVoucher(id: string): Promise<Voucher> {
  return apiRequest(`/vouchers/${id}/use`, { method: 'PUT' })
}

export async function deleteVoucher(id: string): Promise<void> {
  return apiRequest(`/vouchers/${id}`, { method: 'DELETE' })
}

// Validar voucher e calcular desconto
export interface VoucherValidation {
  voucherId: string
  voucherType: string
  voucherDescription: string
  originalPrice: number
  discount: number
  finalPrice: number
  isFree: boolean
  serviceName: string
}

export async function validateVoucher(voucherId: string, serviceId: string): Promise<VoucherValidation> {
  return apiRequest('/vouchers/validate', {
    method: 'POST',
    body: JSON.stringify({ voucherId, serviceId })
  })
}

// Ativar voucher de mês grátis
export async function activateFreeMonthVoucher(voucherId: string): Promise<Subscription> {
  return apiRequest(`/vouchers/${voucherId}/activate-free-month`, {
    method: 'POST'
  })
}

// ============================================
// AUTH HELPERS
// ============================================

export async function getOrCreateUserFromFirebase(firebaseUser: {
  uid: string
  email: string
  displayName: string
  photoURL?: string
}): Promise<User> {
  try {
    // Tenta buscar usuário pelo Firebase UID
    const user = await getUserByFirebaseUid(firebaseUser.uid)
    return user
  } catch (error) {
    // Se não encontrar, cria novo usuário
    console.log('Usuário não encontrado, criando novo...')
    
    // Pegar dados pendentes do sessionStorage (se houver)
    let phone = ''
    let name = firebaseUser.displayName || firebaseUser.email.split('@')[0]
    
    try {
      const pendingData = sessionStorage.getItem('pendingUserData')
      if (pendingData) {
        const parsed = JSON.parse(pendingData)
        phone = parsed.phone || ''
        name = parsed.name || name
      }
    } catch (e) {
      console.log('Sem dados pendentes no sessionStorage')
    }
    
    return await createUser({
      name,
      email: firebaseUser.email,
      phone,
      firebaseUid: firebaseUser.uid,
    })
  }
}

// ============================================
// ADMIN DASHBOARD
// ============================================

export interface DashboardStats {
  totalClients: number
  todayAppointments: number
  monthRevenue: number
  activeSubscriptions: number
  completedToday: number
}

export interface TodayAppointment {
  id: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'
  user: {
    id: string
    name: string
    email: string
  }
  service: {
    id: string
    name: string
    duration: number
  }
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED'
  confirmedByAdmin: boolean
}

export interface RecentActivity {
  id: string
  type: 'appointment' | 'payment' | 'client' | 'subscription'
  description: string
  createdAt: string
  userId?: string
}

export interface Birthday {
  id: string
  name: string
  email: string
  birthDate: string
  age?: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Buscar estatísticas em paralelo
    const [clients, todayAppts, subscriptions, revenue] = await Promise.all([
      getUsers({ role: 'CLIENT', isActive: true }),
      getTodayAppointments(),
      getSubscriptions({ status: 'ACTIVE' }),
      getMonthlyRevenue()
    ])

    // Filtrar apenas agendamentos ativos (não cancelados/no-show)
    const activeAppts = todayAppts.filter(apt => 
      apt.status !== 'CANCELED' && apt.status !== 'NO_SHOW'
    )
    const completedToday = activeAppts.filter(apt => apt.status === 'COMPLETED').length

    return {
      totalClients: clients.length,
      todayAppointments: activeAppts.length, // Apenas agendamentos ativos
      monthRevenue: revenue.totalRevenue, // ✅ RECEITA REAL DO STRIPE
      activeSubscriptions: subscriptions.length,
      completedToday
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    throw error
  }
}

export async function getTodayAppointments(): Promise<TodayAppointment[]> {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

  try {
    const appointments = await getAppointments({
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString()
    })

    return appointments.map(apt => ({
      id: apt.id,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      user: apt.user || { id: '', name: 'Cliente', email: '' },
      service: apt.service || { id: '', name: 'Serviço', duration: 60 },
      paymentStatus: apt.paymentStatus,
      origin: apt.origin,
      confirmedByAdmin: apt.confirmedByAdmin
    }))
  } catch (error) {
    console.error('Erro ao buscar agendamentos de hoje:', error)
    return []
  }
}

export async function rescheduleAppointment(
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
): Promise<Appointment> {
  return apiRequest(`/appointments/${appointmentId}/reschedule`, {
    method: 'PUT',
    body: JSON.stringify({ startTime: newStartTime, endTime: newEndTime })
  })
}

export async function getUpcomingBirthdays(): Promise<Birthday[]> {
  try {
    const birthdays = await apiRequest<Birthday[]>('/users/birthdays', { method: 'GET' })
    return birthdays || []
  } catch (error) {
    console.error('Erro ao buscar aniversariantes:', error)
    return []
  }
}

// ============================================
// STRIPE (Pagamentos)
// ============================================

export interface CheckoutSessionResponse {
  sessionId: string
  url: string
}

export interface CustomerPortalResponse {
  url: string
}

export interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

export interface PaymentHistory {
  id: string
  type: 'subscription' | 'single'
  amount: number
  totalAmount: number
  currency: string
  status: string // paid, open, void, uncollectible, succeeded, canceled, processing
  description: string
  paidAt: string | null
  createdAt: string
  invoicePdf: string | null
  hostedInvoiceUrl: string | null
  receiptUrl?: string | null
}

// Criar sessão de checkout (assinatura)
export async function createCheckoutSession(
  userId: string,
  planId: string
): Promise<CheckoutSessionResponse> {
  return apiRequest('/stripe/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ userId, planId })
  })
}

// Criar sessão de pagamento único (tratamento avulso)
export async function createPaymentSession(
  userId: string,
  serviceId: string,
  appointmentId?: string,
  customAmount?: number,
  customDescription?: string
): Promise<CheckoutSessionResponse> {
  return apiRequest('/stripe/create-payment-session', {
    method: 'POST',
    body: JSON.stringify({ 
      userId, 
      serviceId, 
      appointmentId,
      customAmount,
      customDescription
    })
  })
}

// Criar sessão do Customer Portal
export async function createCustomerPortalSession(
  userId: string
): Promise<CustomerPortalResponse> {
  return apiRequest('/stripe/create-portal-session', {
    method: 'POST',
    body: JSON.stringify({ userId })
  })
}

// Buscar métodos de pagamento do usuário
export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  try {
    const methods = await apiRequest<PaymentMethod[]>(`/stripe/payment-methods/${userId}`)
    return methods || []
  } catch (error) {
    console.error('Erro ao buscar métodos de pagamento:', error)
    return []
  }
}

// Buscar histórico de pagamentos
export async function getPaymentHistory(userId: string): Promise<PaymentHistory[]> {
  try {
    const history = await apiRequest<PaymentHistory[]>(`/stripe/payment-history/${userId}`)
    return history || []
  } catch (error) {
    console.error('Erro ao buscar histórico de pagamentos:', error)
    return []
  }
}

// Trocar de plano (upgrade/downgrade)
export async function changePlan(userId: string, newPlanId: string): Promise<any> {
  return apiRequest(`/subscriptions/${userId}/change-plan`, {
    method: 'PUT',
    body: JSON.stringify({ newPlanId })
  })
}

// Buscar receita do mês atual
export interface MonthlyRevenue {
  totalRevenue: number
  subscriptionRevenue: number
  singlePaymentRevenue: number
  paymentCount: number
  month: number
  year: number
}

export async function getMonthlyRevenue(): Promise<MonthlyRevenue> {
  try {
    const revenue = await apiRequest<MonthlyRevenue>('/stripe/monthly-revenue')
    return revenue
  } catch (error) {
    console.error('Erro ao buscar receita mensal:', error)
    return {
      totalRevenue: 0,
      subscriptionRevenue: 0,
      singlePaymentRevenue: 0,
      paymentCount: 0,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    }
  }
}

// ============================================
// NOTIFICATIONS (Notificações)
// ============================================

export interface Notification {
  id: string
  userId?: string | null
  type: string
  title: string
  message: string
  icon: string
  priority: string
  read: boolean
  readAt?: string
  metadata?: any
  actionUrl?: string
  actionLabel?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

// Buscar notificações
export async function getNotifications(params?: {
  userId?: string
  unreadOnly?: boolean
  limit?: number
}): Promise<Notification[]> {
  const queryParams = new URLSearchParams()
  if (params?.userId) queryParams.append('userId', params.userId)
  if (params?.unreadOnly) queryParams.append('unreadOnly', 'true')
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  
  const query = queryParams.toString()
  return apiRequest(`/notifications${query ? `?${query}` : ''}`, { method: 'GET' })
}

// Contar notificações não lidas
export async function getUnreadNotificationsCount(userId: string): Promise<{ count: number }> {
  return apiRequest(`/notifications/unread-count?userId=${userId}`, { method: 'GET' })
}

// Buscar notificação específica
export async function getNotification(id: string): Promise<Notification> {
  return apiRequest(`/notifications/${id}`, { method: 'GET' })
}

// Criar notificação
export async function createNotification(data: {
  userId?: string | null
  type: string
  title: string
  message: string
  icon?: string
  priority?: string
  metadata?: any
  actionUrl?: string
  actionLabel?: string
  expiresAt?: string
}): Promise<Notification> {
  return apiRequest('/notifications', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// Marcar notificação como lida
export async function markNotificationAsRead(id: string): Promise<Notification> {
  return apiRequest(`/notifications/${id}/read`, { method: 'PUT' })
}

// Marcar todas as notificações como lidas
export async function markAllNotificationsAsRead(userId: string): Promise<{ count: number; message: string }> {
  return apiRequest('/notifications/mark-all-read', {
    method: 'PUT',
    body: JSON.stringify({ userId })
  })
}

// Deletar notificação
export async function deleteNotification(id: string): Promise<{ message: string }> {
  return apiRequest(`/notifications/${id}`, { method: 'DELETE' })
}

// Limpar todas as notificações
export async function clearAllNotifications(userId: string): Promise<{ count: number; message: string }> {
  return apiRequest(`/notifications/clear-all?userId=${userId}`, { method: 'DELETE' })
}

// Limpar notificações expiradas
export async function clearExpiredNotifications(): Promise<{ count: number; message: string }> {
  return apiRequest('/notifications/clear-expired', { method: 'DELETE' })
}