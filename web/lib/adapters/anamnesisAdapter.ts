/**
 * Adapter para transformar dados do formulário de anamnese
 * entre o formato do frontend (Steps) e o formato do backend
 */

export interface FrontendAnamnesisData {
  // Step 1: Dados Pessoais
  fullName?: string
  birthDate?: Date
  phone?: string
  email?: string
  cep?: string
  street?: string
  neighborhood?: string
  city?: string
  state?: string
  number?: string
  complement?: string
  howKnew?: string
  
  // Step 2: Estilo de Vida
  exerciseActivity?: string // 'yes' | 'no'
  exerciseType?: string
  stressLevel?: string // '1' a '10'
  smoking?: string // 'yes' | 'no'
  smokingAmount?: string
  alcohol?: string // 'yes' | 'no'
  intestine?: string // 'regular' | 'constipated' | 'loose'
  waterIntake?: string // 'lessThan1' | 'between1and2' | 'moreThan2'
  sunscreen?: string // 'yes' | 'no'
  cosmetics?: string // 'yes' | 'no'
  cosmeticsType?: string
  
  // Step 3: Saúde
  allergies?: string // 'yes' | 'no'
  allergiesDetails?: string
  healthConditions?: string[]
  diabetesDetails?: string
  cancerDetails?: string
  medications?: string // 'yes' | 'no'
  medicationsDetails?: string
  pacemaker?: boolean
  metalImplant?: boolean
  pregnant?: string // 'yes' | 'no'
  breastfeeding?: string // 'yes' | 'no'
  birthControl?: string // 'yes' | 'no'
  birthControlType?: string
  
  // Step 4: Objetivos
  mainGoal?: string
  faceIssues?: string[]
  bodyIssues?: string[]
  bodyIssuesArea?: string
  previousTreatments?: string // 'yes' | 'no'
  previousTreatmentsDetails?: string
  
  // Step 5: Termo
  termsAccepted?: boolean
  signature?: string
  termsAcceptedAt?: string
}

export interface BackendAnamnesisData {
  userId: string
  personalData: any
  lifestyleData: any
  healthData: any
  objectivesData: any
  termsAccepted: boolean
}

/**
 * Converte dados do frontend (Steps) para o formato do backend
 */
export function frontendToBackend(
  frontendData: FrontendAnamnesisData,
  userId: string
): BackendAnamnesisData {
  console.log('🔄 frontendToBackend recebeu:', frontendData)
  
  const backendData = {
    userId,
    personalData: {
      fullName: frontendData.fullName || '',
      birthDate: frontendData.birthDate?.toISOString() || '',
      phone: frontendData.phone || '',
      email: frontendData.email || '',
      address: {
        cep: frontendData.cep || '',
        street: frontendData.street || '',
        neighborhood: frontendData.neighborhood || '',
        city: frontendData.city || '',
        state: frontendData.state || '',
        number: frontendData.number || '',
        complement: frontendData.complement || '',
      },
      howKnew: frontendData.howKnew || '',
    },
    lifestyleData: {
      exerciseActivity: frontendData.exerciseActivity || '',
      exerciseType: frontendData.exerciseType || '',
      stressLevel: frontendData.stressLevel || '',
      smoking: frontendData.smoking || '',
      smokingAmount: frontendData.smokingAmount || '',
      alcohol: frontendData.alcohol || '',
      intestine: frontendData.intestine || '',
      waterIntake: frontendData.waterIntake || '',
      sunscreen: frontendData.sunscreen || '',
      cosmetics: frontendData.cosmetics || '',
      cosmeticsType: frontendData.cosmeticsType || '',
    },
    healthData: {
      allergies: frontendData.allergies || '',
      allergiesDetails: frontendData.allergiesDetails || '',
      healthConditions: frontendData.healthConditions || [],
      diabetesDetails: frontendData.diabetesDetails || '',
      cancerDetails: frontendData.cancerDetails || '',
      medications: frontendData.medications || '',
      medicationsDetails: frontendData.medicationsDetails || '',
      pacemaker: frontendData.pacemaker || false,
      metalImplant: frontendData.metalImplant || false,
      pregnant: frontendData.pregnant || '',
      breastfeeding: frontendData.breastfeeding || '',
      birthControl: frontendData.birthControl || '',
      birthControlType: frontendData.birthControlType || '',
    },
    objectivesData: {
      mainGoal: frontendData.mainGoal || '',
      faceIssues: frontendData.faceIssues || [],
      bodyIssues: frontendData.bodyIssues || [],
      bodyIssuesArea: frontendData.bodyIssuesArea || '',
      previousTreatments: frontendData.previousTreatments || '',
      previousTreatmentsDetails: frontendData.previousTreatmentsDetails || '',
    },
    termsAccepted: frontendData.termsAccepted || false,
  }
  
  console.log('✅ frontendToBackend converteu para:', backendData)
  return backendData
}

/**
 * Converte dados do backend para o formato do frontend (Steps)
 * SUPORTA FORMATO ANTIGO E NOVO para retrocompatibilidade
 */
export function backendToFrontend(backendData: any): FrontendAnamnesisData {
  console.log('🔄 backendToFrontend recebeu:', backendData)
  
  // Helper para converter boolean → 'yes'/'no'
  const boolToYesNo = (value: any): string => {
    if (value === true || value === 'yes') return 'yes'
    if (value === false || value === 'no') return 'no'
    return 'no'
  }
  
  const converted = {
    // Step 1: Personal Data
    fullName: backendData.personalData?.fullName || '',
    birthDate: backendData.personalData?.birthDate ? new Date(backendData.personalData.birthDate) : undefined,
    phone: backendData.personalData?.phone || '',
    email: backendData.personalData?.email || '',
    cep: backendData.personalData?.address?.cep || '',
    street: backendData.personalData?.address?.street || '',
    neighborhood: backendData.personalData?.address?.neighborhood || '',
    city: backendData.personalData?.address?.city || '',
    state: backendData.personalData?.address?.state || '',
    number: backendData.personalData?.address?.number || '',
    complement: backendData.personalData?.address?.complement || '',
    howKnew: backendData.personalData?.howKnew || '',
    
    // Step 2: Lifestyle Data
    // SUPORTE FORMATO ANTIGO: physicalActivity → exerciseActivity
    exerciseActivity: backendData.lifestyleData?.exerciseActivity || 
                      boolToYesNo(backendData.lifestyleData?.physicalActivity) || 'no',
    exerciseType: backendData.lifestyleData?.exerciseType || '',
    stressLevel: backendData.lifestyleData?.stressLevel || '3',
    // SUPORTE FORMATO ANTIGO: smoker → smoking
    smoking: backendData.lifestyleData?.smoking || 
             backendData.lifestyleData?.smoker || 'no',
    smokingAmount: backendData.lifestyleData?.smokingAmount || '',
    alcohol: backendData.lifestyleData?.alcohol || 'no',
    intestine: backendData.lifestyleData?.intestine || 'regular',
    waterIntake: backendData.lifestyleData?.waterIntake || 'between1and2',
    // SUPORTE FORMATO ANTIGO: sunProtection → sunscreen
    sunscreen: backendData.lifestyleData?.sunscreen || 
               boolToYesNo(backendData.lifestyleData?.sunProtection) || 'no',
    cosmetics: backendData.lifestyleData?.cosmetics || 'no',
    cosmeticsType: backendData.lifestyleData?.cosmeticsType || '',
    
    // Step 3: Health Data
    // SUPORTE FORMATO ANTIGO: hasAllergies (boolean) → allergies ('yes'/'no')
    allergies: backendData.healthData?.allergies || 
               boolToYesNo(backendData.healthData?.hasAllergies) || 'no',
    // SUPORTE FORMATO ANTIGO: allergiesDescription → allergiesDetails
    allergiesDetails: backendData.healthData?.allergiesDetails || 
                     backendData.healthData?.allergiesDescription || '',
    healthConditions: backendData.healthData?.healthConditions || [],
    diabetesDetails: backendData.healthData?.diabetesDetails || '',
    cancerDetails: backendData.healthData?.cancerDetails || '',
    // SUPORTE FORMATO ANTIGO: medications (boolean) → medications ('yes'/'no')
    medications: backendData.healthData?.medications === 'yes' || backendData.healthData?.medications === 'no'
                 ? backendData.healthData.medications
                 : boolToYesNo(backendData.healthData?.medications) || 'no',
    // SUPORTE FORMATO ANTIGO: medicationsDescription → medicationsDetails
    medicationsDetails: backendData.healthData?.medicationsDetails || 
                       backendData.healthData?.medicationsDescription || '',
    pacemaker: backendData.healthData?.pacemaker || false,
    metalImplant: backendData.healthData?.metalImplant || false,
    // SUPORTE FORMATO ANTIGO: pregnantOrBreastfeeding (boolean) → pregnant/breastfeeding ('yes'/'no')
    pregnant: backendData.healthData?.pregnant || 
             boolToYesNo(backendData.healthData?.pregnantOrBreastfeeding) || 'no',
    breastfeeding: backendData.healthData?.breastfeeding || 'no',
    birthControl: backendData.healthData?.birthControl || 'no',
    birthControlType: backendData.healthData?.birthControlType || '',
    
    // Step 4: Objectives Data
    // SUPORTE FORMATO ANTIGO: mainGoals (array) → mainGoal (string)
    mainGoal: backendData.objectivesData?.mainGoal || 
             (backendData.objectivesData?.mainGoals?.join(', ')) || '',
    faceIssues: backendData.objectivesData?.faceIssues || [],
    bodyIssues: backendData.objectivesData?.bodyIssues || [],
    bodyIssuesArea: backendData.objectivesData?.bodyIssuesArea || '',
    // SUPORTE FORMATO ANTIGO: previousAestheticProcedures → previousTreatments
    previousTreatments: backendData.objectivesData?.previousTreatments || 
                       boolToYesNo(backendData.objectivesData?.previousAestheticProcedures) ||
                       boolToYesNo(backendData.healthData?.previousAestheticProcedures) || 'no',
    // SUPORTE FORMATO ANTIGO: previousProceduresDescription → previousTreatmentsDetails
    previousTreatmentsDetails: backendData.objectivesData?.previousTreatmentsDetails || 
                              backendData.objectivesData?.previousProceduresDescription ||
                              backendData.healthData?.previousProceduresDescription || '',
    
    // Step 5: Terms
    termsAccepted: backendData.termsAccepted || false,
  }
  
  console.log('✅ backendToFrontend converteu para:', converted)
  return converted
}
