'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Calendar, Clock, User, Sparkles, CheckCircle, Search, Loader, X } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import * as api from '@/lib/api'

interface NovoAgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NovoAgendamentoModal({ isOpen, onClose }: NovoAgendamentoModalProps) {
  const [step, setStep] = useState<'cliente' | 'servico' | 'horario'>('cliente')
  const [formData, setFormData] = useState({
    clienteId: '',
    clienteNome: '',
    servicoId: '',
    servicoNome: '',
    data: undefined as Date | undefined,
    hora: '',
    observacoes: '',
    paymentType: 'PENDING' as 'SUBSCRIPTION' | 'SINGLE' | 'PENDING'
  })

  const [buscaCliente, setBuscaCliente] = useState('')
  const [showClientesList, setShowClientesList] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteDetails, setClienteDetails] = useState<any>(null)
  
  const [servicos, setServicos] = useState<api.Service[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [appointmentMonthUsage, setAppointmentMonthUsage] = useState<number>(0)
  const [loadingMonthUsage, setLoadingMonthUsage] = useState(false)
  const [buscaServico, setBuscaServico] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadClientes()
      loadServicos()
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.data && formData.servicoId) {
      loadAvailableSlots()
    }
  }, [formData.data, formData.servicoId])

  // Calcular uso mensal quando data é selecionada
  useEffect(() => {
    if (formData.data && formData.clienteId && clienteDetails?.subscription?.status === 'ACTIVE') {
      calculateMonthUsage()
    }
  }, [formData.data, formData.clienteId, clienteDetails])

  useEffect(() => {
    if (formData.clienteId) {
      loadClienteDetails()
    }
  }, [formData.clienteId])

  const loadClientes = async () => {
    try {
      const users = await api.getUsers({ role: 'CLIENT', isActive: true })
      setClientes(users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        hasSubscription: user.subscription?.status === 'ACTIVE'
      })))
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      toast.error('Erro ao carregar clientes')
    }
  }

  const loadClienteDetails = async () => {
    try {
      const user = await api.getUser(formData.clienteId)
      console.log('👤 Detalhes do cliente carregados:', {
        name: user.name,
        hasSubscription: !!user.subscription,
        subscriptionStatus: user.subscription?.status,
        remaining: user.subscription?.remaining,
        limits: user.subscription?.limits
      })
      setClienteDetails(user)
    } catch (error) {
      console.error('Erro ao carregar detalhes do cliente:', error)
    }
  }

  const loadServicos = async () => {
    try {
      const response = await api.getServices()
      setServicos(response.filter(s => s.isActive))
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
      toast.error('Erro ao carregar serviços')
    }
  }

  const calculateMonthUsage = async () => {
    if (!formData.data || !formData.clienteId) return
    
    setLoadingMonthUsage(true)
    try {
      const appointmentDate = formData.data
      const month = appointmentDate.getMonth() + 1
      const year = appointmentDate.getFullYear()
      
      // Buscar agendamentos do cliente naquele mês específico
      const startOfMonth = new Date(year, month - 1, 1)
      const endOfMonth = new Date(year, month, 0, 23, 59, 59)
      
      console.log(`📅 Calculando uso para ${month}/${year}`)
      
      const appointments = await api.getAppointments({
        userId: formData.clienteId,
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString()
      })
      
      // Contar apenas agendamentos de ASSINATURA não cancelados
      const subscriptionAppointments = appointments.filter(apt => 
        apt.origin === 'SUBSCRIPTION' && 
        apt.status !== 'CANCELED' &&
        apt.status !== 'NO_SHOW'
      )
      
      console.log(`✅ Uso em ${month}/${year}: ${subscriptionAppointments.length} sessões`)
      setAppointmentMonthUsage(subscriptionAppointments.length)
    } catch (error) {
      console.error('Erro ao calcular uso mensal:', error)
      setAppointmentMonthUsage(0)
    } finally {
      setLoadingMonthUsage(false)
    }
  }

  const loadAvailableSlots = async () => {
    if (!formData.data || !formData.servicoId) return
    
    setLoadingSlots(true)
    try {
      const dateStr = formData.data.toISOString().split('T')[0]
      // Admin usa endpoint especial com horários fixos 6h-21h
      const result = await api.getAdminAvailableSlots(dateStr, formData.servicoId)
      
      let slots = result.slots || []
      
      // Se for hoje, filtrar horários que já passaram (igual na área do cliente)
      const now = new Date()
      const isToday = formData.data.toDateString() === now.toDateString()
      
      if (isToday) {
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTimeInMinutes = currentHour * 60 + currentMinute
        
        slots = slots.filter(slot => {
          const [hour, minute] = slot.split(':').map(Number)
          const slotTimeInMinutes = hour * 60 + minute
          // Filtrar horários que já passaram + 30min de antecedência mínima
          return slotTimeInMinutes > currentTimeInMinutes + 30
        })
      }
      
      setAvailableSlots(slots)
      setBookedSlots(result.bookedSlots || [])
      
      console.log('Horários disponíveis (após filtro):', slots)
      console.log('Horários ocupados:', result.bookedSlots)
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
      toast.error('Erro ao carregar horários disponíveis')
      setAvailableSlots([])
      setBookedSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.name.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.email.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    (c.phone && c.phone.includes(buscaCliente))
  )

  const servicosFiltrados = servicos.filter(s =>
    s.name.toLowerCase().includes(buscaServico.toLowerCase()) ||
    s.description.toLowerCase().includes(buscaServico.toLowerCase()) ||
    s.category.toLowerCase().includes(buscaServico.toLowerCase())
  )

  // Combinar todos os horários
  const getAllSlots = () => {
    const combined = [...availableSlots, ...bookedSlots]
    const unique = Array.from(new Set(combined))
    return unique.sort()
  }

  const isSlotBooked = (slot: string) => bookedSlots.includes(slot)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.clienteId || !formData.servicoId || !formData.data || !formData.hora) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoadingSlots(true)
    try {
      const selectedService = servicos.find(s => s.id === formData.servicoId)
      if (!selectedService) {
        toast.error('Serviço não encontrado')
        return
      }

      // Criar data e hora combinadas - IMPORTANTE: Força UTC para evitar problemas de timezone
      const dateStr = formData.data.toISOString().split('T')[0]
      const startTime = new Date(`${dateStr}T${formData.hora}:00.000Z`)
      
      console.log('🕐 Criando agendamento para:', {
        dateStr,
        hora: formData.hora,
        startTime: startTime.toISOString(),
        local: startTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      })

      // Determinar origem e dados de pagamento
      console.log('🔍 PaymentType selecionado:', formData.paymentType)
      
      const appointmentData: any = {
        userId: formData.clienteId,
        serviceId: formData.servicoId,
        startTime: startTime.toISOString(),
        origin: formData.paymentType === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 
                formData.paymentType === 'PENDING' ? 'ADMIN_CREATED' : 'SINGLE',
        notes: formData.observacoes || undefined
      }

      // Se for pagamento pendente, adicionar informações de pagamento
      if (formData.paymentType === 'PENDING') {
        console.log('✅ Adicionando paymentStatus PENDING ao appointmentData')
        appointmentData.paymentStatus = 'PENDING'
        appointmentData.paymentAmount = selectedService.price
      } else {
        console.log('⚠️ PaymentType NÃO é PENDING:', formData.paymentType)
      }

      console.log('📤 Enviando agendamento:', JSON.stringify(appointmentData, null, 2))
      const appointment = await api.createAppointment(appointmentData)
      console.log('📥 Resposta do servidor:', appointment)
      
    toast.success('Agendamento criado com sucesso!')
      resetForm()
    onClose()
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error)
      toast.error(error.message || 'Erro ao criar agendamento')
    } finally {
      setLoadingSlots(false)
    }
  }

  const resetForm = () => {
    setFormData({
      clienteId: '',
      clienteNome: '',
      servicoId: '',
      servicoNome: '',
      data: undefined,
      hora: '',
      observacoes: '',
      paymentType: 'PENDING'
    })
    setBuscaCliente('')
    setBuscaServico('')
    setStep('cliente')
    setAvailableSlots([])
    setBookedSlots([])
    setAppointmentMonthUsage(0)
    setClienteDetails(null)
  }

  const servicoSelecionado = servicos.find(s => s.id === formData.servicoId)
  const clienteSelecionado = clientes.find(c => c.id === formData.clienteId)

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { resetForm(); onClose(); }} 
      title={
        step === 'cliente' ? 'Selecionar Cliente' :
        step === 'servico' ? 'Escolher Serviço' :
        'Agendar Horário'
      } 
      size="xl"
    >
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6 px-4">
        {[
          { id: 'cliente', label: 'Cliente', icon: User },
          { id: 'servico', label: 'Serviço', icon: Sparkles },
          { id: 'horario', label: 'Horário', icon: Calendar }
        ].map((s, index) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step === s.id ? 'bg-pink-600 text-white' :
              (index < ['cliente', 'servico', 'horario'].indexOf(step)) ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              <s.icon className="w-5 h-5" />
            </div>
            {index < 2 && (
              <div className={`flex-1 h-1 mx-2 ${
                index < ['cliente', 'servico', 'horario'].indexOf(step) ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-4">
        {/* STEP 1: Selecionar Cliente */}
        {step === 'cliente' && (
          <div className="space-y-4">
        <div className="relative">
          <label className="block text-xs font-medium text-gray-700 mb-2">
                <Search className="w-3.5 h-3.5 inline mr-1" />
                Buscar Cliente *
          </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
                  value={buscaCliente || formData.clienteNome}
            onChange={(e) => {
              setBuscaCliente(e.target.value)
              setShowClientesList(true)
                    setFormData({ ...formData, clienteId: '', clienteNome: '' })
            }}
            onFocus={() => setShowClientesList(true)}
                  placeholder="Digite nome, email ou telefone..."
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {showClientesList && (buscaCliente || !formData.clienteId) && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowClientesList(false)} />
                  <div className="absolute z-20 w-full mt-2 bg-white border-2 border-pink-200 rounded-xl shadow-lg max-h-96 overflow-y-auto">
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map(cliente => (
                  <button
                    key={cliente.id}
                    type="button"
                          onClick={() => {
                            setFormData({ ...formData, clienteId: cliente.id, clienteNome: cliente.name })
                            setBuscaCliente('')
                            setShowClientesList(false)
                          }}
                    className="w-full px-3 py-2.5 hover:bg-pink-50 transition-colors text-left border-b border-gray-100 last:border-0"
                  >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate">{cliente.name}</div>
                              <div className="text-xs text-gray-500 truncate">{cliente.email}</div>
                              {cliente.phone && (
                                <div className="text-xs text-gray-400">{cliente.phone}</div>
                              )}
                            </div>
                            {cliente.hasSubscription && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium flex-shrink-0">
                                Plano
                              </span>
                            )}
                          </div>
                  </button>
                ))
              ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                  Nenhum cliente encontrado
                      </div>
                    )}
                  </div>
                </>
              )}

              {formData.clienteId && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-green-900 truncate">{formData.clienteNome}</div>
                      {clienteSelecionado?.hasSubscription && (
                        <div className="text-xs text-green-700 mt-0.5">
                          Cliente possui plano ativo - pode usar sessões do plano
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={() => formData.clienteId && setStep('servico')}
              disabled={!formData.clienteId}
            >
              Próximo: Escolher Serviço →
            </Button>
            </div>
          )}

        {/* STEP 2: Escolher Serviço */}
        {step === 'servico' && (
          <div className="space-y-4">
            {/* Info sobre o plano do cliente */}
            {clienteDetails?.subscription?.status === 'ACTIVE' && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs font-semibold text-purple-900">
                      Cliente possui: {clienteDetails.subscription.plan.name}
                    </p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Serviços com ✨ estão inclusos no plano
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Busca de serviços */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={buscaServico}
                onChange={(e) => setBuscaServico(e.target.value)}
                placeholder="Buscar serviço por nome, descrição ou categoria..."
                className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-sm text-gray-900 placeholder:text-gray-400"
              />
              {buscaServico && (
                <button
                  type="button"
                  onClick={() => setBuscaServico('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {servicosFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Nenhum serviço encontrado</p>
                <button
                  type="button"
                  onClick={() => setBuscaServico('')}
                  className="text-xs text-pink-600 hover:text-pink-700 mt-2"
                >
                  Limpar busca
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {servicosFiltrados.map(servico => {
                // Verificar se serviço está no plano do cliente
                const servicoNoPlano = clienteDetails?.subscription?.status === 'ACTIVE' &&
                  clienteDetails.subscription.plan.services.some(
                    (s: any) => s.id === servico.id
                  )
                
                return (
                <button
                  key={servico.id}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, servicoId: servico.id, servicoNome: servico.name })
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.servicoId === servico.id
                      ? 'border-pink-500 bg-pink-50 shadow-md'
                      : servicoNoPlano
                      ? 'border-purple-300 hover:border-purple-400 bg-purple-50/30'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{servico.name}</h3>
                        {servicoNoPlano && (
                          <span className="text-purple-600 text-sm">✨</span>
                        )}
                      </div>
                      {servicoNoPlano && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full mt-1 inline-block">
                          Incluso no plano
                        </span>
                      )}
                    </div>
                    {formData.servicoId === servico.id && (
                      <CheckCircle className="w-5 h-5 text-pink-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{servico.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{servico.duration} min</span>
                    <span className={`font-semibold ${servicoNoPlano ? 'text-purple-600' : 'text-pink-600'}`}>
                      {servicoNoPlano ? 'Plano' : `R$ ${servico.price.toFixed(2)}`}
                    </span>
                  </div>
                </button>
                )
              })}
            </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep('cliente')}
              >
                ← Voltar
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => formData.servicoId && setStep('horario')}
                disabled={!formData.servicoId}
              >
                Próximo: Escolher Horário →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Agendar Horário */}
        {step === 'horario' && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-3 text-base">Resumo do Agendamento</h3>
              <div className="text-sm space-y-2">
                <p className="text-gray-900"><strong className="font-semibold">Cliente:</strong> {formData.clienteNome}</p>
                {clienteDetails?.subscription?.status === 'ACTIVE' ? (
                  <div className="bg-purple-100 border border-purple-300 rounded-lg p-2 mt-1">
                    <p className="text-purple-900 font-semibold text-xs">
                      ✨ Cliente com Plano: {clienteDetails.subscription.plan.name}
                    </p>
                    {clienteDetails.subscription.remaining && (
                      <p className="text-purple-800 text-xs mt-0.5">
                        Sessões restantes: {clienteDetails.subscription.remaining.thisMonth}/{clienteDetails.subscription.limits.maxPerMonth} este mês
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs italic">Cliente sem plano ativo</p>
                )}
                <p className="text-gray-900"><strong className="font-semibold">Serviço:</strong> {formData.servicoNome}</p>
                {servicoSelecionado && (
                  <p className="text-gray-900"><strong className="font-semibold">Valor:</strong> R$ {servicoSelecionado.price.toFixed(2)}</p>
                )}
              </div>
            </div>

            {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Escolha a Data *
            </label>
              <div className="custom-datepicker-wrapper">
                <ReactDatePicker
                  selected={formData.data}
                  onChange={(date) => {
                    setFormData({ ...formData, data: date || undefined, hora: '' })
                  }}
                  minDate={new Date()} // Bloqueia datas passadas
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecione a data"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 font-medium bg-white hover:border-pink-400 transition-colors cursor-pointer"
                  calendarClassName="custom-calendar"
                  inline={false}
                  showPopperArrow={false}
                />
              </div>
              <style jsx global>{`
                .custom-datepicker-wrapper .react-datepicker-wrapper {
                  width: 100%;
                }
                .custom-datepicker-wrapper input {
                  width: 100%;
                }
                .react-datepicker {
                  border: 2px solid #e5e7eb;
                  border-radius: 12px;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                  font-family: inherit;
                }
                .react-datepicker__header {
                  background-color: #ec4899;
                  border-bottom: none;
                  border-radius: 10px 10px 0 0;
                  padding-top: 12px;
                }
                .react-datepicker__current-month,
                .react-datepicker__day-name {
                  color: white;
                  font-weight: 600;
                }
                .react-datepicker__day {
                  color: #374151;
                  font-weight: 500;
                  border-radius: 8px;
                  margin: 2px;
                }
                .react-datepicker__day:hover {
                  background-color: #fce7f3;
                  color: #ec4899;
                }
                .react-datepicker__day--selected {
                  background-color: #ec4899 !important;
                  color: white !important;
                  font-weight: 700;
                }
                .react-datepicker__day--keyboard-selected {
                  background-color: #fbcfe8;
                  color: #be185d;
                }
                .react-datepicker__day--disabled {
                  color: #d1d5db !important;
                  background-color: #f9fafb !important;
                  cursor: not-allowed !important;
                  pointer-events: none;
                }
                .react-datepicker__day--disabled:hover {
                  background-color: #f9fafb !important;
                  color: #d1d5db !important;
                }
                .react-datepicker__navigation-icon::before {
                  border-color: white;
                }
                .react-datepicker__navigation:hover *::before {
                  border-color: #fce7f3;
                }
              `}</style>
          </div>

            {/* Horários */}
            {formData.data && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⏰ Horários Disponíveis *
            </label>

                {loadingSlots ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Loader className="w-8 h-8 animate-spin text-pink-600 mx-auto" />
                    <p className="text-sm text-gray-600 mt-2">Buscando horários...</p>
                  </div>
                ) : getAllSlots().length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {getAllSlots().map((slot) => {
                        const isBooked = isSlotBooked(slot)
                        
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => !isBooked && setFormData({ ...formData, hora: slot })}
                            disabled={isBooked}
                            className={`px-4 py-3 rounded-lg font-medium transition-all ${
                              isBooked
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
                                : formData.hora === slot
                                ? 'bg-pink-600 text-white shadow-md'
                                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-pink-500'
                            }`}
                          >
                            {slot}
                            {isBooked && (
                              <span className="block text-xs mt-0.5">Ocupado</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    
                    {/* Legenda */}
                    <div className="flex items-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
                        <span className="text-gray-600">Disponível</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-pink-600 rounded"></div>
                        <span className="text-gray-600">Selecionado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded"></div>
                        <span className="text-gray-600">Ocupado</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <p className="text-gray-600">Nenhum horário disponível para esta data</p>
                  </div>
                )}
              </div>
            )}

            {/* Tipo de Pagamento */}
            {formData.hora && formData.data && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💳 Forma de Pagamento *
                </label>
                <div className="space-y-2">
                  {clienteDetails?.subscription?.status === 'ACTIVE' && (() => {
                    // Verificar se o serviço está no plano
                    const servicoNoPlano = servicoSelecionado && clienteDetails.subscription.plan.services.some(
                      (s: any) => s.id === servicoSelecionado.id
                    )
                    
                    if (!servicoNoPlano) {
                      return null // Não mostra opção de plano se serviço não está incluído
                    }
                    
                    // Calcular sessões restantes para o MÊS DO AGENDAMENTO
                    const maxPerMonth = clienteDetails.subscription.plan.maxTreatmentsPerMonth
                    const remainingForMonth = maxPerMonth - appointmentMonthUsage
                    const hasRemaining = remainingForMonth > 0
                    
                    const appointmentMonth = formData.data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                    const isCurrentMonth = formData.data.getMonth() === new Date().getMonth() && 
                                          formData.data.getFullYear() === new Date().getFullYear()
                    
                    console.log('🔍 Verificando sessões para', appointmentMonth, {
                      maxPerMonth,
                      usedInMonth: appointmentMonthUsage,
                      remaining: remainingForMonth,
                      hasRemaining,
                      isCurrentMonth
                    })
                    
                    return (
                    <button
                      type="button"
                      onClick={() => {
                        if (hasRemaining) {
                          setFormData({ ...formData, paymentType: 'SUBSCRIPTION' })
                        } else {
                          toast.error(`Cliente não tem sessões disponíveis em ${appointmentMonth}`)
                        }
                      }}
                      disabled={!hasRemaining || loadingMonthUsage}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        !hasRemaining || loadingMonthUsage
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : formData.paymentType === 'SUBSCRIPTION'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Usar Sessão do Plano</div>
                          <div className="text-sm text-gray-600">
                            {loadingMonthUsage ? (
                              <span className="text-gray-500">⏳ Calculando...</span>
                            ) : hasRemaining ? (
                              <>
                                Sessões restantes em <strong className="text-purple-700">{appointmentMonth}</strong>: <strong>{remainingForMonth}/{maxPerMonth}</strong>
                                {!isCurrentMonth && (
                                  <span className="block text-xs text-purple-600 mt-1">
                                    ℹ️ Contabilizado para {appointmentMonth}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-red-600 font-medium">❌ Sem sessões disponíveis em {appointmentMonth}</span>
                            )}
                          </div>
                        </div>
                        {formData.paymentType === 'SUBSCRIPTION' && (
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                    </button>
                    )
                  })()}
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'PENDING' })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      formData.paymentType === 'PENDING'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-200 hover:border-yellow-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">Pagamento Pendente</div>
                        <div className="text-sm text-gray-600">
                          Cliente pagará na clínica (R$ {servicoSelecionado?.price.toFixed(2)})
            </div>
                      </div>
                      {formData.paymentType === 'PENDING' && (
                        <CheckCircle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                  </button>
          </div>
        </div>
            )}

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Adicione observações sobre o agendamento..."
            rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 resize-none text-gray-900 placeholder:text-gray-400"
          />
        </div>

            <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
                onClick={() => setStep('servico')}
          >
                ← Voltar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
                disabled={!formData.data || !formData.hora}
          >
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirmar Agendamento
          </Button>
        </div>
          </div>
        )}
      </form>
    </Modal>
  )
}

