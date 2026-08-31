'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useState, useEffect } from 'react'
import {
  RiArrowLeftLine,
  RiCalendar2Fill,
  RiMoneyDollarCircleFill,
  RiUser3Fill,
  RiSparklingFill,
  RiPulseFill,
  RiFilter3Fill,
  RiLoader4Line,
} from 'react-icons/ri'
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
        const timeAgo = formatTimeAgo(notif.createdAt)
        const formattedDate = formatFullDate(notif.createdAt)
        
        let activityType: 'appointment' | 'payment' | 'client' | 'subscription' = 'appointment'
        let icon: 'calendar' | 'dollar' | 'user' | 'star' = 'calendar'
        
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
      
      setActivities(mappedActivities)
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'calendar': return <RiCalendar2Fill className="w-5 h-5" />
      case 'dollar': return <RiMoneyDollarCircleFill className="w-5 h-5" />
      case 'user': return <RiUser3Fill className="w-5 h-5" />
      case 'star': return <RiSparklingFill className="w-5 h-5" />
      default: return <RiPulseFill className="w-5 h-5" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'appointment': return 'bg-sky-100 text-sky-700 border border-sky-200'
      case 'payment': return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      case 'client': return 'bg-violet-100 text-violet-700 border border-violet-200'
      case 'subscription': return 'bg-amber-100 text-amber-800 border border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter)

  return (
    <ProtectedRoute requiredRole="MANAGER">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <RiArrowLeftLine className="w-4 h-4 mr-1" />
            Voltar
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Atividades Recentes</h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">Histórico em tempo real de atendimentos, pagamentos e clientes</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-3 sm:p-4 shadow-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <RiFilter3Fill className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 mr-1">Filtrar por:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === 'all' 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('appointment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === 'appointment' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Agendamentos
            </button>
            <button
              onClick={() => setFilter('payment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === 'payment' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Pagamentos
            </button>
            <button
              onClick={() => setFilter('client')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === 'client' 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Clientes
            </button>
            <button
              onClick={() => setFilter('subscription')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === 'subscription' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Assinaturas
            </button>
          </div>
        </div>

        {/* Lista de Atividades */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 shadow-xs">
          {loading ? (
            <div className="text-center py-12">
              <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
              <p className="text-slate-500 text-xs font-bold">Carregando atividades...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 sm:p-4 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 gap-2"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{activity.description}</div>
                      <div className="text-[11px] font-semibold text-slate-400 mt-0.5">{activity.date}</div>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 sm:ml-0 self-end sm:self-auto shrink-0 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{activity.time}</div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredActivities.length === 0 && (
            <div className="text-center py-12">
              <RiPulseFill className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-500 text-xs font-bold">
                {filter === 'all' 
                  ? 'Nenhuma atividade encontrada' 
                  : `Nenhuma atividade deste filtro encontrada`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

