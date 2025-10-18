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
  user?: User
  voucher?: Voucher
  createdAt?: string
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

