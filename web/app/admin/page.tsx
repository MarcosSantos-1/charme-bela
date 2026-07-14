'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useEffect, useState } from 'react'
import { Calendar, Users, DollarSign, TrendingUp, Clock, Sparkles, Bell, CheckCircle, AlertCircle, Plus, UserPlus, X as XIcon, Check, Ban, Edit, Gift, Activity, CreditCard, UserCheck, Cake, Banknote } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import { NovoAgendamentoModal } from '@/components/admin/NovoAgendamentoModal'
import { AdicionarClienteModal } from '@/components/admin/AdicionarClienteModal'
import { DarVoucherModal } from '@/components/admin/DarVoucherModal'
import { DefinirHorariosModal } from '@/components/admin/DefinirHorariosModal'
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
  origin: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED'
}

interface RecentActivity {
  id: string
  type: 'appointment' | 'payment' | 'client' | 'subscription'
  description: string
  time: string
  icon: 'calendar' | 'dollar' | 'user' | 'star'
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

  // Dados do backend
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Birthday[]>([])

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Buscar dados em paralelo
      const [statsData, appointmentsData, birthdaysData] = await Promise.all([
        api.getDashboardStats(),
        api.getTodayAppointments(),
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
          clientName: apt.user.name,
          service: apt.service.name,
          status: apt.status === 'PENDING' ? 'pending' as const :
                  apt.status === 'CONFIRMED' ? 'confirmed' as const :
                  apt.status === 'COMPLETED' ? 'completed' as const : 'pending' as const,
          paymentStatus: apt.paymentStatus,
          origin: apt.origin
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
        
        // Importar função helper
        const { formatTimeAgo } = await import('@/lib/timeUtils')
        
        // Mapear notificações para formato de atividades
        const activities = adminNotifications.map(notif => {
          const timeAgo = formatTimeAgo(notif.createdAt)
          
          // Mapear tipo de notificação para tipo de atividade
          let activityType: 'appointment' | 'payment' | 'client' | 'subscription' = 'appointment'
          // Priorizar PAYMENT primeiro
          if (notif.type.includes('PAYMENT')) activityType = 'subscription' // Pagamentos aparecem como subscription no dashboard resumido
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

  const handleComplete = async (appointment: TodayAppointment) => {
    if (loadingAction) return
    
    setLoadingAction(true)
    try {
      await api.completeAppointment(appointment.id, false)
      toast.success(`Consulta de ${appointment.clientName} finalizada! ✅`)
      
      // Recarregar dados
      loadDashboardData()
    } catch (error) {
      console.error('Erro ao finalizar agendamento:', error)
      toast.error('Erro ao finalizar agendamento')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCompletePaid = async (appointment: TodayAppointment) => {
    if (loadingAction) return
    
    setLoadingAction(true)
    try {
      await api.completeAppointment(appointment.id, true)
      toast.success(`Pagamento recebido e agendamento concluído! ✅`)
      
      // Recarregar dados
      loadDashboardData()
    } catch (error) {
      console.error('Erro ao concluir agendamento:', error)
      toast.error('Erro ao concluir agendamento')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleOpenReagendarCancelar = (appointment: TodayAppointment) => {
    setSelectedAppointment(appointment)
    setShowReagendarCancelarModal(true)
  }

  const handleReagendarCancelarSuccess = () => {
    // Recarregar dados após reagendar ou cancelar
    loadDashboardData()
    setShowReagendarCancelarModal(false)
    setSelectedAppointment(null)
  }

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'calendar': return <Calendar className="w-4 h-4" />
      case 'dollar': return <DollarSign className="w-4 h-4" />
      case 'user': return <UserCheck className="w-4 h-4" />
      case 'star': return <Sparkles className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'appointment': return 'bg-blue-100 text-blue-600'
      case 'payment': return 'bg-green-100 text-green-600'
      case 'client': return 'bg-purple-100 text-purple-600'
      case 'subscription': return 'bg-pink-100 text-pink-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <ProtectedRoute requiredRole="MANAGER">
      <div className="min-h-screen bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dashboard...</p>
            </div>
          </div>
        ) : (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header com Ações Rápidas */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vinda!</h1>
              <p className="text-gray-600 capitalize">{todayDate}</p>
            </div>
            
            {/* Botões de Ação Rápida */}
            <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
              <button
                onClick={() => setShowNovoAgendamentoModal(true)}
                className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Agendamento
              </button>
              <button
                onClick={() => setShowAdicionarClienteModal(true)}
                className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Adicionar Cliente
              </button>
            </div>
          </div>

          {/* Grid de Conteúdo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Agendamentos de Hoje */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Agendamentos de Hoje</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {stats.completedToday}/{stats.todayAppointments} concluídos
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/admin/agendamentos')}
                    className="text-pink-600 text-sm font-medium hover:text-pink-700"
                  >
                    Ver todos →
                  </button>
                </div>

                <div className="space-y-3 -mx-3 sm:mx-0">
                  {todayAppointments.map((appointment) => {
                    // Determinar tipo de agendamento
                    const isAdminPending = appointment.origin === 'ADMIN_CREATED' && appointment.paymentStatus === 'PENDING' // Admin criou, pagar na clínica
                    const isClientSingle = appointment.origin === 'SINGLE' // Cliente avulso (vai pagar no checkout)
                    const isSubscription = appointment.origin === 'SUBSCRIPTION' // Do plano
                    
                    // Definir cores baseado no tipo
                    let bgGradient = 'bg-gradient-to-r from-white to-gray-50'
                    let borderColor = 'border-gray-200'
                    let timeBg = 'bg-pink-50'
                    let timeColor = 'text-pink-600'
                    
                    if (isAdminPending) {
                      bgGradient = 'bg-gradient-to-r from-yellow-50 to-orange-50'
                      borderColor = 'border-yellow-400'
                      timeBg = 'bg-yellow-100'
                      timeColor = 'text-yellow-700'
                    } else if (isSubscription) {
                      bgGradient = 'bg-gradient-to-r from-purple-50 to-purple-100'
                      borderColor = 'border-purple-300'
                      timeBg = 'bg-purple-100'
                      timeColor = 'text-purple-700'
                    } else if (isClientSingle) {
                      bgGradient = 'bg-gradient-to-r from-blue-50 to-blue-100'
                      borderColor = 'border-blue-300'
                      timeBg = 'bg-blue-100'
                      timeColor = 'text-blue-700'
                    }
                    
                    return (
                    <div
                      key={appointment.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 sm:rounded-xl rounded-none border-2 hover:shadow-md transition-all min-h-[100px] sm:min-h-[90px] ${bgGradient} ${borderColor}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className={`text-center min-w-[56px] rounded-lg p-2 flex-shrink-0 ${timeBg}`}>
                            <div className={`text-base sm:text-lg font-bold ${timeColor}`}>{appointment.time}</div>
                        </div>
                          <div className="hidden sm:block h-12 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                              <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{appointment.clientName}</div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                              {isAdminPending && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-yellow-200 text-yellow-800 whitespace-nowrap">
                                  💰 Pagar
                                </span>
                              )}
                              {isSubscription && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-purple-200 text-purple-800 whitespace-nowrap">
                                  ✨ Plano
                                </span>
                              )}
                              {isClientSingle && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-200 text-blue-800 whitespace-nowrap">
                                  💳 Avulso
                                </span>
                              )}
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 flex items-center mt-1 truncate">
                              <Sparkles className="w-3 h-3 mr-1 text-pink-500 flex-shrink-0" />
                              <span className="truncate">{appointment.service}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status e Ações */}
                      <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-3 flex-shrink-0">
                        {appointment.status === 'completed' ? (
                          <span className="flex items-center px-2.5 sm:px-3 py-1.5 sm:py-2 bg-green-100 text-green-700 rounded-lg text-xs font-semibold shadow-sm">
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Concluído
                          </span>
                        ) : (
                          <>
                            {/* Badge de Status - apenas desktop */}
                            <span className={`hidden sm:flex items-center px-3 py-2 rounded-lg text-xs font-semibold shadow-sm ${
                              appointment.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              <AlertCircle className="w-4 h-4 mr-1.5" />
                              {appointment.status === 'pending' ? 'Pendente' : 'Confirmado'}
                            </span>
                            
                            {/* Botões de Ação */}
                            <div className="flex gap-2">
                              {isAdminPending ? (
                                <button
                                  onClick={() => handleCompletePaid(appointment)}
                                  disabled={loadingAction}
                                  className="px-3 py-2.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                  title="Marcar como Pago e Concluído"
                                >
                                  {loadingAction ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                                  ) : (
                                    <Banknote className="w-5 h-5" />
                                  )}
                                  <span className="text-xs font-semibold">Pago</span>
                                </button>
                              ) : (
                              <button
                                onClick={() => handleComplete(appointment)}
                                disabled={loadingAction}
                                  className="px-3 py-2.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                  title="Finalizar consulta"
                              >
                                {loadingAction ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                                ) : (
                                  <Check className="w-5 h-5" />
                                )}
                                <span className="text-xs font-semibold hidden sm:inline">Concluir</span>
                              </button>
                            )}
                            <button
                                onClick={() => handleOpenReagendarCancelar(appointment)}
                                disabled={loadingAction}
                                className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reagendar ou Cancelar"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>

              {/* Atividades Recentes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Atividades Recentes</h2>
                  <button
                    onClick={() => router.push('/admin/atividades')}
                    className="text-pink-600 text-sm font-medium hover:text-pink-700"
                  >
                    Ver todas →
                  </button>
                </div>

                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      onClick={() => router.push('/admin/atividades')}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.icon)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{activity.description}</div>
                          <div className="text-xs text-gray-500">{activity.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar (1/3) */}
            <div className="space-y-6">
              {/* Ações Rápidas */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/admin/servicos')}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <Sparkles className="w-5 h-5 text-pink-600 mr-3" />
                      <span className="text-gray-700 font-medium">Gerenciar Serviços</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                  
                  <button
                    onClick={() => setShowVoucherModal(true)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <Gift className="w-5 h-5 text-purple-600 mr-3" />
                      <span className="text-gray-700 font-medium">Criar Voucher</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                  
                  <button
                    onClick={() => setShowHorariosModal(true)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-600 mr-3" />
                      <span className="text-gray-700 font-medium">Gerenciar Horários</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </button>
                </div>
              </div>

              {/* Aniversariantes do Mês */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Cake className="w-5 h-5 text-pink-600 mr-2" />
                    Aniversariantes
                  </h3>
                  <button
                    onClick={() => setShowBirthdaysModal(true)}
                    className="text-pink-600 text-sm font-medium hover:text-pink-700"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="space-y-3">
                  {upcomingBirthdays.slice(0, 3).map((birthday) => (
                    <div
                      key={birthday.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{birthday.name}</div>
                        <div className="text-xs text-gray-500">{birthday.age} anos</div>
                      </div>
                      <div className="text-pink-600 font-bold text-sm">{birthday.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Cards - Abaixo dos Agendamentos */}
            <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Clientes */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Users className="w-6 h-6" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-white/60" />
                </div>
                <div className="text-3xl font-bold mb-1">{stats.totalClients}</div>
                <div className="text-blue-100 text-sm font-medium">Total de Clientes</div>
              </div>

              {/* Agendamentos Hoje */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <Clock className="w-5 h-5 text-white/60" />
                </div>
                <div className="text-3xl font-bold mb-1">{stats.todayAppointments}</div>
                <div className="text-green-100 text-sm font-medium">Agendamentos Hoje</div>
              </div>

              {/* Receita do Mês */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <Sparkles className="w-5 h-5 text-white/60" />
                </div>
                <div className="text-3xl font-bold mb-1">
                  R$ {(stats.monthRevenue / 1000).toFixed(1)}k
                </div>
                <div className="text-purple-100 text-sm font-medium">Receita do Mês</div>
              </div>

              {/* Assinaturas Ativas */}
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <Bell className="w-5 h-5 text-white/60" />
                </div>
                <div className="text-3xl font-bold mb-1">{stats.activeSubscriptions}</div>
                <div className="text-pink-100 text-sm font-medium">Assinaturas Ativas</div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Modais */}
      <NovoAgendamentoModal 
        isOpen={showNovoAgendamentoModal}
        onClose={() => {
          setShowNovoAgendamentoModal(false)
          loadDashboardData() // Recarregar dados após criar agendamento
        }}
      />
      
      <AdicionarClienteModal 
        isOpen={showAdicionarClienteModal}
        onClose={() => {
          setShowAdicionarClienteModal(false)
          loadDashboardData() // Recarregar dados após adicionar cliente
        }}
      />
      
      <DarVoucherModal 
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
      />
      
      <DefinirHorariosModal 
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
          loadDashboardData() // Recarregar dados
          setShowReagendarCancelarModal(false)
          setSelectedAppointment(null)
        }}
        agendamento={selectedAppointment ? {
          id: selectedAppointment.id,
          cliente: selectedAppointment.clientName,
          servico: selectedAppointment.service,
          data: new Date().toLocaleDateString('pt-BR'),
          hora: selectedAppointment.time
        } : undefined}
      />

      {/* Modal de Aniversariantes */}
      {showBirthdaysModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 pb-24 sm:pb-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Cake className="w-6 h-6 text-pink-600 mr-2" />
                Aniversariantes de Outubro
              </h3>
              <button
                onClick={() => setShowBirthdaysModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingBirthdays.map((birthday) => (
                <div
                  key={birthday.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border border-pink-200"
                >
                  <div>
                    <div className="font-medium text-gray-900">{birthday.name}</div>
                    <div className="text-sm text-gray-600">{birthday.age} anos</div>
                  </div>
                  <div className="text-pink-600 font-bold">{birthday.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
