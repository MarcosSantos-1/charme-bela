export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: 'CLIENT' | 'MANAGER'
  profileImageUrl?: string
  firebaseUid?: string
  isActive: boolean
  subscription?: Subscription
  anamnesisForm?: AnamnesisForm
  appointments?: Appointment[]
  vouchers?: Voucher[]
  createdAt?: string
  updatedAt?: string
}

export interface Service {
  id: string
  name: string
  description: string
  category: 'COMBO' | 'FACIAL' | 'CORPORAL' | 'MASSAGEM'
  duration: number
  price: number
  isActive: boolean
  machineKind?: 'LASER' | 'CRYO' | null
  allowOnSubscription?: boolean
  packageSessionCount?: number | null
  installmentsAllowed?: boolean
  packageItems?: Array<{
    id?: string
    includedServiceId: string
    durationMinutes: number
    sortOrder: number
    includedService?: { id: string; name: string; category: string; duration: number }
  }>
  createdAt?: string
  updatedAt?: string
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
  createdAt?: string
  updatedAt?: string
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  plan: Plan
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'PAUSED'
  startDate: string
  endDate?: string
  nextDueDate?: string | null
  cancelInProgress?: boolean
  pastDueSince?: string | null
  graceDaysLeft?: number | null
  pendingPlanId?: string | null
  pendingPlan?: Plan | null
  pendingChangeAt?: string | null
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
    byMonth?: Record<string, number>
  }
  stripeSubscriptionId?: string | null
  asaasSubscriptionId?: string | null
  scheduled?: boolean
  isUpgrade?: boolean
  effectiveAt?: string
  oldPlan?: string
  newPlan?: string
  message?: string
}

export interface Appointment {
  id: string
  userId: string
  serviceId: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'
  origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED' | 'PACKAGE'
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paymentMethod?: string
  paymentAmount?: number
  paymentExpiresAt?: string | null
  confirmedByAdmin: boolean
  canceledBy?: string
  canceledAt?: string
  cancelReason?: string
  settlementChoice?: 'REFUND' | 'CREDIT' | null
  refundStatus?: 'NOT_APPLICABLE' | 'PROCESSING' | 'DONE' | 'MANUAL_REQUIRED'
  refundError?: string | null
  notes?: string
  adminNotes?: string
  packagePurchaseId?: string | null
  packageSessionIndex?: number | null
  packagePurchase?: PackagePurchase | null
  service?: Service
  user?: User
  voucher?: Voucher
  cancelPolicy?: CancelPolicy
  createdAt?: string
}

export type CancelPolicy =
  | {
      kind: 'machine'
      lateCancelHours: number
      lateCancelFeePercent: number
      text: string
      onTimeText?: string
      latePaidText?: string
    }
  | {
      kind: 'standard'
      minCancellationHours: number
      text: string
      onTimeText?: string
      latePaidText?: string
      latePlanText?: string
    }

export interface PackagePurchase {
  id: string
  userId: string
  packageServiceId: string
  packageService?: Service
  sessionCount: number
  sessionsScheduled: number
  remainingSessions: number
  pricePaid: number
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'REFUNDED'
  itemsSnapshot?: Array<{ serviceId: string; name: string; durationMinutes: number; category: string; sortOrder: number }>
  items?: Array<{ serviceId: string; name: string; durationMinutes: number; category: string; sortOrder: number }>
  appointments?: Appointment[]
  paymentExpiresAt?: string | null
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
  remainingAmount?: number | null
  planId?: string
  isUsed: boolean
  usedAt?: string
  expiresAt?: string
  grantedBy: string
  grantedReason?: string
  createdAt?: string
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
  createdAt?: string
  updatedAt?: string
}

export interface AnamnesisData {
  personalData: {
    fullName: string
    birthDate: string
    phone: string
    email: string
    address: {
      cep: string
      street: string
      number: string
      complement?: string
      neighborhood: string
      city: string
      state: string
    }
    howDidYouFindUs?: string
  }
  lifestyle: {
    exerciseFrequency?: string
    stressLevel?: number
    smoking?: boolean
    cigarettesPerDay?: number
    alcoholConsumption?: string
    bowelFunction?: string
    waterIntake?: string
    usesSunscreen?: boolean
    usesCosmetics?: boolean
    cosmeticsDetails?: string
  }
  healthInfo: {
    allergies?: string
    conditions?: string[]
    medications?: string
    hasImplants?: boolean
    isPregnant?: boolean
    isBreastfeeding?: boolean
    usesContraceptive?: boolean
    contraceptiveType?: string
  }
  goals: {
    mainGoal?: string
    concernedAreas?: string[]
    previousTreatments?: string
  }
  signature: string
  agreedToTerms: boolean
}

