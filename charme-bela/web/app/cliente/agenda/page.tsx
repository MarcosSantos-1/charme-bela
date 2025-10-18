'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { BookingModal } from '@/components/BookingModal'
import { Calendar as CalendarIcon, Clock, MapPin, User, Phone, X, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { useConfirm } from '@/hooks/useConfirm'
import { useAuth } from '@/contexts/AuthContext'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useSubscription } from '@/lib/hooks/useSubscription'
import * as api from '@/lib/api'
import { Appointment } from '@/types'
import toast from 'react-hot-toast'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export default function AgendaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const { 
    appointments, 
    loading, 
    refetch,
    cancelAppointment: hookCancelAppointment,
    rescheduleAppointment: hookRescheduleAppointment
  } = useAppointments(user?.id)
  const { subscription, hasSubscription, remainingTreatments } = useSubscription(user?.id)
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [newDate, setNewDate] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [newSlot, setNewSlot] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [showActionsModal, setShowActionsModal] = useState(false)
  const [selectedActionAppointment, setSelectedActionAppointment] = useState<Appointment | null>(null)
  
  // Filtrar apenas agendamentos futuros e não cancelados
  const upcomingAppointments = appointments.filter(apt => 
    ['PENDING', 'CONFIRMED'].includes(apt.status) &&
    new Date(apt.startTime) >= new Date()
  )

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const hasAppointment = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return upcomingAppointments.some(apt => {
      const aptDate = new Date(apt.startTime).toISOString().split('T')[0]
      return aptDate === dateStr
    })
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return upcomingAppointments.filter(apt => {
      const aptDate = new Date(apt.startTime).toISOString().split('T')[0]
      return aptDate === dateStr
    })
  }

  const todayAppointments = getAppointmentsForDate(selectedDate)
  
  // Calcular diferença de horas até o agendamento
  const getHoursUntilAppointment = (startTime: string) => {
    const now = new Date()
    const aptTime = new Date(startTime)
    return (aptTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  }
  
  // Verificar se pode cancelar (mínimo 8h de antecedência)
  const canCancel = (startTime: string) => {
    return getHoursUntilAppointment(startTime) >= 8
  }
  
  // Verificar se pode reagendar (mínimo 8h de antecedência)
  const canReschedule = (startTime: string) => {
    return getHoursUntilAppointment(startTime) >= 8
  }
  
  // Cancelar agendamento
  const handleCancelAppointment = async (appointment: Appointment) => {
    const hoursUntil = getHoursUntilAppointment(appointment.startTime)
    
    if (hoursUntil < 8) {
      const confirmed = await confirm({
        title: 'Atenção!',
        message: `Faltam menos de 8 horas para o agendamento. Se cancelar agora, você perderá ${appointment.origin === 'SUBSCRIPTION' ? 'a sessão do seu plano' : 'o pagamento'}.`,
        confirmText: 'Sim, cancelar mesmo assim',
        cancelText: 'Não cancelar',
        type: 'danger'
      })
      
      if (!confirmed) return
    } else {
      const confirmed = await confirm({
        title: 'Cancelar Agendamento',
        message: `Deseja cancelar ${appointment.service?.name} em ${new Date(appointment.startTime).toLocaleDateString('pt-BR')}?`,
        confirmText: 'Sim, cancelar',
        cancelText: 'Não',
        type: 'danger'
      })
      
      if (!confirmed) return
    }
    
    try {
      console.log('🗑️ Cancelando agendamento:', appointment.id)
      
      // Usa a função do hook que já trata toasts e atualiza a lista
      await hookCancelAppointment(appointment.id, 'Cancelado pelo cliente')
      
      console.log('✅ Cancelamento concluído')
    } catch (error: any) {
      console.error('❌ Erro ao cancelar:', error)
      // O hook já mostra o toast de erro
    }
  }
  
  // Abrir modal de reagendamento
  const handleOpenReschedule = (appointment: Appointment) => {
    const hoursUntil = getHoursUntilAppointment(appointment.startTime)
    
    if (hoursUntil < 8) {
      toast.error('Não é possível reagendar com menos de 8 horas de antecedência')
      return
    }
    
    setSelectedAppointment(appointment)
    setShowRescheduleModal(true)
    setNewDate(null)
    setNewSlot('')
    setAvailableSlots([])
    setBookedSlots([])
  }
  
  // Buscar horários para reagendamento
  const handleRescheduleDateSelect = async (date: Date | null) => {
    if (!date || !selectedAppointment) return
    
    setNewDate(date)
    setNewSlot('')
    setLoadingSlots(true)
    
    try {
      const dateStr = date.toISOString().split('T')[0]
      const response = await api.getAvailableSlots(dateStr, selectedAppointment.service?.id)
      setAvailableSlots(response.slots || [])
      setBookedSlots(response.bookedSlots || [])
    } catch (error) {
      console.error('Erro ao buscar horários:', error)
      toast.error('Erro ao buscar horários disponíveis')
      setAvailableSlots([])
      setBookedSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }
  
  // Confirmar reagendamento
  const handleConfirmReschedule = async () => {
    if (!selectedAppointment || !newDate || !newSlot) {
      toast.error('Selecione data e horário')
      return
    }
    
    // Modal de confirmação antes de reagendar
    const newDateStr = newDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const confirmed = await confirm({
      title: 'Confirmar Reagendamento',
      message: `Deseja reagendar ${selectedAppointment.service?.name} para ${newDateStr} às ${newSlot}?`,
      confirmText: 'Sim, reagendar',
      cancelText: 'Cancelar',
      type: 'info'
    })
    
    if (!confirmed) return
    
    setRescheduling(true)
    
    try {
      const dateStr = newDate.toISOString().split('T')[0]
      const newStartTime = new Date(`${dateStr}T${newSlot}:00.000Z`)
      
      console.log('📅 Reagendando:', {
        appointmentId: selectedAppointment.id,
        newStartTime: newStartTime.toISOString()
      })
      
      // Usa a função do hook que já trata toasts e atualiza a lista
      await hookRescheduleAppointment(selectedAppointment.id, newStartTime.toISOString())
      
      console.log('✅ Reagendamento concluído')
      setShowRescheduleModal(false)
    } catch (error: any) {
      console.error('❌ Erro ao reagendar:', error)
      // O hook já mostra o toast de erro
    } finally {
      setRescheduling(false)
    }
  }
  
  // Lista combinada de slots para reagendamento
  const getAllRescheduleSlots = () => {
    const combined = [...availableSlots, ...bookedSlots]
    return Array.from(new Set(combined)).sort()
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }
  
  // Calcular data máxima para reagendamento: último dia do próximo mês
  const getMaxRescheduleDate = () => {
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)
    return nextMonth
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      {ConfirmDialogComponent}
      <ClientLayout title="Minha Agenda">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
            </div>
          ) : (
            <>
          {/* Calendar */}
          <div className="bg-white rounded-2xl p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {monthNames[month]} {year}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-900 font-bold text-2xl"
                >
                  ‹
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-900 font-bold text-2xl"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
                const hasApt = hasAppointment(day)

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-pink-600 text-white scale-105'
                        : isToday
                        ? 'bg-pink-100 text-pink-700'
                        : hasApt
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{day}</span>
                    {hasApt && !isSelected && (
                      <span className="w-1 h-1 bg-purple-600 rounded-full mt-1" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-6 text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-pink-100 rounded" />
                <span>Hoje</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-50 rounded flex items-center justify-center">
                  <span className="w-1 h-1 bg-purple-600 rounded-full" />
                </div>
                <span>Com agendamento</span>
              </div>
            </div>
          </div>

          {/* Appointments for Selected Date */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Agendamentos - {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
            </h3>

            {todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map((apt) => {
                  const aptDate = new Date(apt.startTime)
                  // IMPORTANTE: Usa UTC para evitar conversão de timezone
                  const aptTime = `${aptDate.getUTCHours().toString().padStart(2, '0')}:${aptDate.getUTCMinutes().toString().padStart(2, '0')}`
                  const canDoActions = canReschedule(apt.startTime)
                  const hoursUntil = getHoursUntilAppointment(apt.startTime)
                  
                  // Identificar se é agendamento do admin (pagar na clínica)
                  const isAdminPending = apt.origin === 'ADMIN_CREATED' && (apt.paymentStatus === 'PENDING' || !apt.paymentStatus)
                  
                  return (
                    <div
                      key={apt.id}
                      className={`rounded-xl p-4 border-2 ${
                        isAdminPending 
                          ? 'bg-yellow-50 border-yellow-400' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{apt.service?.name || 'Serviço'}</h4>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Clock className="w-4 h-4 mr-1" />
                            {aptTime} ({apt.service?.duration || 60} min)
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {apt.origin === 'SUBSCRIPTION' && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                Plano
                              </span>
                            )}
                            {isAdminPending && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-900 rounded-full font-medium">
                                💰 Pagar na Clínica • Agendado pela Esteticista
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Indicador do status */}
                      <div className="mb-3">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          apt.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {apt.status === 'CONFIRMED' ? 'Confirmado' : 'Agendado'}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          Av. Paranaguá, 1672 - Sala 02, Ermelino Matarazzo
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          (11) 91312-9669
                        </div>
                      </div>
                      
                      {!canDoActions && (
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded mb-3">
                          <p className="text-xs text-orange-800">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            Menos de 8h - Cancelar agora resulta em perda de sessão
                          </p>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleOpenReschedule(apt)}
                          disabled={!canDoActions}
                        >
                          Reagendar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleCancelAppointment(apt)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Nenhum agendamento para este dia</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => router.push('/cliente/servicos')}
                >
                  Agendar Tratamento
                </Button>
              </div>
            )}
          </div>

          {/* All Upcoming Appointments */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Próximos Agendamentos</h3>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => {
                  const aptDate = new Date(apt.startTime)
                  // IMPORTANTE: Usa UTC para evitar conversão de timezone
                  const aptTime = `${aptDate.getUTCHours().toString().padStart(2, '0')}:${aptDate.getUTCMinutes().toString().padStart(2, '0')}`
                  const isAdminPending = apt.origin === 'ADMIN_CREATED' && (apt.paymentStatus === 'PENDING' || !apt.paymentStatus)
                  const canDoActions = canReschedule(apt.startTime)
                  
                  return (
                    <div
                      key={apt.id}
                      onClick={() => {
                        if (canDoActions) {
                          setSelectedActionAppointment(apt)
                          setShowActionsModal(true)
                        }
                      }}
                      className={`rounded-xl p-4 border-2 hover:shadow-md transition-all ${
                        isAdminPending 
                          ? 'bg-yellow-50 border-yellow-400' 
                          : 'bg-white border-gray-200'
                      } ${canDoActions ? 'cursor-pointer hover:border-pink-400' : 'cursor-default'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-pink-600">
                              {aptDate.getDate()}
                            </div>
                            <div className="text-xs text-gray-600 capitalize">
                              {monthNames[aptDate.getMonth()].substring(0, 3)}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{apt.service?.name || 'Serviço'}</h4>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Clock className="w-4 h-4 mr-1" />
                              {aptTime}
                            </div>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {apt.origin === 'SUBSCRIPTION' && (
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                  Plano
                                </span>
                              )}
                              {isAdminPending && (
                                <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-900 rounded-full font-medium">
                                  💰 Pagar na Clínica • Agendado pela Esteticista
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            apt.status === 'CONFIRMED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {apt.status === 'CONFIRMED' ? 'Confirmado' : 'Agendado'}
                          </span>
                          {canDoActions && (
                            <span className="text-xs text-pink-600 font-medium">
                              Clique para gerenciar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Nenhum agendamento futuro</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => router.push('/cliente/servicos')}
                >
                  Agendar Tratamento
                </Button>
              </div>
            )}
          </div>
          </>
          )}
        </div>
        
        {/* Modal de Ações (Reagendar/Cancelar) */}
        {showActionsModal && selectedActionAppointment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Gerenciar Agendamento</h2>
                <button
                  onClick={() => {
                    setShowActionsModal(false)
                    setSelectedActionAppointment(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-900" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Info do agendamento */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{selectedActionAppointment.service?.name}</h3>
                  <p className="text-sm text-gray-600">
                    {(() => {
                      const d = new Date(selectedActionAppointment.startTime)
                      const dateStr = d.toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        timeZone: 'UTC' 
                      })
                      const timeStr = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
                      return `${dateStr} às ${timeStr}`
                    })()}
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {selectedActionAppointment.origin === 'SUBSCRIPTION' && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        Plano
                      </span>
                    )}
                    {selectedActionAppointment.origin === 'ADMIN_CREATED' && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-900 rounded-full font-medium">
                        💰 Pagar na Clínica
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full py-4 text-base"
                    onClick={() => {
                      setShowActionsModal(false)
                      handleOpenReschedule(selectedActionAppointment)
                    }}
                  >
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Reagendar
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full py-4 text-base text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => {
                      setShowActionsModal(false)
                      handleCancelAppointment(selectedActionAppointment)
                    }}
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancelar Agendamento
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full py-4 text-base"
                    onClick={() => {
                      setShowActionsModal(false)
                      setSelectedActionAppointment(null)
                    }}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Reagendamento */}
        {showRescheduleModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Reagendar Tratamento</h2>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  disabled={rescheduling}
                >
                  <X className="w-5 h-5 text-gray-900" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Info do agendamento atual */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Agendamento Atual</h3>
                  <p className="font-semibold text-gray-900">{selectedAppointment.service?.name}</p>
                  <p className="text-sm text-gray-600">
                    {(() => {
                      const d = new Date(selectedAppointment.startTime)
                      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' })
                      const timeStr = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`
                      return `${dateStr} às ${timeStr}`
                    })()}
                  </p>
                </div>

                {/* Seletor de nova data */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    📅 Nova Data
                  </label>
                  <ReactDatePicker
                    selected={newDate}
                    onChange={handleRescheduleDateSelect}
                    minDate={new Date()}
                    maxDate={getMaxRescheduleDate()}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Selecione a nova data"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 font-medium bg-white hover:border-pink-400 transition-colors cursor-pointer"
                    inline={false}
                  />
                </div>

                {/* Novos horários */}
                {newDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      ⏰ Novo Horário
                    </label>
                    
                    {loadingSlots ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
                      </div>
                    ) : getAllRescheduleSlots().length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {getAllRescheduleSlots().map((slot) => {
                          const isBooked = bookedSlots.includes(slot)
                          
                          return (
                            <button
                              key={slot}
                              onClick={() => !isBooked && setNewSlot(slot)}
                              disabled={isBooked}
                              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                                isBooked
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : newSlot === slot
                                  ? 'bg-pink-600 text-white'
                                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-pink-500'
                              }`}
                            >
                              {slot}
                              {isBooked && <span className="block text-xs">Ocupado</span>}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-gray-600 bg-gray-50 rounded-xl">
                        Nenhum horário disponível nesta data
                      </p>
                    )}
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowRescheduleModal(false)}
                    disabled={rescheduling}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleConfirmReschedule}
                    disabled={!newDate || !newSlot || rescheduling}
                  >
                    {rescheduling ? 'Reagendando...' : 'Confirmar Reagendamento'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ClientLayout>
    </ProtectedRoute>
  )
}

