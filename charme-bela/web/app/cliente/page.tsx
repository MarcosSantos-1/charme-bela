'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import NotificationsPanel from '@/components/NotificationsPanel'
import DatePicker from '@/components/DatePicker'
import { useConfirm } from '@/hooks/useConfirm'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { 
  Calendar, 
  User, 
  FileText, 
  CreditCard, 
  Home, 
  Clock, 
  Sparkles,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const [activeTab, setActiveTab] = useState<'home' | 'servicos' | 'historico'>('home')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(new Date())

  // Redirect to servicos page when servicos tab is clicked
  useEffect(() => {
    if (activeTab === 'servicos') {
      router.push('/cliente/servicos')
    }
  }, [activeTab, router])

  const procedureCategories = [
    {
      title: 'Tratamentos Faciais',
      icon: '💆‍♀️',
      count: 7,
      color: 'from-pink-100 to-pink-200',
      available: 'Incluído no seu plano'
    },
    {
      title: 'Tratamentos Corporais',
      icon: '👙',
      count: 8,
      color: 'from-purple-100 to-purple-200',
      available: 'Incluído no seu plano'
    },
    {
      title: 'Procedimentos Injetáveis',
      icon: '💉',
      count: 5,
      color: 'from-blue-100 to-blue-200',
      available: 'Avulso a partir de R$ 600'
    },
    {
      title: 'Pós-Operatório',
      icon: '🩺',
      count: 3,
      color: 'from-green-100 to-green-200',
      available: 'Incluído no seu plano'
    }
  ]

  const nextAppointments = [
    { date: '16 Out', time: '14:00', service: 'Drenagem Linfática', status: 'confirmed' },
    { date: '23 Out', time: '15:30', service: 'Massagem Modeladora', status: 'confirmed' }
  ]

  const handleSwitchAccount = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      {ConfirmDialogComponent}
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        {/* Top Bar - Mobile Style */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/images/logo.png"
                alt="Charme & Bela"
                width={32}
                height={32}
                className="object-contain"
              />
              <div>
                <h1 className="font-bold text-gray-900">Charme & Bela</h1>
                <p className="text-xs text-gray-500">Olá, {user?.name?.split(' ')[0]}! 👋</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <NotificationsPanel />

              {/* Profile Button */}
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="relative"
              >
                {user?.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-pink-200"
                  />
                ) : (
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center border-2 border-pink-200">
                    <User className="w-5 h-5 text-pink-600" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-4 top-16 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="font-medium text-gray-900">{user?.name}</div>
                <div className="text-sm text-gray-500">{user?.email}</div>
              </div>
              
              <Link href="/cliente/perfil" className="block px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
                <User className="w-4 h-4 inline mr-2" />
                Meu Perfil
              </Link>
              <Link href="/cliente/plano" className="block px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
                <Sparkles className="w-4 h-4 inline mr-2" />
                Gerenciar Plano
              </Link>
              <Link href="/cliente/pagamentos" className="block px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
                <CreditCard className="w-4 h-4 inline mr-2" />
                Pagamentos
              </Link>
              
              <div className="px-4 py-3 bg-green-50 border-l-4 border-green-500">
                <div className="text-xs text-green-600 font-medium">Status da Assinatura</div>
                <div className="text-sm font-bold text-green-700">Ativo ✓</div>
                <div className="text-xs text-green-600 mt-1">Próx. cobrança: 15/Nov</div>
              </div>
              
              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={handleSwitchAccount}
                  className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700"
                >
                  Trocar de conta
                </button>
                <button
                  onClick={async () => {
                    await signOut()
                    window.location.href = '/'
                  }}
                  className="block w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600"
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {/* Home Tab */}
          {activeTab === 'home' && (
            <div className="p-4 space-y-6">
              {/* My Plan Card */}
              <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <Sparkles className="w-8 h-8" />
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                    Ativo
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-1">Plus Care</h3>
                <p className="text-pink-100 text-sm mb-4">R$ 249,90 / mês</p>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-sm text-pink-100 mb-2">Sessões usadas este mês</div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: '50%' }} />
                    </div>
                    <div className="text-xl font-bold">2/4</div>
                  </div>
                </div>
              </div>

              {/* Categorias de Procedimentos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">Procedimentos</h2>
                  <Link href="/cliente/servicos" className="text-sm text-pink-600 font-medium">
                    Ver todos
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {procedureCategories.map((category, index) => (
                    <Link
                      key={index}
                      href={`/cliente/servicos?category=${encodeURIComponent(category.title)}`}
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all text-left block"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center text-2xl mb-3`}>
                        {category.icon}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {category.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">{category.count} opções</p>
                      <p className="text-xs text-pink-600 font-medium">{category.available}</p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Próximos Agendamentos */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">Próximos Agendamentos</h2>
                
                <div className="space-y-3">
                  {nextAppointments.map((appointment, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-pink-600">
                              {appointment.date.split(' ')[0]}
                            </div>
                            <div className="text-xs text-gray-600">
                              {appointment.date.split(' ')[1]}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {appointment.service}
                            </h4>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Clock className="w-4 h-4 mr-1" />
                              {appointment.time}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          setShowRescheduleModal(true)
                        }}
                      >
                        Reagendar
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="primary"
                  className="w-full mt-4"
                  onClick={async () => {
                    const hasAnamnese = localStorage.getItem('hasCompletedAnamnese')
                    if (!hasAnamnese) {
                      const confirmed = await confirm({
                        title: 'Ficha de Anamnese Necessária',
                        message: 'Para agendar tratamentos, você precisa preencher a ficha de anamnese. Deseja preencher agora?',
                        confirmText: 'Sim, preencher',
                        cancelText: 'Agora não',
                        type: 'info'
                      })
                      if (confirmed) {
                        router.push('/cliente/anamnese')
                      }
                    } else {
                      setShowNewAppointmentModal(true)
                    }
                  }}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Agendar Novo Tratamento
                </Button>
              </div>
            </div>
          )}

          {/* Histórico Tab */}
          {activeTab === 'historico' && (
            <div className="p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico de Tratamentos</h2>
              
              <div className="space-y-3">
                {[
                  { date: '10 Out 2025', time: '14:00', service: 'Limpeza de Pele', price: 'Plano', type: 'Facial' },
                  { date: '03 Out 2025', time: '15:30', service: 'Radiofrequência', price: 'Plano', type: 'Corporal' },
                  { date: '26 Set 2025', time: '10:00', service: 'Massagem Modeladora', price: 'Plano', type: 'Corporal' },
                  { date: '19 Set 2025', time: '14:00', service: 'Drenagem Linfática', price: 'Plano', type: 'Corporal' },
                  { date: '12 Set 2025', time: '16:00', service: 'Peeling Químico', price: 'R$ 180', type: 'Facial' },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.service}</h4>
                          <p className="text-xs text-gray-500">{item.type}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        item.price === 'Plano' 
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.price}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                      <Calendar className="w-3 h-3 mr-1" />
                      {item.date}
                      <Clock className="w-3 h-3 ml-3 mr-1" />
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Serviços Tab */}
          {activeTab === 'servicos' && (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
              <Sparkles className="w-16 h-16 text-pink-400 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Carregando serviços...</h2>
              <p className="text-gray-600 text-center px-8">
                Redirecionando para a página de serviços
              </p>
            </div>
          )}

          {/* Perfil Tab */}
          {activeTab === 'historico' && (
            <div className="p-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Meu Perfil</h2>
              <p className="text-gray-600">Informações do perfil...</p>
            </div>
          )}
        </div>

        {/* Bottom Navigation - Mobile Style */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
          <div className="grid grid-cols-4 h-16">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                activeTab === 'home'
                  ? 'text-pink-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs font-medium">Início</span>
            </button>

            <button
              onClick={() => router.push('/cliente/agenda')}
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-gray-400 hover:text-gray-600"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-xs font-medium">Agenda</span>
            </button>

            <button
              onClick={() => setActiveTab('servicos')}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                activeTab === 'servicos'
                  ? 'text-pink-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Sparkles className="w-6 h-6" />
              <span className="text-xs font-medium">Serviços</span>
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                activeTab === 'historico'
                  ? 'text-pink-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs font-medium">Histórico</span>
            </button>
          </div>
        </nav>

        {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200">
            <Image
              src="/images/logo.png"
              alt="Charme & Bela"
              width={40}
              height={40}
              className="object-contain"
            />
            <div>
              <h2 className="font-bold text-gray-900">Charme & Bela</h2>
              <p className="text-xs text-gray-500">Área do Cliente</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'home' ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5 mr-3" />
              Início
            </button>
            <button
              onClick={() => router.push('/cliente/agenda')}
              className="w-full flex items-center px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
            >
              <Calendar className="w-5 h-5 mr-3" />
              Agenda
            </button>
            <button
              onClick={() => setActiveTab('servicos')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'servicos' ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-5 h-5 mr-3" />
              Serviços
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'historico' ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5 mr-3" />
              Histórico
            </button>
          </div>
        </div>

        {/* Desktop Content Wrapper */}
        <div className="hidden md:block ml-64">
          {/* Conteúdo desktop aqui */}
        </div>

        {/* Modal de Novo Agendamento */}
        {showNewAppointmentModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Agendar Tratamento</h2>
                <button
                  onClick={() => setShowNewAppointmentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-900" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escolha a categoria
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {procedureCategories.map((category, index) => (
                      <Link
                        key={index}
                        href={`/cliente/servicos?category=${encodeURIComponent(category.title)}`}
                        className="p-4 border-2 border-gray-200 hover:border-pink-500 rounded-xl transition-all"
                        onClick={() => setShowNewAppointmentModal(false)}
                      >
                        <div className="text-3xl mb-2">{category.icon}</div>
                        <div className="font-medium text-gray-900 text-sm">{category.title}</div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Acesso Rápido</h3>
                  <div className="space-y-2">
                    <Link
                      href="/cliente/servicos"
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setShowNewAppointmentModal(false)}
                    >
                      <span className="text-gray-700">Ver todos os serviços</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => {
                        setShowNewAppointmentModal(false)
                        toast.success('Entre em contato pelo WhatsApp: (11) 91312-9669', {
                          duration: 5000,
                          icon: '📱'
                        })
                        window.open('https://wa.me/5511913129669', '_blank')
                      }}
                    >
                      <span className="text-gray-700">Falar com atendente</span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowNewAppointmentModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Reagendamento */}
        {showRescheduleModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Reagendar Consulta</h2>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-900" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Current Appointment Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Agendamento Atual</h3>
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">{selectedAppointment.service}</p>
                    <p className="text-sm text-gray-600">{selectedAppointment.date} às {selectedAppointment.time}</p>
                  </div>
                </div>

                {/* New Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova data
                  </label>
                  <DatePicker
                    value={rescheduleDate}
                    onChange={setRescheduleDate}
                    placeholder="Selecione a nova data"
                    minDate={new Date()}
                  />
                </div>

                {/* New Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Novo horário
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                      <button
                        key={time}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 text-sm font-medium text-gray-700 transition-colors"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo do reagendamento (opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Por que deseja reagendar?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      toast.success('Reagendamento confirmado! ✅', {
                        duration: 3000,
                        style: {
                          background: '#10b981',
                          color: '#fff',
                          fontWeight: '600',
                        }
                      })
                      setShowRescheduleModal(false)
                    }}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Confirmar Reagendamento
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowRescheduleModal(false)}
                  >
                    Cancelar
                  </Button>
                  <button
                    className="w-full text-red-600 hover:text-red-700 text-sm font-medium py-2"
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: 'Cancelar Consulta',
                        message: 'Tem certeza que deseja cancelar esta consulta?',
                        confirmText: 'Sim, cancelar',
                        cancelText: 'Não',
                        type: 'danger'
                      })
                      if (confirmed) {
                        toast.success('Consulta cancelada com sucesso!', {
                          duration: 3000,
                          icon: '✅'
                        })
                        setShowRescheduleModal(false)
                      }
                    }}
                  >
                    Cancelar Consulta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}
