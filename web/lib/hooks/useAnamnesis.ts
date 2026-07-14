// Hook customizado para gerenciar anamnese do usuário

import { useState, useEffect } from 'react'
import { AnamnesisForm, AnamnesisData } from '@/types'
import * as api from '@/lib/api'
import { frontendToBackendAnamnesis, backendToFrontendAnamnesis } from '@/lib/adapters/anamnesis'
import toast from 'react-hot-toast'

export function useAnamnesis(userId?: string) {
  const [anamnesis, setAnamnesis] = useState<AnamnesisForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnamnesis = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await api.getAnamnesisByUserId(userId)
      console.log('📋 Anamnese carregada:', {
        exists: !!data,
        termsAccepted: data?.termsAccepted,
        termsAcceptedAt: data?.termsAcceptedAt,
        personalData: data?.personalData,
        healthData: data?.healthData
      })
      setAnamnesis(data)
      setError(null)
    } catch (err: any) {
      // Se não tem anamnese, não é erro
      if (err.message.includes('não encontrada')) {
        console.log('ℹ️ Usuário não possui anamnese')
        setAnamnesis(null)
        setError(null)
      } else {
        console.error('Erro ao buscar anamnese:', err)
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnamnesis()
  }, [userId])

  const createAnamnesis = async (frontendData: AnamnesisData) => {
    if (!userId) throw new Error('User ID não fornecido')

    try {
      // Converter dados do frontend para backend
      const backendData = frontendToBackendAnamnesis(frontendData)
      
      const anamnesisForm = await api.createAnamnesis({
        userId,
        ...backendData,
      })
      
      toast.success('Ficha de anamnese criada com sucesso! ✅')
      await fetchAnamnesis()
      return anamnesisForm
    } catch (err: any) {
      console.error('Erro ao criar anamnese:', err)
      toast.error(err.message || 'Erro ao criar anamnese')
      throw err
    }
  }

  const updateAnamnesis = async (frontendData: Partial<AnamnesisData>) => {
    if (!userId) throw new Error('User ID não fornecido')

    try {
      // Converter apenas os campos fornecidos
      const backendData: any = {}
      if (frontendData.personalData) backendData.personalData = frontendData.personalData
      if (frontendData.lifestyle) backendData.lifestyleData = frontendData.lifestyle
      if (frontendData.healthInfo) backendData.healthData = frontendData.healthInfo
      if (frontendData.goals) backendData.objectivesData = frontendData.goals
      if (frontendData.agreedToTerms !== undefined) backendData.termsAccepted = frontendData.agreedToTerms
      
      const anamnesisForm = await api.updateAnamnesis(userId, backendData)
      
      toast.success('Anamnese atualizada com sucesso!')
      await fetchAnamnesis()
      return anamnesisForm
    } catch (err: any) {
      console.error('Erro ao atualizar anamnese:', err)
      toast.error(err.message || 'Erro ao atualizar anamnese')
      throw err
    }
  }

  const hasAnamnesis = !!anamnesis && anamnesis.termsAccepted
  
  console.log('🔍 useAnamnesis status:', {
    hasAnamnesis,
    exists: !!anamnesis,
    termsAccepted: anamnesis?.termsAccepted
  })

  // Converte anamnese do backend para formato do frontend
  const anamnesisData: AnamnesisData | null = anamnesis 
    ? backendToFrontendAnamnesis(anamnesis)
    : null

  return {
    anamnesis,
    anamnesisData,
    hasAnamnesis,
    loading,
    error,
    createAnamnesis,
    updateAnamnesis,
    refetch: fetchAnamnesis,
  }
}

