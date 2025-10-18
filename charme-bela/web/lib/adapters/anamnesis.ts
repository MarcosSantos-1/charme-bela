// Adapter para converter dados de anamnese entre frontend e backend

import { AnamnesisData } from '@/types'

// ============================================
// FRONTEND → BACKEND
// ============================================

export function frontendToBackendAnamnesis(frontendData: AnamnesisData) {
  return {
    personalData: frontendData.personalData,
    lifestyleData: frontendData.lifestyle,
    healthData: frontendData.healthInfo,
    objectivesData: frontendData.goals,
    termsAccepted: frontendData.agreedToTerms,
  }
}

// ============================================
// BACKEND → FRONTEND
// ============================================

export function backendToFrontendAnamnesis(backendData: any): AnamnesisData {
  return {
    personalData: backendData.personalData || {},
    lifestyle: backendData.lifestyleData || {},
    healthInfo: backendData.healthData || {},
    goals: backendData.objectivesData || {},
    signature: '', // Assinatura não é armazenada no backend
    agreedToTerms: backendData.termsAccepted || false,
  }
}

// ============================================
// HELPERS
// ============================================

// Verifica se anamnese está completa (todos os 5 steps preenchidos)
export function isAnamnesisComplete(data: Partial<AnamnesisData>): boolean {
  return !!(
    data.personalData &&
    data.lifestyle &&
    data.healthInfo &&
    data.goals &&
    data.agreedToTerms
  )
}

// Valida se pode agendar (tem anamnese completa)
export function canScheduleAppointment(user: any): { 
  canSchedule: boolean
  reason?: string
} {
  if (!user.anamnesisForm) {
    return {
      canSchedule: false,
      reason: 'É necessário preencher a ficha de anamnese antes de agendar'
    }
  }
  
  if (!user.anamnesisForm.termsAccepted) {
    return {
      canSchedule: false,
      reason: 'É necessário aceitar os termos de uso'
    }
  }
  
  return { canSchedule: true }
}

