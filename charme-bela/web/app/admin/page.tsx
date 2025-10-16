'use client'

import { useEffect, useState } from 'react'
import { Calendar, Users, DollarSign, TrendingUp, Clock, Sparkles, Bell, CheckCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { NovoAgendamentoModal } from '@/components/admin/NovoAgendamentoModal'
import { AdicionarClienteModal } from '@/components/admin/AdicionarClienteModal'
import { ReagendarCancelarModal } from '@/components/admin/ReagendarCancelarModal'
import { DefinirHorariosModal } from '@/components/admin/DefinirHorariosModal'
import { NovoServicoModal } from '@/components/admin/NovoServicoModal'

interface Stats {
  totalClients: number
  todayAppointments: number
  monthRevenue: number
  activeSubscriptions: number
}

interface TodayAppointment {
  id: string
  time: string
  clientName: string
  service: string
  status: 'pending' | 'confirmed' | 'completed'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalClients: 127,
    todayAppointments: 8,
    monthRevenue: 45600,
    activeSubscriptions: 42
  })

  // Estados dos modais
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false)
  const [isAdicionarClienteOpen, setIsAdicionarClienteOpen] = useState(false)
  const [isReagendarOpen, setIsReagendarOpen] = useState(false)
  const [isDefinirHorariosOpen, setIsDefinirHorariosOpen] = useState(false)
  const [isNovoServicoOpen, setIsNovoServicoOpen] = useState(false)

  const todayDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  // Agendamentos de hoje
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([
    { id: '1', time: '09:00', clientName: 'Maria Silva', service: 'Limpeza de Pele', status: 'completed' },
    { id: '2', time: '10:30', clientName: 'Ana Santos', service: 'Massagem Modeladora', status: 'completed' },
    { id: '3', time: '14:00', clientName: 'Julia Oliveira', service: 'Drenagem Linfática', status: 'confirmed' },
    { id: '4', time: '15:30', clientName: 'Carla Mendes', service: 'Peeling Químico', status: 'pending' },
    { id: '5', time: '17:00', clientName: 'Beatriz Costa', service: 'Radiofrequência', status: 'pending' },
  ])

  const handleConfirm = (id: string) => {
    setTodayAppointments(todayAppointments.map(apt =>
      apt.id === id ? { ...apt, status: 'confirmed' as const } : apt
    ))
  }

  const handleComplete = (id: string) => {
    setTodayAppointments(todayAppointments.map(apt =>
      apt.id === id ? { ...apt, status: 'completed' as const } : apt
    ))
  }

  const handleReschedule = (id: string) => {
    const appointment = todayAppointments.find(apt => apt.id === id)
    if (appointment) {
      // Converter para formato do modal
      setSelectedAppointment({
        id: appointment.id,
        cliente: appointment.clientName,
        servico: appointment.service,
        data: format(new Date(), 'dd/MM/yyyy'),
        hora: appointment.time
      })
      setIsReagendarOpen(true)
    }
  }

  const handleCancel = (id: string) => {
    const appointment = todayAppointments.find(apt => apt.id === id)
    if (appointment) {
      setSelectedAppointment({
        id: appointment.id,
        cliente: appointment.clientName,
        servico: appointment.service,
        data: format(new Date(), 'dd/MM/yyyy'),
        hora: appointment.time
      })
      setIsReagendarOpen(true)
    }
  }

  const [selectedAppointment, setSelectedAppointment] = useState<any>()

  const statsCards = [
    {
      title: 'Clientes Ativos',
      value: stats.totalClients,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Agendamentos Hoje',
      value: stats.todayAppointments,
      icon: Calendar,
      color: 'bg-green-500',
      change: '+3 novos',
      changeColor: 'text-green-600'
    },
    {
      title: 'Receita do Mês',
      value: `R$ ${stats.monthRevenue.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: 'bg-pink-500',
      change: '+18%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Assinaturas Ativas',
      value: stats.activeSubscriptions,
      icon: Sparkles,
      color: 'bg-purple-500',
      change: '+5 este mês',
      changeColor: 'text-green-600'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Date Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 capitalize">{todayDate}</h2>
            <p className="text-pink-100">Você tem {todayAppointments.filter(a => a.status !== 'completed').length} agendamentos pendentes hoje</p>
          </div>
          <Bell className="w-8 h-8 text-white/80" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agendamentos de Hoje */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-pink-600" />
              Agendamentos de Hoje
            </h2>
            <span className="text-sm text-gray-600">
              {todayAppointments.filter(a => a.status === 'completed').length} / {todayAppointments.length} concluídos
            </span>
          </div>

          <div className="space-y-3">
            {todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`rounded-xl border-2 transition-all overflow-hidden ${
                  appointment.status === 'completed'
                    ? 'bg-gray-50 border-gray-200'
                    : appointment.status === 'confirmed'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}
              >
                {/* Header do Card */}
                <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg ${
                      appointment.status === 'completed'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-pink-600 text-white'
                    }`}>
                      <span className="text-lg font-bold">
                        {appointment.time.split(':')[0]}
                      </span>
                      <span className="text-xs">
                        {appointment.time.split(':')[1]}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 text-base">
                        {appointment.clientName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {appointment.service}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    appointment.status === 'completed'
                      ? 'bg-gray-200 text-gray-700'
                      : appointment.status === 'confirmed'
                      ? 'bg-green-500 text-white'
                      : 'bg-yellow-400 text-gray-900'
                  }`}>
                    {appointment.status === 'completed' ? 'Concluído' : 
                     appointment.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                  </div>
                </div>

                {/* Ações - Mobile First */}
                {appointment.status !== 'completed' && (
                  <div className="p-3 bg-white">
                    {appointment.status === 'confirmed' ? (
                      <button
                        onClick={() => handleComplete(appointment.id)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Marcar como Concluído
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleConfirm(appointment.id)}
                          className="py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          <span className="hidden sm:inline">Confirmar</span>
                          <span className="sm:hidden">✓</span>
                        </button>
                        <button
                          onClick={() => handleReschedule(appointment.id)}
                          className="py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-5 h-5" />
                          <span className="hidden sm:inline">Reagendar</span>
                          <span className="sm:hidden">📅</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {todayAppointments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum agendamento para hoje 🎉
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ações Rápidas
            </h2>
            <div className="space-y-3">
              <button 
                onClick={() => setIsNovoAgendamentoOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Novo Agendamento
              </button>
              <button 
                onClick={() => setIsAdicionarClienteOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Users className="w-5 h-5 mr-2" />
                Adicionar Cliente
              </button>
              <button 
                onClick={() => setIsDefinirHorariosOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Clock className="w-5 h-5 mr-2" />
                Definir Horários
              </button>
              <button 
                onClick={() => setIsNovoServicoOpen(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Novo Serviço
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-pink-600" />
          Atividade Recente
        </h2>
        <div className="space-y-4">
          {[
            { action: 'Novo agendamento', detail: 'Maria Silva - Limpeza de Pele', time: '5 min atrás', type: 'success' },
            { action: 'Pagamento recebido', detail: 'R$ 120,00 - Ana Santos', time: '15 min atrás', type: 'success' },
            { action: 'Nova assinatura', detail: 'Julia Oliveira - Plano Plus Care', time: '1 hora atrás', type: 'success' },
            { action: 'Agendamento cancelado', detail: 'Carla Mendes - Drenagem', time: '2 horas atrás', type: 'warning' },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0"
            >
              <div className={`w-2 h-2 rounded-full mt-2 ${
                activity.type === 'success' ? 'bg-green-600' : 'bg-yellow-600'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.detail}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-pink-600" />
          Receita dos Últimos 7 Meses
        </h2>
        <div className="space-y-3">
          {[
            { month: 'Abr', value: 12500, percent: 62 },
            { month: 'Mai', value: 15800, percent: 79 },
            { month: 'Jun', value: 14200, percent: 71 },
            { month: 'Jul', value: 18900, percent: 94 },
            { month: 'Ago', value: 17600, percent: 88 },
            { month: 'Set', value: 20100, percent: 100 },
            { month: 'Out', value: 16800, percent: 84 },
          ].map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600 w-12">{item.month}</span>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg transition-all duration-500"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900 w-24 text-right">
                R$ {item.value.toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Média mensal:</span>
            <span className="text-lg font-bold text-pink-600">R$ 16.557</span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Moved to Bottom */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className={`text-xs md:text-sm font-medium ${stat.changeColor}`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-600 text-xs md:text-sm font-medium mb-1">
              {stat.title}
            </h3>
            <p className="text-xl md:text-2xl font-bold text-gray-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Modais */}
      <NovoAgendamentoModal 
        isOpen={isNovoAgendamentoOpen}
        onClose={() => setIsNovoAgendamentoOpen(false)}
      />
      
      <AdicionarClienteModal 
        isOpen={isAdicionarClienteOpen}
        onClose={() => setIsAdicionarClienteOpen(false)}
      />
      
      <ReagendarCancelarModal 
        isOpen={isReagendarOpen}
        onClose={() => setIsReagendarOpen(false)}
      />
      
      <DefinirHorariosModal 
        isOpen={isDefinirHorariosOpen}
        onClose={() => setIsDefinirHorariosOpen(false)}
      />
      
      <NovoServicoModal 
        isOpen={isNovoServicoOpen}
        onClose={() => setIsNovoServicoOpen(false)}
      />
    </div>
  )
}

