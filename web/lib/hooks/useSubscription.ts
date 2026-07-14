// Hook customizado para gerenciar assinatura do usuário

import { useState, useEffect } from 'react'
import { Subscription } from '@/types'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await api.getSubscriptionByUserId(userId)
      setSubscription(data)
      setError(null)
    } catch (err: any) {
      // Se não tem assinatura, não é erro - comportamento esperado
      if (err.message.includes('não encontrada') || err.message.includes('Assinatura não encontrada')) {
        console.log('ℹ️ Usuário sem assinatura ativa (comportamento normal)')
        setSubscription(null)
        setError(null)
      } else {
        console.error('❌ Erro ao buscar assinatura:', err)
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [userId])

  const createSubscription = async (planId: string) => {
    if (!userId) throw new Error('User ID não fornecido')

    try {
      const sub = await api.createSubscription({ userId, planId })
      toast.success('Assinatura ativada com sucesso! 🎉')
      await fetchSubscription()
      return sub
    } catch (err: any) {
      console.error('Erro ao criar assinatura:', err)
      toast.error(err.message || 'Erro ao criar assinatura')
      throw err
    }
  }

  const cancelSubscription = async (reason?: string) => {
    if (!userId) throw new Error('User ID não fornecido')

    try {
      await api.cancelSubscription(userId, reason)
      toast.success('Assinatura cancelada')
      await fetchSubscription()
    } catch (err: any) {
      console.error('Erro ao cancelar assinatura:', err)
      toast.error(err.message || 'Erro ao cancelar assinatura')
      throw err
    }
  }

  const pauseSubscription = async () => {
    if (!userId) throw new Error('User ID não fornecido')

    try {
      await api.pauseSubscription(userId)
      toast.success('Assinatura pausada')
      await fetchSubscription()
    } catch (err: any) {
      console.error('Erro ao pausar assinatura:', err)
      toast.error(err.message || 'Erro ao pausar assinatura')
      throw err
    }
  }

  const reactivateSubscription = async () => {
    if (!userId) throw new Error('User ID não fornecido')

    try {
      await api.reactivateSubscription(userId)
      toast.success('Assinatura reativada!')
      await fetchSubscription()
    } catch (err: any) {
      console.error('Erro ao reativar assinatura:', err)
      toast.error(err.message || 'Erro ao reativar assinatura')
      throw err
    }
  }

  const hasSubscription = !!subscription && subscription.status === 'ACTIVE'
  
  const remainingTreatments = subscription?.remaining?.thisMonth || 0
  
  const canSchedule = hasSubscription && remainingTreatments > 0

  return {
    subscription,
    loading,
    error,
    hasSubscription,
    remainingTreatments,
    canSchedule,
    createSubscription,
    cancelSubscription,
    pauseSubscription,
    reactivateSubscription,
    refetch: fetchSubscription,
  }
}

