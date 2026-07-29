/**
 * Adapter para transformar dados do formulário de anamnese
 * entre o formato do frontend (Steps) e o formato do backend.
 *
 * TODO (próxima rodada): wizard web cliente → schemaVersion 2
 * (hoje o wizard web ainda grava o shape v1).
 */

export interface FrontendAnamnesisData {
  // Step 1: Dados Pessoais
  fullName?: string
  birthDate?: Date
  phone?: string
  email?: string
  sex?: string
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
  smoking?: string // 'yes' | 'no' | 'never' | 'socially' (v2)
  smokingAmount?: string
  alcohol?: string
  intestine?: string // 'regular' | 'constipated' | 'loose'
  waterIntake?: string
  sunscreen?: string // 'yes' | 'no'
  cosmetics?: string // 'yes' | 'no'
  cosmeticsType?: string
  // v2 lifestyle extras
  skinType?: string
  acne?: boolean
  spots?: boolean
  spotsDetails?: string
  previousAesthetic?: boolean
  previousAestheticProcedures?: string[]
  physicalActivityPerWeek?: number | null
  
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
  metalImplantsDetails?: string
  pregnant?: string
  pregnantWeeks?: number | null
  breastfeeding?: string | boolean
  birthControl?: string | boolean
  birthControlType?: string
  // v2 health extras
  diagnosedDisease?: string
  diagnosedDiseaseDetails?: string
  medicalTreatment?: string
  medicalTreatmentDetails?: string
  physicalLimitation?: string
  physicalLimitationDetails?: string
  cosmeticAllergy?: string
  cosmeticAllergyDetails?: string
  aestheticReaction?: string
  aestheticReactionDetails?: string
  anticoagulants?: boolean
  roacutan?: boolean
  roacutanSince?: string
  corticosteroids?: boolean
  iud?: boolean
  epilepsy?: boolean
  diabetes?: boolean
  hypertension?: boolean
  cancerHistory?: boolean
  
  // Step 4: Objetivos
  mainGoal?: string
  goals?: string[]
  otherGoal?: string
  regions?: string[]
  faceIssues?: string[]
  bodyIssues?: string[]
  bodyIssuesArea?: string
  previousTreatments?: string // 'yes' | 'no'
  previousTreatmentsDetails?: string
  
  // Step 5: Termo
  termsAccepted?: boolean
  signature?: string
  termsAcceptedAt?: string
  schemaVersion?: number
}

export interface BackendAnamnesisData {
  userId: string
  personalData: any
  lifestyleData: any
  healthData: any
  objectivesData: any
  termsAccepted: boolean
  schemaVersion?: number
}

function habitToYesNo(value: any): string {
  if (value === 'yes' || value === true) return 'yes'
  if (value === 'socially') return 'yes'
  if (value === 'never' || value === 'no' || value === false) return 'no'
  if (value === 'yes' || value === 'no') return value
  return typeof value === 'string' ? value : 'no'
}

function waterV2ToV1(value: any): string {
  if (value === 'low') return 'lessThan1'
  if (value === 'medium') return 'between1and2'
  if (value === 'high') return 'moreThan2'
  return value || 'between1and2'
}

function boolToYesNo(value: any): string {
  if (value === true || value === 'yes') return 'yes'
  if (value === false || value === 'no') return 'no'
  return 'no'
}

/**
 * Converte dados do frontend (Steps) para o formato do backend.
 * Wizard web ainda grava schemaVersion 1.
 */
export function frontendToBackend(
  frontendData: FrontendAnamnesisData,
  userId: string
): BackendAnamnesisData {
  return {
    userId,
    schemaVersion: 1,
    personalData: {
      fullName: frontendData.fullName || '',
      birthDate: frontendData.birthDate?.toISOString() || '',
      phone: frontendData.phone || '',
      email: frontendData.email || '',
      sex: frontendData.sex || '',
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
}

/**
 * Converte dados do backend para o formato do frontend (Steps).
 * Dual-read: schemaVersion 1 (web) e 2 (mobile).
 */
export function backendToFrontend(backendData: any): FrontendAnamnesisData {
  const h = backendData.healthData || {}
  const l = backendData.lifestyleData || {}
  const o = backendData.objectivesData || {}
  const p = backendData.personalData || {}
  const isV2 = backendData.schemaVersion === 2

  const healthConditions: string[] = Array.isArray(h.healthConditions)
    ? [...h.healthConditions]
    : []
  if (isV2) {
    if (h.diabetes && !healthConditions.includes('diabetes')) healthConditions.push('diabetes')
    if (h.hypertension && !healthConditions.includes('hypertension')) healthConditions.push('hypertension')
    if (h.epilepsy && !healthConditions.includes('epilepsy')) healthConditions.push('epilepsy')
    if (h.cancerHistory && !healthConditions.includes('cancer')) healthConditions.push('cancer')
  }

  const goals: string[] = Array.isArray(o.goals) ? o.goals : []
  const mainGoal =
    o.mainGoal ||
    (goals.length ? goals.join(', ') : '') ||
    (Array.isArray(o.mainGoals) ? o.mainGoals.join(', ') : '') ||
    o.objective ||
    ''

  const pregnantRaw = h.pregnant
  const pregnant =
    pregnantRaw === 'suspect' || pregnantRaw === 'yes' || pregnantRaw === 'no'
      ? pregnantRaw === 'suspect'
        ? 'yes'
        : pregnantRaw
      : boolToYesNo(h.pregnantOrBreastfeeding)

  return {
    fullName: p.fullName || p.name || '',
    birthDate: p.birthDate
      ? // DD/MM/YYYY from mobile or ISO from web
        /^\d{2}\/\d{2}\/\d{4}$/.test(p.birthDate)
          ? (() => {
              const [d, m, y] = p.birthDate.split('/')
              return new Date(Number(y), Number(m) - 1, Number(d))
            })()
          : new Date(p.birthDate)
      : undefined,
    phone: p.phone || '',
    email: p.email || '',
    sex: p.sex || '',
    cep: p.address?.cep || '',
    street: p.address?.street || '',
    neighborhood: p.address?.neighborhood || '',
    city: p.address?.city || '',
    state: p.address?.state || '',
    number: p.address?.number || '',
    complement: p.address?.complement || '',
    howKnew: p.howKnew || '',

    exerciseActivity:
      l.exerciseActivity || boolToYesNo(l.physicalActivity) || 'no',
    exerciseType: l.exerciseType || '',
    stressLevel: l.stressLevel || '3',
    smoking: habitToYesNo(l.smoking || l.smoker),
    smokingAmount: l.smokingAmount || '',
    alcohol: habitToYesNo(l.alcohol),
    intestine: l.intestine || 'regular',
    waterIntake: waterV2ToV1(l.waterIntake),
    sunscreen: l.sunscreen || boolToYesNo(l.sunProtection) || 'no',
    cosmetics: l.cosmetics || 'no',
    cosmeticsType: l.cosmeticsType || '',
    skinType: l.skinType || '',
    acne: Boolean(l.acne),
    spots: Boolean(l.spots),
    spotsDetails: l.spotsDetails || '',
    previousAesthetic: Boolean(l.previousAesthetic),
    previousAestheticProcedures: l.previousAestheticProcedures || [],
    physicalActivityPerWeek: l.physicalActivityPerWeek ?? null,

    allergies:
      h.allergies === 'yes' || h.allergies === 'no'
        ? h.allergies
        : boolToYesNo(h.hasAllergies) ||
          (typeof h.allergies === 'string' && h.allergies && h.allergies !== 'Não informado'
            ? 'yes'
            : 'no'),
    allergiesDetails:
      h.allergiesDetails ||
      h.allergiesDescription ||
      (typeof h.allergies === 'string' && h.allergies !== 'yes' && h.allergies !== 'no'
        ? h.allergies
        : ''),
    healthConditions,
    diabetesDetails: h.diabetesDetails || '',
    cancerDetails: h.cancerDetails || h.cancerHistoryDetails || '',
    medications:
      h.medications === 'yes' || h.medications === 'no'
        ? h.medications
        : h.continuousMedications === 'yes' || h.continuousMedications === 'no'
          ? h.continuousMedications
          : boolToYesNo(h.medications) || 'no',
    medicationsDetails:
      h.medicationsDetails ||
      h.medicationsDescription ||
      h.continuousMedicationsDetails ||
      '',
    pacemaker: Boolean(h.pacemaker),
    metalImplant: Boolean(h.metalImplant || h.metalImplants),
    metalImplantsDetails: h.metalImplantsDetails || '',
    pregnant,
    pregnantWeeks: h.pregnantWeeks ?? null,
    breastfeeding:
      typeof h.breastfeeding === 'boolean'
        ? boolToYesNo(h.breastfeeding)
        : h.breastfeeding || 'no',
    birthControl:
      typeof h.birthControl === 'boolean'
        ? boolToYesNo(h.birthControl)
        : h.birthControl || 'no',
    birthControlType: h.birthControlType || '',
    diagnosedDisease: h.diagnosedDisease || '',
    diagnosedDiseaseDetails: h.diagnosedDiseaseDetails || '',
    medicalTreatment: h.medicalTreatment || '',
    medicalTreatmentDetails: h.medicalTreatmentDetails || '',
    physicalLimitation: h.physicalLimitation || '',
    physicalLimitationDetails: h.physicalLimitationDetails || '',
    cosmeticAllergy: h.cosmeticAllergy || '',
    cosmeticAllergyDetails: h.cosmeticAllergyDetails || '',
    aestheticReaction: h.aestheticReaction || '',
    aestheticReactionDetails: h.aestheticReactionDetails || '',
    anticoagulants: Boolean(h.anticoagulants),
    roacutan: Boolean(h.roacutan),
    roacutanSince: h.roacutanSince || '',
    corticosteroids: Boolean(h.corticosteroids),
    iud: Boolean(h.iud),
    epilepsy: Boolean(h.epilepsy),
    diabetes: Boolean(h.diabetes),
    hypertension: Boolean(h.hypertension),
    cancerHistory: Boolean(h.cancerHistory),

    mainGoal,
    goals,
    otherGoal: o.otherGoal || '',
    regions: Array.isArray(o.regions) ? o.regions : [],
    faceIssues: o.faceIssues || [],
    bodyIssues: o.bodyIssues || [],
    bodyIssuesArea: o.bodyIssuesArea || '',
    previousTreatments:
      o.previousTreatments ||
      boolToYesNo(l.previousAesthetic) ||
      boolToYesNo(o.previousAestheticProcedures) ||
      'no',
    previousTreatmentsDetails:
      o.previousTreatmentsDetails ||
      o.previousProceduresDescription ||
      (Array.isArray(l.previousAestheticProcedures)
        ? l.previousAestheticProcedures.join(', ')
        : '') ||
      '',

    termsAccepted: backendData.termsAccepted || false,
    schemaVersion: backendData.schemaVersion || 1,
  }
}
