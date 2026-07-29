/**
 * Anamnesis payload shapes.
 * schemaVersion 1 = web wizard legado
 * schemaVersion 2 = fluxo mobile (Yazio-style)
 */

export const ANAMNESIS_SCHEMA_V2 = 2

export type SexValue = 'female' | 'male' | 'other' | 'prefer_not'
export type YesNo = 'yes' | 'no'
export type YesNoUnknown = 'yes' | 'no' | 'unknown'
export type HabitFrequency = 'never' | 'socially' | 'yes'
export type WaterIntake = 'low' | 'medium' | 'high'
export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'unknown'
export type PregnancyStatus = 'no' | 'yes' | 'suspect'

export interface AnamnesisPersonalDataV2 {
  fullName?: string
  birthDate?: string
  sex?: SexValue
  phone?: string
  email?: string
}

export interface AnamnesisHealthDataV2 {
  diagnosedDisease?: YesNo
  diagnosedDiseaseDetails?: string
  medicalTreatment?: YesNo
  medicalTreatmentDetails?: string
  physicalLimitation?: YesNo
  physicalLimitationDetails?: string

  allergies?: YesNo
  allergiesDetails?: string
  cosmeticAllergy?: YesNoUnknown
  cosmeticAllergyDetails?: string
  aestheticReaction?: YesNo
  aestheticReactionDetails?: string

  continuousMedications?: YesNo
  continuousMedicationsDetails?: string
  anticoagulants?: boolean
  roacutan?: boolean
  roacutanSince?: string
  corticosteroids?: boolean

  pregnant?: PregnancyStatus
  pregnantWeeks?: number | null
  breastfeeding?: boolean
  iud?: boolean
  birthControl?: boolean

  pacemaker?: boolean
  metalImplants?: boolean
  metalImplantsDetails?: string
  cancerHistory?: boolean
  cancerHistoryDetails?: string
  epilepsy?: boolean
  diabetes?: boolean
  diabetesDetails?: string
  hypertension?: boolean
}

export interface AnamnesisLifestyleDataV2 {
  smoking?: HabitFrequency
  alcohol?: HabitFrequency
  physicalActivity?: boolean
  physicalActivityPerWeek?: number | null
  waterIntake?: WaterIntake
  skinType?: SkinType
  acne?: boolean
  spots?: boolean
  spotsDetails?: string
  previousAesthetic?: boolean
  previousAestheticProcedures?: string[]
}

export interface AnamnesisObjectivesDataV2 {
  goals?: string[]
  otherGoal?: string
  regions?: string[]
}

export interface AnamnesisPayloadV2 {
  personalData: AnamnesisPersonalDataV2
  lifestyleData: AnamnesisLifestyleDataV2
  healthData: AnamnesisHealthDataV2
  objectivesData: AnamnesisObjectivesDataV2
  termsAccepted: boolean
  schemaVersion?: number
}

/** Light validation when completing the form (terms accepted). */
export function validateAnamnesisComplete(body: {
  personalData?: unknown
  lifestyleData?: unknown
  healthData?: unknown
  objectivesData?: unknown
  termsAccepted?: boolean
}): string | null {
  if (body.termsAccepted !== true) {
    return 'É necessário aceitar os termos para concluir a anamnese'
  }
  if (body.personalData == null || typeof body.personalData !== 'object') {
    return 'Dados pessoais são obrigatórios'
  }
  if (body.healthData == null || typeof body.healthData !== 'object') {
    return 'Dados de saúde são obrigatórios'
  }
  if (body.lifestyleData == null || typeof body.lifestyleData !== 'object') {
    return 'Dados de estilo de vida são obrigatórios'
  }
  if (body.objectivesData == null || typeof body.objectivesData !== 'object') {
    return 'Objetivos são obrigatórios'
  }
  return null
}

export function resolveSchemaVersion(raw: unknown, termsAccepted: boolean): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 1) {
    return Math.floor(raw)
  }
  // Completing via mobile flow without explicit version → v2
  if (termsAccepted && raw === ANAMNESIS_SCHEMA_V2) return ANAMNESIS_SCHEMA_V2
  return typeof raw === 'number' ? raw : 1
}
