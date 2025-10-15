export interface User {
  id: string
  email: string
  name: string
  role: 'CLIENT' | 'MANAGER'
  profileImageUrl?: string
  firebaseUid: string
}

export interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  isActive: boolean
  imageUrl?: string
  category?: string
}

export interface Appointment {
  id: string
  userId: string
  serviceId: string
  startTime: Date
  endTime: Date
  status: 'scheduled' | 'completed' | 'canceled'
  origin: 'subscription' | 'single_purchase' | 'package'
  notes?: string
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

