'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, DollarSign, UserCheck, Sparkles, Activity, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as api from '@/lib/api'
import { formatTimeAgo, formatFullDate } from '@/lib/timeUtils'

interface RecentActivity {
  id: string
  type: 'appointment' | 'payment' | 'client' | 'subscription'
  description: string
  time: string
  date: string
  icon: 'calendar' | 'dollar' | 'user' | 'star'
}

export default function AtividadesPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar atividades do backend
  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const notifications = await api.getNotifications({
        userId: 'admin',
        limit: 100 // Buscar mais notificações para o histórico completo
      })
      
      // Mapear notificações para formato de atividades
      const mappedActivities: RecentActivity[] = notifications.map(notif => {
        // Usar funções helper para tempo
        const timeAgo = formatTimeAgo(notif.createdAt)
        const formattedDate = formatFullDate(notif.createdAt)
        
        // Mapear tipo de notificação para tipo de atividade
        let activityType: 'appointment' | 'payment' | 'client' | 'subscription' = 'appointment'
        let icon: 'calendar' | 'dollar' | 'user' | 'star' = 'calendar'
        
        // Priorizar PAYMENT primeiro (antes de SUBSCRIPTION que também pode conter PAYMENT)
        if (notif.type.includes('PAYMENT')) {
          activityType = 'payment'
          icon = 'dollar'
        } else if (notif.type.includes('SUBSCRIPTION') || notif.type.includes('PLAN')) {
          activityType = 'subscription'
          icon = 'star'
        } else if (notif.type.includes('CLIENT') || notif.type.includes('REGISTERED') || notif.type === 'NEW_CLIENT_REGISTERED') {
          activityType = 'client'
          icon = 'user'
        } else if (notif.type.includes('APPOINTMENT') || notif.type.includes('CANCELED')) {
          activityType = 'appointment'
          icon = 'calendar'
        }
        
        return {
          id: notif.id,
          type: activityType,
          description: notif.message,
          time: timeAgo,
          date: formattedDate,
          icon
        }
      })
      
      console.log('📊 Atividades mapeadas:', mappedActivities.length)
      console.log('📊 Por tipo:', {
        payments: mappedActivities.filter(a => a.type === 'payment').length,
        appointments: mappedActivities.filter(a => a.type === 'appointment').length,
        clients: mappedActivities.filter(a => a.type === 'client').length,
        subscriptions: mappedActivities.filter(a => a.type === 'subscription').length
      })
      
      setActivities(mappedActivities)
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'calendar': return <Calendar className="w-5 h-5" />
      case 'dollar': return <DollarSign className="w-5 h-5" />
      case 'user': return <UserCheck className="w-5 h-5" />
      case 'star': return <Sparkles className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
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

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter)

  return (
    <ProtectedRoute requiredRole="MANAGER">
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Atividades Recentes</h1>
            <p className="text-gray-600">Histórico completo de atividades do sistema</p>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 mr-2">Filtrar por:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilter('appointment')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'appointment' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Agendamentos
              </button>
              <button
                onClick={() => setFilter('payment')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'payment' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pagamentos
              </button>
              <button
                onClick={() => setFilter('client')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'client' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Clientes
              </button>
              <button
                onClick={() => setFilter('subscription')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'subscription' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Assinaturas
              </button>
            </div>
          </div>

          {/* Lista de Atividades */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-3"></div>
                <p className="text-gray-500">Carregando atividades...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm sm:text-base">{activity.description}</div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">{activity.date}</div>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-0 ml-13 sm:ml-0 flex-shrink-0">{activity.time}</div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {filter === 'all' 
                    ? 'Nenhuma atividade encontrada' 
                    : `Nenhuma atividade de ${
                        filter === 'appointment' ? 'agendamentos' :
                        filter === 'payment' ? 'pagamentos' :
                        filter === 'client' ? 'clientes' :
                        'assinaturas'
                      } encontrada`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

