'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Calendar, Clock, User, Sparkles, CheckCircle, Search, Loader, X } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'

interface NovoAgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NovoAgendamentoModal({ isOpen, onClose }: NovoAgendamentoModalProps) {
  const STEPS = ['cliente', 'servico', 'data', 'horario'] as const
  type Step = (typeof STEPS)[number]
  const [step, setStep] = useState<Step>('cliente')
  const [formData, setFormData] = useState({
    clienteId: '',
    clienteNome: '',
    servicoId: '',
    servicoNome: '',
    data: undefined as Date | undefined,
    hora: '',
    paymentType: 'PENDING' as 'SUBSCRIPTION' | 'SINGLE' | 'PENDING'
  })

  const [buscaCliente, setBuscaCliente] = useState('')
  const [showClientesList, setShowClientesList] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteDetails, setClienteDetails] = useState<any>(null)
  
  const [servicos, setServicos] = useState<api.Service[]>([])
  const [pacoteAtivo, setPacoteAtivo] = useState<api.PackagePurchase | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [appointmentMonthUsage, setAppointmentMonthUsage] = useState<number>(0)
  const [loadingMonthUsage, setLoadingMonthUsage] = useState(false)
  const [buscaServico, setBuscaServico] = useState('')
  const [pendingServico, setPendingServico] = useState<{ id: string; name: string } | null>(null)
  const [pendingDia, setPendingDia] = useState<string | null>(null)
  const [availableDays, setAvailableDays] = useState<string[]>([])
  const [loadingDays, setLoadingDays] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadClientes()
      loadServicos()
      setShowClientesList(true)
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.data && formData.servicoId) {
      loadAvailableSlots()
    }
  }, [formData.data, formData.servicoId])

  useEffect(() => {
    if (step !== 'data' || !formData.servicoId) return

    const selected = servicos.find((item) => item.id === formData.servicoId)
    const minDate = localDateKey(new Date())
    const maxDate = selected?.machineKind ? lastDayOfNextMonth() : addDaysYmd(minDate, 29)
    let cancelled = false

    setLoadingDays(true)
    void (async () => {
      try {
        const res = await api.getAvailableDays(minDate, maxDate, formData.servicoId)
        if (!cancelled) setAvailableDays((res.days || []).map((day) => day.date))
      } catch (error) {
        console.error('Erro ao carregar dias disponíveis:', error)
        if (!cancelled) {
          setAvailableDays([])
          toast.error('Erro ao carregar dias disponíveis')
        }
      } finally {
        if (!cancelled) setLoadingDays(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [step, formData.servicoId, servicos])

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

  useEffect(() => {
    async function loadPurchase() {
      if (!formData.clienteId || !formData.servicoId) {
        setPacoteAtivo(null)
        return
      }
      const selected = servicos.find((item) => item.id === formData.servicoId)
      if (selected?.category !== 'COMBO') {
        setPacoteAtivo(null)
        return
      }
      try {
        const purchases = await api.getPackagePurchases(formData.clienteId)
        const active = purchases.find(
          (item) =>
            item.packageServiceId === formData.servicoId &&
            item.paymentStatus === 'PAID' &&
            (item.status === 'ACTIVE' || item.remainingSessions > 0),
        )
        setPacoteAtivo(active || null)
      } catch {
        setPacoteAtivo(null)
      }
    }
    loadPurchase()
  }, [formData.clienteId, formData.servicoId, servicos])

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
      const dateStr = localDateKey(formData.data)
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
      const dateStr = localDateKey(formData.data)
      const startTime = new Date(`${dateStr}T${formData.hora}:00.000Z`)
      
      if (selectedService.category === 'COMBO') {
        if (pacoteAtivo && pacoteAtivo.remainingSessions > 0) {
          await api.schedulePackageSessions(pacoteAtivo.id, [startTime.toISOString()], {
            adminExtended: true,
          })
          toast.success(`Sessão ${pacoteAtivo.sessionsScheduled + 1}/${pacoteAtivo.sessionCount} agendada`)
        } else {
          await api.createPackagePurchase({
            userId: formData.clienteId,
            serviceId: formData.servicoId,
            slots: [startTime.toISOString()],
            paidAtClinic: true,
          })
          toast.success('Pacote vendido e primeira sessão agendada')
        }
        resetForm()
        onClose()
        return
      }
      
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
      paymentType: 'PENDING'
    })
    setBuscaCliente('')
    setBuscaServico('')
    setStep('cliente')
    setAvailableSlots([])
    setBookedSlots([])
    setAppointmentMonthUsage(0)
    setClienteDetails(null)
    setPendingServico(null)
    setPendingDia(null)
    setShowClientesList(false)
    setAvailableDays([])
  }

  const servicoSelecionado = servicos.find(s => s.id === formData.servicoId)
  const clienteSelecionado = clientes.find(c => c.id === formData.clienteId)
  const daysByMonth = useMemo(() => groupDaysByMonth(availableDays), [availableDays])
  const selectedDayKey = formData.data ? localDateKey(formData.data) : ''
  const isSearchingCliente = step === 'cliente' && showClientesList && !formData.clienteId
  const isExpanded = isSearchingCliente || step === 'servico' || step === 'data'

  const footer = step === 'cliente' ? (
    <Button
      type="button"
      variant="primary"
      className="w-full"
      onClick={() => formData.clienteId && setStep('servico')}
      disabled={!formData.clienteId}
    >
      Próximo: Escolher Serviço →
    </Button>
  ) : step === 'servico' ? (
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
        onClick={() => formData.servicoId && setStep('data')}
        disabled={!formData.servicoId}
      >
        Próximo: Escolher Data →
      </Button>
    </div>
  ) : step === 'data' ? (
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
        type="button"
        variant="primary"
        className="flex-1"
        onClick={() => formData.data && setStep('horario')}
        disabled={!formData.data}
      >
        Próximo: Escolher Horário →
      </Button>
    </div>
  ) : (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        className="flex-1"
        onClick={() => setStep('data')}
      >
        ← Voltar
      </Button>
      <Button
        type="submit"
        form="novo-agendamento-form"
        variant="primary"
        className="flex-1"
        disabled={!formData.data || !formData.hora}
      >
        <CheckCircle className="w-5 h-5 mr-2" />
        Confirmar
      </Button>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { resetForm(); onClose(); }} 
      title={
        step === 'cliente' ? 'Selecionar Cliente' :
        step === 'servico' ? 'Escolher Serviço' :
        step === 'data' ? 'Escolher Data' :
        'Escolher Horário'
      } 
      size="xl"
      expanded={isExpanded}
      footer={footer}
      contentClassName="flex flex-col !p-4 sm:!p-6"
    >
      <div className="relative flex flex-col flex-1 min-h-0 min-w-0 overflow-x-hidden">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        {[
          { id: 'cliente', label: 'Cliente', icon: User },
          { id: 'servico', label: 'Serviço', icon: Sparkles },
          { id: 'data', label: 'Data', icon: Calendar },
          { id: 'horario', label: 'Horário', icon: Clock }
        ].map((s, index) => (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 ${
              step === s.id ? 'bg-pink-600 text-white' :
              (index < STEPS.indexOf(step)) ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {index < 3 && (
              <div className={`flex-1 h-1 mx-1 sm:mx-2 ${
                index < STEPS.indexOf(step) ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      <form id="novo-agendamento-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 min-w-0 overflow-x-hidden">
        {/* STEP 1: Selecionar Cliente */}
        {step === 'cliente' && (
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <label className="block text-xs font-medium text-gray-700 mb-2 shrink-0">
              <Search className="w-3.5 h-3.5 inline mr-1" />
              Buscar Cliente *
            </label>
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="busca-cliente"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={buscaCliente || formData.clienteNome}
                onChange={(e) => {
                  setBuscaCliente(e.target.value)
                  setShowClientesList(true)
                  setFormData({ ...formData, clienteId: '', clienteNome: '' })
                }}
                onFocus={() => setShowClientesList(true)}
                placeholder="Digite nome ou telefone..."
                className="w-full max-w-full pl-9 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-base text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {isSearchingCliente && (
              <div className="flex-1 min-h-0 min-w-0 mt-3 border-2 border-pink-200 rounded-xl overflow-y-auto overflow-x-hidden">
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
                      className="w-full max-w-full px-3 py-2.5 hover:bg-pink-50 transition-colors text-left border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">{cliente.name}</div>
                          <div className="text-xs text-gray-500 truncate">{cliente.email}</div>
                          {cliente.phone && (
                            <div className="text-xs text-gray-400 truncate">{cliente.phone}</div>
                          )}
                        </div>
                        {cliente.hasSubscription && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium shrink-0">
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
            )}

            {formData.clienteId && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
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
        )}

        {/* STEP 2: Escolher Serviço */}
        {step === 'servico' && (
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            {clienteDetails?.subscription?.status === 'ACTIVE' && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded-lg mb-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-purple-900 truncate">
                      Cliente possui: {clienteDetails.subscription.plan.name}
                    </p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Serviços com ✨ estão inclusos no plano
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="relative shrink-0 mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="busca-servico"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={buscaServico}
                onChange={(e) => setBuscaServico(e.target.value)}
                placeholder="Buscar serviço por nome, descrição ou categoria..."
                className="w-full max-w-full pl-9 pr-10 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-base text-gray-900 placeholder:text-gray-400"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden content-start">
              {servicosFiltrados.map(servico => {
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
                    setPendingServico({ id: servico.id, name: servico.name })
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all min-w-0 ${
                    formData.servicoId === servico.id
                      ? 'border-pink-500 bg-pink-50 shadow-md'
                      : servicoNoPlano
                      ? 'border-purple-300 hover:border-purple-400 bg-purple-50/30'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{servico.name}</h3>
                        {servicoNoPlano && (
                          <span className="text-purple-600 text-sm shrink-0">✨</span>
                        )}
                      </div>
                      {servicoNoPlano && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full mt-1 inline-block">
                          Incluso no plano
                        </span>
                      )}
                    </div>
                    {formData.servicoId === servico.id && (
                      <CheckCircle className="w-5 h-5 text-pink-600 shrink-0" />
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
          </div>
        )}

        {/* STEP 3: Escolher Data */}
        {step === 'data' && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Escolha o melhor dia</p>
              {loadingDays ? (
                <div className="text-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-pink-600 mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">Buscando dias disponíveis...</p>
                </div>
              ) : daysByMonth.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Nenhum dia disponível</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {servicoSelecionado?.machineKind
                      ? 'Este tratamento só pode ser agendado no dia liberado da máquina.'
                      : 'Não há dias com horário nesta janela.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {servicoSelecionado?.machineKind && (
                    <p className="text-xs text-gray-600">
                      Este tratamento só pode ser agendado no dia liberado da máquina.
                    </p>
                  )}
                  {daysByMonth.map((group) => (
                    <div key={group.key}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-pink-500" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{group.title}</span>
                        <div className="flex-1 h-px bg-pink-100" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.days.map((day) => {
                          const selected = selectedDayKey === day
                          const isCurrentDay = day === localDateKey(new Date())
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  data: new Date(`${day}T12:00:00`),
                                  hora: '',
                                })
                                setPendingDia(day)
                              }}
                              className={`flex flex-col items-center justify-center w-[30%] min-w-[88px] flex-grow min-h-[72px] rounded-xl border-2 transition-all ${
                                selected
                                  ? 'bg-pink-500 border-pink-500 text-white'
                                  : 'bg-white border-gray-200 text-gray-900 hover:border-pink-300'
                              }`}
                            >
                              <span className={`text-lg font-extrabold leading-none ${isCurrentDay && !selected ? 'text-pink-600' : ''}`}>
                                {isCurrentDay ? 'Hoje' : dayNumber(day)}
                              </span>
                              <span className={`text-xs font-semibold mt-1 ${selected ? 'text-white' : 'text-gray-500'}`}>
                                {weekdayShort(day)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Escolher Horário */}
        {step === 'horario' && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-4">
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-xl p-4">
              <p className="text-sm text-gray-900">
                <strong>Cliente:</strong> {formData.clienteNome}
              </p>
              <p className="text-sm text-gray-900 mt-1">
                <strong>Serviço:</strong> {formData.servicoNome}
              </p>
              {formData.data && (
                <p className="text-sm text-gray-900 mt-1">
                  <strong>Data:</strong> {formData.data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
              )}
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horários disponíveis *
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

            {/* Tipo de Pagamento */}
            {formData.hora && formData.data && servicoSelecionado?.category === 'COMBO' && (
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                {pacoteAtivo && pacoteAtivo.remainingSessions > 0 ? (
                  <>Pacote ativo: {pacoteAtivo.sessionsScheduled}/{pacoteAtivo.sessionCount} sessões usadas. Esta data consome mais uma sessão, sem nova cobrança.</>
                ) : (
                  <>Venda do pacote na clínica: a cliente paga o valor total agora e esta fica como a 1ª sessão.</>
                )}
              </div>
            )}
            {formData.hora && formData.data && servicoSelecionado?.category !== 'COMBO' && (
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

          </div>
        )}
      </form>

      {pendingServico && (
        <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ir para escolher a data?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Serviço selecionado: <strong className="text-gray-900">{pendingServico.name}</strong>
            </p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => {
                  setPendingServico(null)
                  setStep('data')
                }}
              >
                Agora
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setPendingServico(null)}
              >
                Continuar olhando
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingDia && (
        <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ir para escolher o horário?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Data selecionada:{' '}
              <strong className="text-gray-900">
                {new Date(`${pendingDia}T12:00:00`).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                })}
              </strong>
            </p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => {
                  setPendingDia(null)
                  setStep('horario')
                }}
              >
                Agora
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setPendingDia(null)}
              >
                Continuar olhando
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Modal>
  )
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function addDaysYmd(ymd: string, days: number) {
  const dateValue = new Date(`${ymd}T12:00:00`)
  dateValue.setDate(dateValue.getDate() + days)
  return localDateKey(dateValue)
}

function lastDayOfNextMonth() {
  const now = new Date()
  return localDateKey(new Date(now.getFullYear(), now.getMonth() + 2, 0))
}

function dayNumber(ymd: string) {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit' })
}

function weekdayShort(ymd: string) {
  const weekday = new Date(`${ymd}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })
  return weekday.replace('.', '').replace(/^\w/, (letter) => letter.toUpperCase())
}

function monthTitle(ymd: string) {
  const month = new Date(`${ymd}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long' })
  return month.replace(/^\w/, (letter) => letter.toUpperCase())
}

function groupDaysByMonth(days: string[]) {
  const groups: Array<{ key: string; title: string; days: string[] }> = []
  for (const day of days) {
    const key = day.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.days.push(day)
    } else {
      groups.push({ key, title: monthTitle(day), days: [day] })
    }
  }
  return groups
}

