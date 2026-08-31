'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useEffect, useState } from 'react'
import {
  RiCalendarEventFill,
  RiCalendar2Fill,
  RiUserAddFill,
  RiTeamFill,
  RiMoneyDollarCircleFill,
  RiLineChartFill,
  RiTimeFill,
  RiSparklingFill,
  RiNotification3Fill,
  RiCheckboxCircleFill,
  RiAlertFill,
  RiCloseLine,
  RiCheckFill,
  RiEdit2Fill,
  RiGiftFill,
  RiPulseFill,
  RiBankCardFill,
  RiCake2Fill,
  RiHandCoinFill,
  RiArrowRightLine,
  RiCalendarScheduleFill,
} from 'react-icons/ri'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import { useConfirm } from '@/hooks/useConfirm'
import { NovoAgendamentoModal } from '@/components/admin/NovoAgendamentoModal'
import { AdicionarClienteModal } from '@/components/admin/AdicionarClienteModal'
import { DarVoucherModal } from '@/components/admin/DarVoucherModal'
import { AgendaSemanalModal } from '@/components/admin/AgendaSemanalModal'
import { ReagendarCancelarModal } from '@/components/admin/ReagendarCancelarModal'

interface Stats {
  totalClients: number
  todayAppointments: number
  monthRevenue: number
  activeSubscriptions: number
  completedToday: number
}

interface TodayAppointment {
  id: string
  time: string
  clientName: string
  service: string
  status: 'pending' | 'confirmed' | 'completed'
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  paymentAmount?: number
  origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED' | 'PACKAGE'
  startTime?: string
  machineKind?: 'LASER' | 'CRYO' | null
  cancelPolicy?: api.Appointment['cancelPolicy']
  packageSessionIndex?: number | null
  packageSessionCount?: number | null
}

interface RecentActivity {
  id: string
  type: 'appointment' | 'payment' | 'client' | 'subscription'
  description: string
  time: string
  icon: string
}

interface Birthday {
  id: string
  name: string
  date: string
  age?: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    todayAppointments: 0,
    monthRevenue: 0,
    activeSubscriptions: 0,
    completedToday: 0
  })
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(false)
  
  // Modais
  const [showNovoAgendamentoModal, setShowNovoAgendamentoModal] = useState(false)
  const [showAdicionarClienteModal, setShowAdicionarClienteModal] = useState(false)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [showHorariosModal, setShowHorariosModal] = useState(false)
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false)
  const [showReagendarCancelarModal, setShowReagendarCancelarModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<TodayAppointment | null>(null)

  const todayDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const currentMonthName = format(new Date(), 'MMMM', { locale: ptBR })

  // Dados do backend
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Birthday[]>([])

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadDashboardData()
  }, [])

  const isSunday = new Date().getDay() === 0

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const isSundayToday = now.getDay() === 0
      
      let appointmentsPromise: Promise<any[]>
      if (isSundayToday) {
        // Domingo é dia de folga da clínica: carregar os agendamentos de amanhã (Segunda-feira)
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
        const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59)
        appointmentsPromise = api.getAppointments({
          startDate: tomorrowStart.toISOString(),
          endDate: tomorrowEnd.toISOString()
        })
      } else {
        appointmentsPromise = api.getTodayAppointments()
      }

      // Buscar dados em paralelo
      const [statsData, appointmentsData, birthdaysData] = await Promise.all([
        api.getDashboardStats(),
        appointmentsPromise,
        api.getUpcomingBirthdays()
      ])

      setStats(statsData)
      
      // Filtrar apenas agendamentos ativos (não cancelados)
      const activeAppointments = appointmentsData.filter(apt => 
        apt.status !== 'CANCELED' && apt.status !== 'NO_SHOW'
      )
      
      setTodayAppointments(activeAppointments.map(apt => {
        // Extrair hora da string UTC como se fosse local (sem conversão de timezone)
        const timeParts = apt.startTime.match(/T(\d{2}):(\d{2})/)
        const time = timeParts ? `${timeParts[1]}:${timeParts[2]}` : '00:00'
        
        return {
          id: apt.id,
          time,
          clientName: apt.user?.name || 'Cliente',
          service: apt.service?.name || 'Serviço',
          status: apt.status === 'PENDING' ? 'pending' as const :
                  apt.status === 'CONFIRMED' ? 'confirmed' as const :
                  apt.status === 'COMPLETED' ? 'completed' as const : 'pending' as const,
          paymentStatus: apt.paymentStatus,
          paymentAmount: apt.paymentAmount ?? apt.service?.price,
          origin: apt.origin,
          startTime: apt.startTime,
          machineKind: apt.service?.machineKind,
          cancelPolicy: apt.cancelPolicy,
          packageSessionIndex: apt.packageSessionIndex,
          packageSessionCount: apt.packagePurchase?.sessionCount,
        }
      }))
      setUpcomingBirthdays(birthdaysData.map(b => {
        const birthDate = new Date(b.birthDate)
        return {
          id: b.id,
          name: b.name,
          date: format(birthDate, 'dd/MM'),
          age: b.age || 0
        }
      }))

      // Buscar notificações do admin para atividades recentes
      try {
        const adminNotifications = await api.getNotifications({
          userId: 'admin',
          limit: 10
        })
        
        const { formatTimeAgo } = await import('@/lib/timeUtils')
        
        const activities = adminNotifications.map(notif => {
          const timeAgo = formatTimeAgo(notif.createdAt)
          
          let activityType: 'appointment' | 'payment' | 'client' | 'subscription' = 'appointment'
          if (notif.type.includes('PAYMENT')) activityType = 'subscription'
          else if (notif.type.includes('SUBSCRIPTION') || notif.type.includes('PLAN')) activityType = 'subscription'
          else if (notif.type.includes('CLIENT') || notif.type.includes('REGISTERED')) activityType = 'client'
          
          return {
            id: notif.id,
            type: activityType,
            description: notif.title,
            time: timeAgo,
            icon: notif.icon.toLowerCase()
          }
        })
        
        setRecentActivities(activities)
      } catch (error) {
        console.error('Erro ao carregar notificações do admin:', error)
      }
    } catch (error) {
      console.error('Erro ao carregar dados da dashboard:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const { confirm, ConfirmDialogComponent } = useConfirm()

  const handleComplete = async (appointment: TodayAppointment) => {
    if (loadingAction) return
    
    setLoadingAction(true)
    try {
      await api.completeAppointment(appointment.id, false)
      toast.success(`Atendimento de ${appointment.clientName} finalizado!`)
      loadDashboardData()
    } catch (error) {
      console.error('Erro ao finalizar agendamento:', error)
      toast.error('Erro ao finalizar agendamento')
    } finally {
      setLoadingAction(false)
    }
  }

  const requestComplete = async (appointment: TodayAppointment) => {
    const confirmed = await confirm({
      title: 'Concluir Atendimento?',
      message: `Deseja marcar o atendimento de ${appointment.clientName} (${appointment.service}) como concluído?`,
      confirmText: 'Sim, Concluir',
      cancelText: 'Voltar',
      type: 'info'
    })
    if (!confirmed) return
    handleComplete(appointment)
  }

  const handleCompletePaid = async (appointment: TodayAppointment) => {
    if (loadingAction) return
    
    setLoadingAction(true)
    try {
      await api.completeAppointment(appointment.id, true)
      toast.success(`Pagamento registrado e agendamento concluído!`)
      loadDashboardData()
    } catch (error) {
      console.error('Erro ao concluir agendamento:', error)
      toast.error('Erro ao concluir agendamento')
    } finally {
      setLoadingAction(false)
    }
  }

  const requestCompletePaid = async (appointment: TodayAppointment) => {
    const formattedAmount = appointment.paymentAmount != null
      ? `R$ ${appointment.paymentAmount.toFixed(2).replace('.', ',')}`
      : 'o valor pendente'
    const confirmed = await confirm({
      title: 'Receber e Concluir?',
      message: `Confirmar recebimento de ${formattedAmount} e concluir a consulta de ${appointment.clientName}?`,
      confirmText: 'Receber & Concluir',
      cancelText: 'Voltar',
      type: 'info'
    })
    if (!confirmed) return
    handleCompletePaid(appointment)
  }

  const handleOpenReagendarCancelar = (appointment: TodayAppointment) => {
    setSelectedAppointment(appointment)
    setShowReagendarCancelarModal(true)
  }

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'calendar': return <RiCalendar2Fill className="w-4 h-4" />
      case 'dollar': return <RiMoneyDollarCircleFill className="w-4 h-4" />
      case 'user': return <RiTeamFill className="w-4 h-4" />
      case 'star': return <RiSparklingFill className="w-4 h-4" />
      default: return <RiPulseFill className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'appointment': return 'bg-blue-600 text-white'
      case 'payment': return 'bg-emerald-600 text-white'
      case 'client': return 'bg-purple-600 text-white'
      case 'subscription': return 'bg-rose-600 text-white'
      default: return 'bg-slate-700 text-white'
    }
  }

  return (
    <ProtectedRoute requiredRole="MANAGER">
      <div className="w-full">
        {ConfirmDialogComponent}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 rounded-full border-3 border-rose-600 border-t-transparent animate-spin mb-4"></div>
            <p className="text-sm font-semibold text-slate-600">Carregando painel da clínica...</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Top Greeting & Mobile-First Quick Actions */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Olá! Tenha um ótimo dia
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 capitalize mt-0.5">
                    {todayDate}
                  </p>
                </div>

                {/* Top Action Buttons: Mobile First Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
                  {/* Botão Principal: Novo Agendamento */}
                  <button
                    onClick={() => setShowNovoAgendamentoModal(true)}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 sm:py-2.5 bg-gradient-to-r from-rose-600 via-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-sm rounded-xl sm:rounded-2xl shadow-md shadow-rose-600/25 active:scale-[0.98] transition-all touch-manipulation cursor-pointer"
                  >
                    <RiCalendarEventFill className="w-5 h-5 flex-shrink-0 text-white" />
                    <span>Novo Agendamento</span>
                  </button>

                  {/* Botão em Destaque: Agenda Semanal (Gerenciar Horários da Mãe) */}
                  <button
                    onClick={() => setShowHorariosModal(true)}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl sm:rounded-2xl shadow-sm active:scale-[0.98] transition-all touch-manipulation cursor-pointer group"
                    title="Definir disponibilidade e horários da semana"
                  >
                    <RiCalendarScheduleFill className="w-5 h-5 flex-shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Agenda Semanal</span>
                  </button>

                  {/* Botão: Adicionar Cliente */}
                  <button
                    onClick={() => setShowAdicionarClienteModal(true)}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl sm:rounded-2xl border border-slate-300/80 active:scale-[0.98] transition-all touch-manipulation cursor-pointer"
                  >
                    <RiUserAddFill className="w-5 h-5 flex-shrink-0 text-slate-700" />
                    <span>Adicionar Cliente</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Principal de Conteúdo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Coluna Principal (2/3 no desktop) */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Agendamentos de Hoje / Amanhã se Domingo */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 p-3.5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isSunday ? 'bg-indigo-500' : 'bg-emerald-500'} animate-pulse`}></div>
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                          {isSunday ? 'Agendamentos de Segunda (Amanhã)' : 'Agendamentos de Hoje'}
                        </h2>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {isSunday ? (
                          <span>Hoje é domingo (folga da clínica) • <strong className="text-indigo-700">{todayAppointments.length}</strong> agendamento(s) amanhã</span>
                        ) : (
                          <span><strong className="text-emerald-700">{stats.completedToday}</strong> de <strong className="text-slate-800">{stats.todayAppointments}</strong> consultas concluídas</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/admin/agendamentos')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <span>Ver agenda</span>
                      <RiArrowRightLine className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {todayAppointments.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <RiCalendar2Fill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">
                        {isSunday ? 'Nenhum agendamento para segunda-feira' : 'Nenhum agendamento para hoje'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Clique em "Novo Agendamento" para adicionar uma cliente.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayAppointments.map((appointment) => {
                        const isCompleted = appointment.status === 'completed'
                        const isAdminPending = appointment.origin === 'ADMIN_CREATED' && (appointment.paymentStatus === 'PENDING' || !appointment.paymentStatus)
                        const isClientSingle = appointment.origin === 'SINGLE'
                        const isSubscription = appointment.origin === 'SUBSCRIPTION'
                        const isPackage = appointment.origin === 'PACKAGE'
                        const clinicAmount = appointment.paymentAmount
                        const packageSessionLabel = appointment.packageSessionIndex
                          ? `(${appointment.packageSessionIndex}/${appointment.packageSessionCount || 5}ª Sessão)`
                          : ''
                        
                        let cardBg = 'bg-white hover:bg-slate-50/80'
                        let cardBorder = 'border-slate-200'
                        let timeBg = 'bg-slate-900 text-white'
                        
                        if (!isCompleted) {
                          if (isAdminPending) {
                            cardBg = 'bg-gradient-to-r from-amber-500/10 via-amber-50/40 to-white'
                            cardBorder = 'border-amber-300 ring-1 ring-amber-400/20'
                            timeBg = 'bg-amber-600 text-white'
                          } else if (isSubscription) {
                            cardBg = 'bg-gradient-to-r from-violet-500/10 via-purple-50/40 to-white'
                            cardBorder = 'border-violet-300'
                            timeBg = 'bg-violet-700 text-white'
                          } else if (isPackage) {
                            cardBg = 'bg-gradient-to-r from-orange-500/10 via-orange-50/40 to-white'
                            cardBorder = 'border-orange-300'
                            timeBg = 'bg-orange-600 text-white'
                          } else if (isClientSingle) {
                            cardBg = 'bg-gradient-to-r from-blue-500/10 via-blue-50/40 to-white'
                            cardBorder = 'border-blue-300'
                            timeBg = 'bg-blue-600 text-white'
                          }
                        }
                        
                        return (
                          <div
                            key={appointment.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all shadow-xs ${cardBg} ${cardBorder}`}
                          >
                            {/* Left: Time & Client Info */}
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                              {/* Bold Time Badge */}
                              <div className={`px-2.5 py-1.5 sm:py-2 rounded-xl text-center flex-shrink-0 shadow-xs ${timeBg}`}>
                                <div className="text-sm sm:text-base font-extrabold tracking-tight">{appointment.time}</div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-sm sm:text-base truncate">
                                    {appointment.clientName}
                                  </span>

                                  {/* Strong Contrast Origin Badges */}
                                  {!isCompleted && isAdminPending && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-500 text-white shadow-xs">
                                      <RiHandCoinFill className="w-3 h-3" />
                                      Pagar na Clínica
                                    </span>
                                  )}
                                  {!isCompleted && isSubscription && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-violet-600 text-white shadow-xs">
                                      <RiSparklingFill className="w-3 h-3" />
                                      Plano VIP
                                    </span>
                                  )}
                                  {!isCompleted && isPackage && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-orange-600 text-white shadow-xs">
                                      <RiGiftFill className="w-3 h-3" />
                                      Pacote {packageSessionLabel}
                                    </span>
                                  )}
                                  {!isCompleted && isClientSingle && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-600 text-white shadow-xs">
                                      <RiBankCardFill className="w-3 h-3" />
                                      Avulso
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-1 truncate">
                                  <RiSparklingFill className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                                  <span className="truncate">{appointment.service}</span>
                                  {isAdminPending && !isCompleted && clinicAmount != null && (
                                    <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                                      R$ {clinicAmount.toFixed(2).replace('.', ',')}
                                    </span>
                                  )}
                                  {isPackage && packageSessionLabel && (
                                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                      isCompleted
                                        ? 'text-slate-600 bg-slate-100'
                                        : 'text-orange-700 bg-orange-100/80'
                                    }`}>
                                      {packageSessionLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Right: Actions */}
                            <div className="flex items-center justify-end gap-2.5 mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                              {appointment.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-extrabold">
                                  <RiCheckboxCircleFill className="w-4 h-4 text-emerald-600" />
                                  Concluído
                                </span>
                              ) : (
                                <>
                                  {/* Botão de Conclusão / Pagamento */}
                                  {isAdminPending ? (
                                    <button
                                      onClick={() => requestCompletePaid(appointment)}
                                      disabled={loadingAction}
                                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 touch-manipulation cursor-pointer"
                                      title="Receber Pagamento e Concluir Consulta"
                                    >
                                      {loadingAction ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <RiHandCoinFill className="w-4 h-4" />
                                      )}
                                      <span>Receber & Concluir</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => requestComplete(appointment)}
                                      disabled={loadingAction}
                                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50 touch-manipulation cursor-pointer"
                                      title="Finalizar consulta"
                                    >
                                      {loadingAction ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <RiCheckFill className="w-4 h-4" />
                                      )}
                                      <span>Concluir</span>
                                    </button>
                                  )}

                                  {/* Botão Editar em Destaque com espaçamento */}
                                  <button
                                    onClick={() => handleOpenReagendarCancelar(appointment)}
                                    disabled={loadingAction}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300/80 hover:border-slate-400 rounded-xl text-xs font-extrabold shadow-xs active:scale-95 transition-all disabled:opacity-50 touch-manipulation cursor-pointer"
                                    title="Editar, Reagendar ou Cancelar"
                                  >
                                    <RiEdit2Fill className="w-3.5 h-3.5 text-slate-600" />
                                    <span>Editar</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Atividades Recentes */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                      Atividades Recentes
                    </h2>
                    <button
                      onClick={() => router.push('/admin/atividades')}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Ver todas →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recentActivities.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">Nenhuma atividade recente registrada.</p>
                    ) : (
                      recentActivities.slice(0, 5).map((activity) => (
                        <div
                          key={activity.id}
                          onClick={() => router.push('/admin/atividades')}
                          className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${getActivityColor(activity.type)}`}>
                              {getActivityIcon(activity.icon)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{activity.description}</div>
                              <div className="text-[11px] font-medium text-slate-500">{activity.time}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna Lateral (1/3 no desktop) */}
              <div className="space-y-4 sm:space-y-6">
                {/* Gestão Rápida / Ações da Clínica */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3">
                    Acesso Rápido
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowHorariosModal(true)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200/80 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                          <RiCalendarScheduleFill className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block group-hover:text-indigo-700">Agenda Semanal</span>
                          <span className="text-[11px] text-slate-500 font-medium">Ajustar horários & folgas</span>
                        </div>
                      </div>
                      <RiArrowRightLine className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    <button
                      onClick={() => router.push('/admin/servicos')}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-rose-50/60 rounded-xl border border-slate-200/80 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                          <RiSparklingFill className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block group-hover:text-rose-700">Gerenciar Serviços</span>
                          <span className="text-[11px] text-slate-500 font-medium">Preços, duração e aparelhos</span>
                        </div>
                      </div>
                      <RiArrowRightLine className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                    
                    <button
                      onClick={() => setShowVoucherModal(true)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-200/80 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                          <RiGiftFill className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block group-hover:text-purple-700">Criar Voucher / Presente</span>
                          <span className="text-[11px] text-slate-500 font-medium">Presentear clientes</span>
                        </div>
                      </div>
                      <RiArrowRightLine className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>

                {/* Aniversariantes */}
                <div className="bg-gradient-to-br from-rose-900 via-pink-900 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-md">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <RiCake2Fill className="w-4 h-4 text-pink-300" />
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                        Aniversariantes
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowBirthdaysModal(true)}
                      className="text-xs font-bold text-pink-200 hover:text-white bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className="space-y-2">
                    {upcomingBirthdays.length === 0 ? (
                      <p className="text-xs text-pink-200/80 py-2">Nenhuma aniversariante neste período.</p>
                    ) : (
                      upcomingBirthdays.slice(0, 3).map((birthday) => (
                        <div
                          key={birthday.id}
                          className="flex items-center justify-between p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10"
                        >
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm">{birthday.name}</div>
                            <div className="text-[11px] text-pink-200">{birthday.age ? `${birthday.age} anos` : 'Cliente'}</div>
                          </div>
                          <div className="text-amber-300 font-extrabold text-xs px-2 py-0.5 rounded-md bg-white/10">{birthday.date}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Cards - Cores Fortes & Vibrantes (Mobile & Desktop) */}
              <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
                {/* Total Clientes */}
                <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 rounded-2xl shadow-md p-4 sm:p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <RiTeamFill className="w-5 h-5 text-white" />
                    </div>
                    <RiLineChartFill className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-0.5">{stats.totalClients}</div>
                  <div className="text-indigo-200 text-xs font-semibold">Total de Clientes</div>
                </div>

                {/* Agendamentos Hoje */}
                <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-2xl shadow-md p-4 sm:p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <RiCalendar2Fill className="w-5 h-5 text-white" />
                    </div>
                    <RiTimeFill className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-0.5">{stats.todayAppointments}</div>
                  <div className="text-emerald-200 text-xs font-semibold">Agendamentos Hoje</div>
                </div>

                {/* Receita do Mês */}
                <div className="bg-gradient-to-br from-rose-600 via-pink-700 to-purple-900 rounded-2xl shadow-md p-4 sm:p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <RiMoneyDollarCircleFill className="w-5 h-5 text-white" />
                    </div>
                    <RiSparklingFill className="w-4 h-4 text-rose-300" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-0.5">
                    R$ {(stats.monthRevenue / 1000).toFixed(1)}k
                  </div>
                  <div className="text-rose-200 text-xs font-semibold">Receita do Mês</div>
                </div>

                {/* Assinaturas Ativas */}
                <div className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 rounded-2xl shadow-md p-4 sm:p-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <RiNotification3Fill className="w-5 h-5 text-white" />
                    </div>
                    <RiSparklingFill className="w-4 h-4 text-violet-300" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-0.5">{stats.activeSubscriptions}</div>
                  <div className="text-violet-200 text-xs font-semibold">Assinaturas Ativas</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modais Administrativos */}
      <NovoAgendamentoModal 
        isOpen={showNovoAgendamentoModal}
        onClose={() => {
          setShowNovoAgendamentoModal(false)
          loadDashboardData()
        }}
      />
      
      <AdicionarClienteModal 
        isOpen={showAdicionarClienteModal}
        onClose={() => {
          setShowAdicionarClienteModal(false)
          loadDashboardData()
        }}
      />
      
      <DarVoucherModal 
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
      />
      
      <AgendaSemanalModal 
        isOpen={showHorariosModal}
        onClose={() => setShowHorariosModal(false)}
      />
      
      <ReagendarCancelarModal 
        isOpen={showReagendarCancelarModal}
        onClose={() => {
          setShowReagendarCancelarModal(false)
          setSelectedAppointment(null)
        }}
        onSuccess={() => {
          loadDashboardData()
          setShowReagendarCancelarModal(false)
          setSelectedAppointment(null)
        }}
        agendamento={selectedAppointment ? {
          id: selectedAppointment.id,
          cliente: selectedAppointment.clientName,
          servico: selectedAppointment.service,
          data: new Date().toLocaleDateString('pt-BR'),
          hora: selectedAppointment.time,
          origin: selectedAppointment.origin,
          paymentStatus: selectedAppointment.paymentStatus,
          paymentAmount: selectedAppointment.paymentAmount,
          startTime: selectedAppointment.startTime,
          machineKind: selectedAppointment.machineKind,
          cancelPolicy: selectedAppointment.cancelPolicy,
        } : undefined}
      />

      {/* Modal de Aniversariantes */}
      {showBirthdaysModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-3 pb-24 sm:pb-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <RiCake2Fill className="w-5 h-5 text-rose-600" />
                <span>Aniversariantes ({currentMonthName})</span>
              </h3>
              <button
                onClick={() => setShowBirthdaysModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5">
              {upcomingBirthdays.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Nenhum aniversariante cadastrado.</p>
              ) : (
                upcomingBirthdays.map((birthday) => (
                  <div
                    key={birthday.id}
                    className="flex items-center justify-between p-3.5 bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 rounded-2xl border border-pink-200"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{birthday.name}</div>
                      <div className="text-xs font-semibold text-slate-600">{birthday.age ? `${birthday.age} anos` : 'Cliente'}</div>
                    </div>
                    <div className="text-rose-700 font-extrabold text-sm px-2.5 py-1 bg-white rounded-lg shadow-xs">{birthday.date}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}

