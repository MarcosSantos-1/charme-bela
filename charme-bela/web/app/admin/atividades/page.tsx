'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useState } from 'react'
import { ArrowLeft, Calendar, DollarSign, UserCheck, Sparkles, Activity, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

  // Mock data - será substituído por dados do backend
  const [activities, setActivities] = useState<RecentActivity[]>([
    { id: '1', type: 'appointment', description: 'Maria Silva agendou Limpeza de Pele', time: 'Há 5 min', date: '16/10/2025 14:35', icon: 'calendar' },
    { id: '2', type: 'payment', description: 'Pagamento recebido - R$ 249,90 (Ana Costa)', time: 'Há 12 min', date: '16/10/2025 14:28', icon: 'dollar' },
    { id: '3', type: 'client', description: 'Nova cliente cadastrada: Fernanda Lima', time: 'Há 1 hora', date: '16/10/2025 13:40', icon: 'user' },
    { id: '4', type: 'subscription', description: 'Ana Costa renovou plano Premium', time: 'Há 2 horas', date: '16/10/2025 12:40', icon: 'star' },
    { id: '5', type: 'appointment', description: 'Julia Oliveira cancelou agendamento', time: 'Há 3 horas', date: '16/10/2025 11:40', icon: 'calendar' },
    { id: '6', type: 'payment', description: 'Pagamento recebido - R$ 149,90 (Carla Mendes)', time: 'Há 4 horas', date: '16/10/2025 10:40', icon: 'dollar' },
    { id: '7', type: 'client', description: 'Cliente atualizado: Paula Costa', time: 'Há 5 horas', date: '16/10/2025 09:40', icon: 'user' },
    { id: '8', type: 'subscription', description: 'Fernanda Lima assinou plano Essencial', time: 'Há 6 horas', date: '16/10/2025 08:40', icon: 'star' },
  ])

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
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.icon)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{activity.description}</div>
                      <div className="text-sm text-gray-500 mt-1">{activity.date}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{activity.time}</div>
                </div>
              ))}
            </div>

            {filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma atividade encontrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

