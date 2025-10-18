// Hook customizado para gerenciar agendamentos

import { useState, useEffect } from 'react'
import { Appointment, Service } from '@/types'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'

export function useAppointments(userId?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await api.getAppointments({ userId })
      setAppointments(data)
      setError(null)
    } catch (err: any) {
      console.error('Erro ao buscar agendamentos:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [userId])

  const scheduleAppointment = async (data: {
    serviceId: string
    startTime: string
    origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER'
    paymentMethod?: string
    paymentAmount?: number
    voucherId?: string
    notes?: string
  }) => {
    if (!userId) throw new Error('User ID não fornecido')

    try {
      const appointment = await api.createAppointment({
        userId,
        ...data,
      })
      
      toast.success('Agendamento criado com sucesso! Aguardando confirmação.')
      await fetchAppointments()
      return appointment
    } catch (err: any) {
      console.error('Erro ao criar agendamento:', err)
      toast.error(err.message || 'Erro ao criar agendamento')
      throw err
    }
  }

  const cancelAppointment = async (appointmentId: string, reason?: string) => {
    try {
      const result = await api.cancelAppointment(appointmentId, {
        canceledBy: 'client',
        cancelReason: reason,
      })
      
      if (result.lostTreatment) {
        toast.error(result.message || 'Agendamento cancelado. Tratamento foi contabilizado.')
      } else {
        toast.success('Agendamento cancelado com sucesso!')
      }
      
      await fetchAppointments()
      return result
    } catch (err: any) {
      console.error('Erro ao cancelar agendamento:', err)
      toast.error(err.message || 'Erro ao cancelar agendamento')
      throw err
    }
  }

  const rescheduleAppointment = async (appointmentId: string, newStartTime: string) => {
    try {
      const appointment = await api.rescheduleAppointment(appointmentId, newStartTime)
      toast.success('Agendamento reagendado! Aguardando nova confirmação.')
      await fetchAppointments()
      return appointment
    } catch (err: any) {
      console.error('Erro ao reagendar:', err)
      toast.error(err.message || 'Erro ao reagendar')
      throw err
    }
  }

  return {
    appointments,
    loading,
    error,
    scheduleAppointment,
    cancelAppointment,
    rescheduleAppointment,
    refetch: fetchAppointments,
  }
}

