'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  RiCalendar2Fill,
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiGridFill,
  RiListUnordered,
  RiLoader4Line,
  RiAlertFill,
} from 'react-icons/ri'
import { Button } from '@/components/Button'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { NovoAgendamentoModal } from '@/components/admin/NovoAgendamentoModal'
import { ReagendarCancelarModal } from '@/components/admin/ReagendarCancelarModal'
import { isFeriado, getFeriadosDoMes } from '@/lib/feriados'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'

interface Appointment {
  id: string
  clientName: string
  service: string
  startTime: Date
  endTime: Date
  status: 'scheduled' | 'completed' | 'canceled'
  notes?: string
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paymentAmount?: number
  origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED' | 'PACKAGE'
  machineKind?: 'LASER' | 'CRYO' | null
  cancelPolicy?: api.Appointment['cancelPolicy']
  packageSummary?: string
  packageSessionIndex?: number | null
  packageSessionCount?: number | null
}

// Função helper para converter UTC string para Date local (sem conversão de timezone)
// Exemplo: "2025-10-18T14:00:00.000Z" -> Date local com 14:00
function parseUTCasLocal(utcString: string): Date {
  const parts = utcString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!parts) return new Date()
  
  const [_, year, month, day, hours, minutes] = parts
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  )
}

function appointmentVisual(apt: Appointment) {
  const isAdminPending = apt.origin === 'ADMIN_CREATED' && (apt.paymentStatus === 'PENDING' || !apt.paymentStatus)
  const isSubscription = apt.origin === 'SUBSCRIPTION'
  const isClientSingle = apt.origin === 'SINGLE'
  const isPackage = apt.origin === 'PACKAGE'

  if (isAdminPending) {
    return {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      hoverBorder: 'hover:border-yellow-500',
      timeBg: 'bg-yellow-600',
      badge: '💰',
      badgeBg: 'bg-yellow-200 text-yellow-800',
    }
  }
  if (isSubscription) {
    return {
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      hoverBorder: 'hover:border-purple-400',
      timeBg: 'bg-purple-600',
      badge: '✨',
      badgeBg: 'bg-purple-200 text-purple-800',
    }
  }
  if (isPackage) {
    return {
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-600',
      hoverBorder: 'hover:border-orange-500',
      timeBg: 'bg-orange-600',
      badge: '🎁',
      badgeBg: 'bg-orange-200 text-orange-800',
    }
  }
  if (isClientSingle) {
    return {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      hoverBorder: 'hover:border-blue-400',
      timeBg: 'bg-blue-600',
      badge: '💳',
      badgeBg: 'bg-blue-200 text-blue-800',
    }
  }
  return {
    bgColor: 'bg-white',
    borderColor: 'border-pink-200',
    hoverBorder: 'hover:border-pink-400',
    timeBg: 'bg-pink-600',
    badge: '',
    badgeBg: '',
  }
}

function DayAppointmentCard({
  apt,
  onOpen,
}: {
  apt: Appointment
  onOpen: (apt: Appointment) => void
}) {
  const visual = appointmentVisual(apt)

  return (
    <button
      type="button"
      onClick={() => onOpen(apt)}
      className={`w-full border-2 rounded-xl p-4 hover:shadow-md transition-all text-left ${visual.bgColor} ${visual.borderColor} ${visual.hoverBorder}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg text-white ${visual.timeBg}`}>
          <span className="text-xl font-bold">
            {format(apt.startTime, 'HH')}
          </span>
          <span className="text-xs">
            {format(apt.startTime, 'mm')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-gray-900 text-base truncate">
              {apt.clientName}
            </h4>
            {visual.badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold shrink-0 ${visual.badgeBg}`}>
                {visual.badge}
              </span>
            )}
            {apt.packageSessionIndex && (
              <span className="text-xs px-2 py-0.5 rounded-md font-extrabold bg-orange-100 text-orange-800 border border-orange-200 shrink-0">
                {apt.packageSessionIndex}/{apt.packageSessionCount || 5}ª Sessão
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5">
            {apt.service}
          </p>
          {apt.packageSummary && (
            <p className="text-xs text-orange-700 mt-0.5">{apt.packageSummary}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
          apt.status === 'completed'
            ? 'bg-green-500 text-white'
            : apt.status === 'canceled'
            ? 'bg-red-500 text-white'
            : apt.status === 'scheduled'
            ? 'bg-pink-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          {apt.status === 'completed' ? 'Concluído' :
           apt.status === 'canceled' ? 'Cancelado' :
           apt.status === 'scheduled' ? 'Agendado' : 'Confirmado'}
        </span>
        {apt.status !== 'completed' && apt.status !== 'canceled' && (
          <span className="text-xs text-gray-500">
            Toque para gerenciar
          </span>
        )}
      </div>
    </button>
  )
}

function PaymentLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-yellow-100 border-l-2 border-yellow-600 rounded"></div>
        <span className="text-gray-600">💰 Pagar na Clínica</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-purple-100 border-l-2 border-purple-600 rounded"></div>
        <span className="text-gray-600">✨ Plano/Assinatura</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-blue-100 border-l-2 border-blue-600 rounded"></div>
        <span className="text-gray-600">💳 Cliente Avulso</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-orange-100 border-l-2 border-orange-600 rounded"></div>
        <span className="text-gray-600">🎁 Pacote</span>
      </div>
    </div>
  )
}

export default function AgendamentosPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false)
  const [isReagendarOpen, setIsReagendarOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<{
    id: string
    cliente: string
    servico: string
    data: string
    hora: string
    status?: string
    origin?: Appointment['origin']
    paymentStatus?: Appointment['paymentStatus']
    paymentAmount?: number
    startTime?: Date
    machineKind?: Appointment['machineKind']
    cancelPolicy?: Appointment['cancelPolicy']
  } | undefined>()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [manualRefunds, setManualRefunds] = useState<api.Appointment[]>([])
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  // Buscar agendamentos do backend
  useEffect(() => {
    loadAppointments()
  }, [currentWeek, currentMonth, viewMode])

  useEffect(() => {
    const ws = startOfWeek(currentWeek, { weekStartsOn: 0 })
    const inWeek = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
      .some((day) => isSameDay(day, selectedDate))
    if (!inWeek) {
      setSelectedDate(addDays(ws, selectedDate.getDay()))
    }
  }, [currentWeek])

  useEffect(() => {
    if (viewMode !== 'month') return
    if (!isSameMonth(selectedDate, currentMonth)) {
      const today = new Date()
      setSelectedDate(isSameMonth(today, currentMonth) ? today : startOfMonth(currentMonth))
    }
  }, [currentMonth, viewMode])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      // Definir range de datas baseado no modo de visualização
      let startDate: Date
      let endDate: Date

      if (viewMode === 'week') {
        startDate = startOfWeek(currentWeek, { weekStartsOn: 0 })
        endDate = addDays(startDate, 6)
        endDate.setHours(23, 59, 59)
      } else {
        startDate = startOfMonth(currentMonth)
        endDate = endOfMonth(currentMonth)
        endDate.setHours(23, 59, 59)
      }

      const appts = await api.getAppointments({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      // Filtrar agendamentos cancelados
      const activeAppts = appts.filter(apt => apt.status !== 'CANCELED' && apt.status !== 'NO_SHOW')

      const parsedAppointments = activeAppts.map(apt => {
        const startLocal = parseUTCasLocal(apt.startTime)
        const endLocal = parseUTCasLocal(apt.endTime)
        
        console.log(`📅 Agendamento ${apt.id}:`, {
          cliente: apt.user?.name,
          utcString: apt.startTime,
          localDate: startLocal.toLocaleString('pt-BR'),
          hora: format(startLocal, 'HH:mm'),
          origin: apt.origin,
          paymentStatus: apt.paymentStatus,
          isAdminPending: apt.origin === 'ADMIN_CREATED' && (apt.paymentStatus === 'PENDING' || !apt.paymentStatus)
        })
        
        return {
          id: apt.id,
          clientName: apt.user?.name || 'Cliente',
          service: apt.service?.name || 'Serviço',
          startTime: startLocal,
          endTime: endLocal,
          status: apt.status === 'COMPLETED' ? 'completed' as const : 
                  apt.status === 'CANCELED' ? 'canceled' as const : 'scheduled' as const,
          notes: apt.notes,
          paymentStatus: apt.paymentStatus,
          paymentAmount: apt.paymentAmount,
          origin: apt.origin,
          machineKind: apt.service?.machineKind,
          cancelPolicy: apt.cancelPolicy,
          packageSessionIndex: apt.packageSessionIndex,
          packageSessionCount: apt.packagePurchase?.sessionCount,
          packageSummary: Array.isArray(apt.packagePurchase?.itemsSnapshot)
            ? apt.packagePurchase.itemsSnapshot.map((item: any) => item.name).join(' + ')
            : apt.service?.packageItems
              ?.map((item) => item.includedService?.name)
              .filter(Boolean)
              .join(' + '),
        }
      })
      
      setAppointments(parsedAppointments)

      try {
        const pending = await api.getAppointments({ refundStatus: 'MANUAL_REQUIRED' })
        setManualRefunds(pending)
      } catch (refundErr) {
        console.error('Erro ao carregar reembolsos manuais:', refundErr)
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Calcular horários dinamicamente baseado nos agendamentos (janela admin 6h–21h)
  const getHoursRange = () => {
    if (appointments.length === 0) {
      return Array.from({ length: 13 }, (_, i) => i + 8) // 8h às 20h (padrão)
    }
    
    // Encontrar hora mínima e máxima dos agendamentos
    let minHour = 24
    let maxHour = 0
    
    appointments.forEach(apt => {
      const hour = apt.startTime.getHours()
      if (hour < minHour) minHour = hour
      if (hour > maxHour) maxHour = hour
    })
    
    minHour = Math.max(6, minHour - 1)
    maxHour = Math.min(21, maxHour + 1)
    
    const hoursCount = Math.max(1, maxHour - minHour + 1)
    return Array.from({ length: hoursCount }, (_, i) => i + minHour)
  }
  
  const hours = getHoursRange()

  const openManage = (apt: Appointment) => {
    if (apt.status === 'completed' || apt.status === 'canceled') return
    setSelectedAppointment({
      id: apt.id,
      cliente: apt.clientName,
      servico: apt.service,
      data: format(apt.startTime, 'dd/MM/yyyy'),
      hora: format(apt.startTime, 'HH:mm'),
      status: apt.status,
      origin: apt.origin,
      paymentStatus: apt.paymentStatus,
      paymentAmount: apt.paymentAmount,
      startTime: apt.startTime,
      machineKind: apt.machineKind,
      cancelPolicy: apt.cancelPolicy,
    })
    setIsReagendarOpen(true)
  }

  const retryRefund = async (id: string) => {
    setRetryingId(id)
    try {
      const result = await api.retryAppointmentRefund(id)
      toast.success(result?.message || 'Estorno solicitado novamente')
      await loadAppointments()
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível retentar o estorno')
    } finally {
      setRetryingId(null)
    }
  }

  const getAppointmentsForDateTime = (date: Date, hour: number) => {
    return appointments.filter(apt => {
      const aptHour = apt.startTime.getHours()
      return isSameDay(apt.startTime, date) && aptHour === hour
    })
  }

  const getAppointmentsForDate = (date: Date) => {
    return appointments
      .filter(apt => isSameDay(apt.startTime, date))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }

  const selectedDayAppointments = getAppointmentsForDate(selectedDate)
  const selectedFeriado = isFeriado(selectedDate)

  const goToAdjacentDay = (delta: number) => {
    const next = addDays(selectedDate, delta)
    const nextWeekStart = startOfWeek(next, { weekStartsOn: 0 })
    const shownWeekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
    if (!isSameDay(nextWeekStart, shownWeekStart)) {
      setCurrentWeek(next)
    }
    setSelectedDate(next)
  }

  const handleWeekSwipeStart = (event: React.TouchEvent) => {
    swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  const handleWeekSwipeEnd = (event: React.TouchEvent) => {
    if (!swipeStart.current) return
    const dx = event.changedTouches[0].clientX - swipeStart.current.x
    const dy = event.changedTouches[0].clientY - swipeStart.current.y
    swipeStart.current = null
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return
    goToAdjacentDay(dx < 0 ? 1 : -1)
  }

  // Buscar feriados baseado no modo de visualização
  const feriadosDoMes = viewMode === 'month' 
    ? getFeriadosDoMes(currentMonth.getFullYear(), currentMonth.getMonth())
    : getFeriadosDoMes(currentWeek.getFullYear(), currentWeek.getMonth())

  return (
    <div className="space-y-6">
      {manualRefunds.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <RiAlertFill className="w-5 h-5 text-amber-600" />
            Reembolso manual necessário ({manualRefunds.length})
          </div>
          <p className="text-xs text-amber-800">
            O estorno automático no Asaas falhou. Cancele o horário já está feito — devolva o valor no painel Asaas ou tente de novo.
          </p>
          <div className="space-y-2">
            {manualRefunds.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold">
                <div>
                  <span className="font-bold text-slate-900">{item.user?.name || 'Cliente'}</span>
                  {' · '}
                  <span className="text-slate-600">{item.service?.name}</span>
                  {item.paymentAmount != null && (
                    <span className="text-slate-900 font-bold"> · R$ {item.paymentAmount.toFixed(2).replace('.', ',')}</span>
                  )}
                  {item.refundError ? (
                    <div className="text-[11px] text-amber-700 mt-0.5">{item.refundError}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={retryingId === item.id}
                  onClick={() => retryRefund(item.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-60 transition-colors"
                >
                  {retryingId === item.id ? 'Tentando...' : 'Tentar estorno de novo'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 shrink-0 border border-slate-200">
            <button
              onClick={() => {
                setViewMode('week')
                setCurrentWeek(selectedDate)
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all inline-flex items-center gap-1.5 ${
                viewMode === 'week'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RiListUnordered className="w-4 h-4" />
              Semana
            </button>
            <button
              onClick={() => {
                setViewMode('month')
                setCurrentMonth(selectedDate)
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all inline-flex items-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RiGridFill className="w-4 h-4" />
              Mês
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 min-w-0 shadow-xs">
            <button
              onClick={() => {
                if (viewMode === 'week') {
                  setCurrentWeek(subWeeks(currentWeek, 1))
                } else {
                  setCurrentMonth(subMonths(currentMonth, 1))
                }
              }}
              className="p-1.5 sm:p-2 hover:bg-slate-50 shrink-0 text-slate-600"
              aria-label="Anterior"
            >
              <RiArrowLeftSLine className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="px-1.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap tabular-nums">
              {viewMode === 'week' 
                ? `${format(weekStart, 'dd/MM')} → ${format(addDays(weekStart, 6), 'dd/MM')}`
                : (
                  <>
                    <span className="md:hidden">{format(currentMonth, 'MM/yyyy')}</span>
                    <span className="hidden md:inline capitalize">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </>
                )
              }
            </span>
            <button
              onClick={() => {
                if (viewMode === 'week') {
                  setCurrentWeek(addWeeks(currentWeek, 1))
                } else {
                  setCurrentMonth(addMonths(currentMonth, 1))
                }
              }}
              className="p-1.5 sm:p-2 hover:bg-slate-50 shrink-0 text-slate-600"
              aria-label="Próximo"
            >
              <RiArrowRightSLine className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="px-2.5 sm:px-3 text-xs font-bold"
            onClick={() => {
              const today = new Date()
              setCurrentWeek(today)
              setCurrentMonth(today)
              setSelectedDate(today)
            }}
          >
            Hoje
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            className="px-2.5 sm:px-3"
            onClick={() => setIsNovoAgendamentoOpen(true)}
          >
            <RiAddLine className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
          <div className="text-center">
            <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
            <p className="text-slate-600 text-xs font-semibold">Carregando agendamentos...</p>
          </div>
        </div>
      )}

      {/* Feriados do Mês */}
      {!loading && feriadosDoMes.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 rounded-2xl p-4">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm">
            <RiCalendar2Fill className="w-4 h-4 text-rose-600" />
            Feriados {viewMode === 'month' && `- ${format(currentMonth, "MMMM", { locale: ptBR })}`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {feriadosDoMes.map((feriado, idx) => (
              <div
                key={idx}
                className={`px-3 py-1 rounded-xl text-xs font-bold shadow-xs ${
                  feriado.tipo === 'nacional'
                    ? 'bg-rose-600 text-white'
                    : 'bg-orange-600 text-white'
                }`}
              >
                {format(new Date(feriado.data + 'T00:00:00'), "d 'de' MMM", { locale: ptBR })} - {feriado.nome}
                {feriado.tipo === 'estadual' && ' (SP)'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid - Mobile Optimized */}
      {!loading && (viewMode === 'week' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Week header */}
        <div className="hidden md:grid md:grid-cols-8 border-b border-gray-200 bg-gray-50">
          <div className="p-4 text-sm font-medium text-gray-500">
            Horário
          </div>
          {weekDays.map((day, index) => {
            const isCurrentDay = isToday(day)
            return (
              <div
                key={index}
                className={`p-4 text-center ${isCurrentDay ? 'bg-pink-50' : ''}`}
              >
                <div className={`text-xs font-medium ${isCurrentDay ? 'text-pink-600' : 'text-gray-500'}`}>
                  {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                </div>
                <div className={`text-lg font-bold mt-1 ${isCurrentDay ? 'text-pink-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Calendar body - Desktop */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide">
          <div className="grid grid-cols-8 divide-y divide-gray-200">
            {hours.map((hour) => (
              <React.Fragment key={`hour-${hour}`}>
                {/* Hour label */}
                <div
                  className="p-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200"
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>

                {/* Day cells */}
                {weekDays.map((day, dayIndex) => {
                  const dayAppointments = getAppointmentsForDateTime(day, hour)
                  const isCurrentDay = isToday(day)

                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className={`relative min-h-[80px] p-2 border-r border-gray-200 hover:bg-gray-50 cursor-pointer ${
                        isCurrentDay ? 'bg-pink-50/30' : ''
                      }`}
                    >
                      {dayAppointments.map((apt) => {
                        // ADMIN_CREATED sem paymentStatus = PENDING por padrão (fallback para registros antigos)
                        const isAdminPending = apt.origin === 'ADMIN_CREATED' && (apt.paymentStatus === 'PENDING' || !apt.paymentStatus)
                        const isSubscription = apt.origin === 'SUBSCRIPTION'
                        const isClientSingle = apt.origin === 'SINGLE'
                        const isPackage = apt.origin === 'PACKAGE'
                        
                        let bgColor = 'bg-pink-100'
                        let borderColor = 'border-pink-600'
                        let textColor = 'text-pink-900'
                        let textSecondary = 'text-pink-700'
                        let badge = ''
                        
                        if (isAdminPending) {
                          bgColor = 'bg-yellow-100'
                          borderColor = 'border-yellow-600'
                          textColor = 'text-yellow-900'
                          textSecondary = 'text-yellow-700'
                          badge = '💰'
                        } else if (isSubscription) {
                          bgColor = 'bg-purple-100'
                          borderColor = 'border-purple-600'
                          textColor = 'text-purple-900'
                          textSecondary = 'text-purple-700'
                          badge = '✨'
                        } else if (isPackage) {
                          bgColor = 'bg-orange-100'
                          borderColor = 'border-orange-600'
                          textColor = 'text-orange-900'
                          textSecondary = 'text-orange-700'
                          badge = '🎁'
                        } else if (isClientSingle) {
                          bgColor = 'bg-blue-100'
                          borderColor = 'border-blue-600'
                          textColor = 'text-blue-900'
                          textSecondary = 'text-blue-700'
                          badge = '💳'
                        }
                        
                        return (
                        <button
                          key={apt.id}
                          onClick={() => openManage(apt)}
                            className={`w-full mb-1 p-2 border-l-2 rounded text-xs hover:opacity-80 transition-colors text-left ${bgColor} ${borderColor}`}
                          >
                            <div className={`font-medium ${textColor}`}>
                            {format(apt.startTime, 'HH:mm')} - {apt.clientName}
                              {badge && <span className="ml-1">{badge}</span>}
                          </div>
                            <div className={`mt-0.5 ${textSecondary}`}>
                            {apt.service}
                          </div>
                          {apt.packageSummary && (
                            <div className="mt-0.5 text-[10px] text-orange-700 leading-tight">
                              {apt.packageSummary}
                            </div>
                          )}
                        </button>
                        )
                      })}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Calendar Mobile - faixa de dias + lista */}
        <div
          className="md:hidden"
          onTouchStart={handleWeekSwipeStart}
          onTouchEnd={handleWeekSwipeEnd}
        >
          <div className="grid grid-cols-7 gap-1 px-2 py-2 border-b border-gray-100">
            {weekDays.map((day) => {
              const selected = isSameDay(day, selectedDate)
              const currentDay = isToday(day)
              const feriadoInfo = isFeriado(day)
              const hasAppointments = getAppointmentsForDate(day).length > 0

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center justify-center py-2 rounded-xl min-h-[56px] transition-colors ${
                    selected
                      ? 'bg-pink-600 text-white shadow-sm'
                      : currentDay
                      ? 'bg-pink-50 text-pink-600'
                      : feriadoInfo.isFeriado
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase ${selected ? 'text-white/90' : ''}`}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className="text-base font-bold leading-tight">
                    {format(day, 'd')}
                  </span>
                  {hasAppointments && (
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-pink-400'}`} />
                  )}
                </button>
              )
            })}
          </div>

          <div className="p-3">
            <div className={`mb-3 p-4 rounded-xl ${
              isToday(selectedDate) ? 'bg-pink-600' : selectedFeriado.isFeriado ? 'bg-red-600' : 'bg-gray-100'
            }`}>
              <div className={`text-xs font-bold uppercase ${
                isToday(selectedDate) || selectedFeriado.isFeriado ? 'text-white/90' : 'text-gray-500'
              }`}>
                {format(selectedDate, 'EEEE', { locale: ptBR })}
              </div>
              <div className={`text-2xl font-bold ${
                isToday(selectedDate) || selectedFeriado.isFeriado ? 'text-white' : 'text-gray-900'
              }`}>
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </div>
              {selectedFeriado.isFeriado && (
                <div className="mt-2 text-xs text-white bg-white/20 px-2 py-1 rounded-md inline-block">
                  {selectedFeriado.nome}
                </div>
              )}
            </div>

            <div className="space-y-3 pb-2">
              {selectedDayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                  <RiCalendar2Fill className="w-14 h-14 mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">Nenhum agendamento</p>
                  <p className="text-xs text-slate-400 mt-0.5">Deslize para outro dia</p>
                </div>
              ) : (
                selectedDayAppointments.map((apt) => (
                  <DayAppointmentCard key={apt.id} apt={apt} onOpen={openManage} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      ) : (
        // Visualização Mensal
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Calendar header - dias da semana */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((dia) => (
              <div key={dia} className="p-1 md:p-3 text-center text-[10px] md:text-xs font-bold text-gray-600 min-w-0">
                <span className="md:hidden">{dia[0]}</span>
                <span className="hidden md:inline">{dia}</span>
              </div>
            ))}
          </div>

          {/* Calendar body */}
          <div className="grid grid-cols-7">
            {/* Preencher dias vazios do início */}
            {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[52px] md:min-h-[100px] min-w-0 bg-gray-50 border-b border-r border-gray-100"></div>
            ))}

            {/* Dias do mês */}
            {monthDays.map((day) => {
              const dayAppointments = getAppointmentsForDate(day)
              const isCurrentDay = isToday(day)
              const isSelected = isSameDay(day, selectedDate)
              const feriadoInfo = isFeriado(day)
              
              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDate(day)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedDate(day)
                    }
                  }}
                  className={`min-h-[52px] md:min-h-[100px] min-w-0 p-0.5 md:p-2 border-b border-r border-gray-100 overflow-hidden text-left cursor-pointer ${
                    isSelected
                      ? 'bg-pink-100 ring-2 ring-inset ring-pink-500'
                      : isCurrentDay
                      ? 'bg-pink-50'
                      : feriadoInfo.isFeriado
                      ? 'bg-red-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center md:justify-between mb-0 md:mb-2">
                    <span className={`text-[11px] md:text-sm font-bold ${
                      isSelected || isCurrentDay ? 'text-pink-600' : feriadoInfo.isFeriado ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {feriadoInfo.isFeriado && (
                    <div className={`hidden md:block text-[10px] font-medium mb-1 truncate ${
                      feriadoInfo.tipo === 'nacional' ? 'text-red-700' : 'text-orange-700'
                    }`}>
                      {feriadoInfo.nome}
                    </div>
                  )}

                  {dayAppointments.length > 0 && (
                    <div className="md:hidden flex justify-center mt-0.5">
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold leading-[18px] text-center">
                        {dayAppointments.length}
                      </span>
                    </div>
                  )}

                  {/* Desktop: Mostrar lista de appointments */}
                  <div className="hidden md:block space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => {
                      const isAdminPending = apt.origin === 'ADMIN_CREATED' && (apt.paymentStatus === 'PENDING' || !apt.paymentStatus)
                      const isSubscription = apt.origin === 'SUBSCRIPTION'
                      const isClientSingle = apt.origin === 'SINGLE'
                      const isPackage = apt.origin === 'PACKAGE'
                      
                      let bgColor = 'bg-pink-100'
                      let borderColor = 'border-pink-600'
                      let textColor = 'text-pink-900'
                      let badge = ''
                      
                      if (isAdminPending) {
                        bgColor = 'bg-yellow-100'
                        borderColor = 'border-yellow-600'
                        textColor = 'text-yellow-900'
                        badge = '💰'
                      } else if (isSubscription) {
                        bgColor = 'bg-purple-100'
                        borderColor = 'border-purple-600'
                        textColor = 'text-purple-900'
                        badge = '✨'
                      } else if (isPackage) {
                        bgColor = 'bg-orange-100'
                        borderColor = 'border-orange-600'
                        textColor = 'text-orange-900'
                        badge = '🎁'
                      } else if (isClientSingle) {
                        bgColor = 'bg-blue-100'
                        borderColor = 'border-blue-600'
                        textColor = 'text-blue-900'
                        badge = '💳'
                      }
                      
                      return (
                        <button
                          key={apt.id}
                          onClick={(event) => {
                            event.stopPropagation()
                            openManage(apt)
                          }}
                          className={`w-full p-1.5 border-l-2 rounded text-[10px] hover:opacity-80 transition-colors text-left ${bgColor} ${borderColor}`}
                        >
                          <div className={`font-medium truncate ${textColor}`}>
                            {format(apt.startTime, 'HH:mm')} {apt.clientName} {badge}
                          </div>
                        </button>
                      )
                    })}
                    {dayAppointments.length > 2 && (
                      <div className="text-[10px] text-center text-pink-600 font-medium">
                        +{dayAppointments.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {Array.from({ length: (7 - ((monthStart.getDay() + monthDays.length) % 7)) % 7 }).map((_, idx) => (
              <div key={`empty-end-${idx}`} className="min-h-[52px] md:min-h-[100px] min-w-0 bg-gray-50 border-b border-r border-gray-100"></div>
            ))}
          </div>
        </div>
      ))}

      {!loading && (
        <div className="space-y-3">
          <PaymentLegend />

          {viewMode === 'month' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <h3 className="text-base font-bold text-gray-900 capitalize">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <span className="text-xs font-medium text-pink-600 shrink-0">
                  {selectedDayAppointments.length} agendamento{selectedDayAppointments.length === 1 ? '' : 's'}
                </span>
              </div>
              {selectedFeriado.isFeriado && (
                <p className="text-xs text-red-600 font-medium mb-3">
                  {selectedFeriado.nome}
                </p>
              )}
              {selectedDayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                  <RiCalendar2Fill className="w-12 h-12 mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">Nenhum agendamento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayAppointments.map((apt) => (
                    <DayAppointmentCard key={apt.id} apt={apt} onOpen={openManage} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <NovoAgendamentoModal 
        isOpen={isNovoAgendamentoOpen}
        onClose={() => {
          setIsNovoAgendamentoOpen(false)
          loadAppointments() // Recarregar após criar
        }}
      />
      
      <ReagendarCancelarModal 
        isOpen={isReagendarOpen}
        onClose={() => {
          setIsReagendarOpen(false)
          setSelectedAppointment(undefined)
        }}
        onSuccess={() => {
          loadAppointments() // Recarregar após reagendar/cancelar
          setIsReagendarOpen(false)
          setSelectedAppointment(undefined)
        }}
        agendamento={selectedAppointment}
      />
    </div>
  )
}

