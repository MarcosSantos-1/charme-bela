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
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || `HTTP error! status: ${response.status}`
      
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
    bronze: config?.priceBronze || 119.90,
    silver: config?.priceSilver || 139.90,
    gold: config?.priceGold || 169.90
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
    const [clients, todayAppts, subscriptions] = await Promise.all([
      getUsers({ role: 'CLIENT', isActive: true }),
      getTodayAppointments(),
      getSubscriptions({ status: 'ACTIVE' })
    ])

    // Calcular receita do mês (simulado - depois conectar com pagamentos reais)
    const monthRevenue = 0 // TODO: Implementar cálculo de receita

    // Filtrar apenas agendamentos ativos (não cancelados/no-show)
    const activeAppts = todayAppts.filter(apt => 
      apt.status !== 'CANCELED' && apt.status !== 'NO_SHOW'
    )
    const completedToday = activeAppts.filter(apt => apt.status === 'COMPLETED').length

    return {
      totalClients: clients.length,
      todayAppointments: activeAppts.length, // Apenas agendamentos ativos
      monthRevenue,
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
    const clients = await getUsers({ role: 'CLIENT', isActive: true })
    const today = new Date()
    const currentMonth = today.getMonth()
    
    const birthdays = clients
      .filter(client => {
        // Filtrar clientes que têm data de nascimento
        // TODO: Adicionar campo birthDate no User
        return false // Por enquanto retorna vazio até adicionar campo
      })
      .map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        birthDate: '', // TODO: Usar client.birthDate quando disponível
        age: 0
      }))
      .sort((a, b) => {
        // Ordenar por data de aniversário
        return 0
      })

    return birthdays
  } catch (error) {
    console.error('Erro ao buscar aniversariantes:', error)
    return []
  }
}
