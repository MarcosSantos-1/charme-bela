'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Gift, User, DollarSign, Calendar, Search, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker from '../DatePicker'
import * as api from '@/lib/api'

interface DarVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedClient?: { id: string, name: string } | null
  onVoucherCreated?: () => void
}

export function DarVoucherModal({ isOpen, onClose, preSelectedClient, onVoucherCreated }: DarVoucherModalProps) {
  const [formData, setFormData] = useState({
    clienteId: '',
    clienteNome: '',
    tipo: 'DISCOUNT' as 'FREE_TREATMENT' | 'FREE_MONTH' | 'DISCOUNT',
    valor: '',
    servicoId: '',
    servicoNome: '',
    planoId: '',
    planoNome: '',
    validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias default
    motivoPreset: '',
    motivoCustom: ''
  })

  const [clientes, setClientes] = useState<any[]>([])
  const [clienteDetails, setClienteDetails] = useState<any>(null)
  const [servicos, setServicos] = useState<api.Service[]>([])
  const [planos, setPlanos] = useState<api.Plan[]>([])
  const [showClientesList, setShowClientesList] = useState(false)
  const [showServicosList, setShowServicosList] = useState(false)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaServico, setBuscaServico] = useState('')
  const [loading, setLoading] = useState(false)

  // Motivos pré-definidos
  const motivosPreset = [
    { value: 'aniversario', label: 'Aniversário', message: '🎂 Parabéns pelo seu aniversário! Este voucher é um presente especial para você.' },
    { value: 'fidelidade', label: 'Fidelidade', message: '💝 Obrigada pela sua fidelidade! Este voucher é uma forma de agradecermos por ser uma cliente especial.' },
    { value: 'primeira_vez', label: 'Primeira Vez', message: '✨ Seja bem-vinda! Este voucher é um presente de boas-vindas para sua primeira experiência conosco.' },
    { value: 'indicacao', label: 'Indicação', message: '🤝 Obrigada por nos indicar! Este voucher é um agradecimento especial.' },
    { value: 'desculpas', label: 'Desculpas', message: '🙏 Pedimos desculpas pelo inconveniente. Este voucher é uma forma de compensar.' },
    { value: 'promocao', label: 'Promoção', message: '🎁 Você ganhou! Este voucher faz parte de nossa promoção especial.' },
  ]

  useEffect(() => {
    if (isOpen) {
      loadClientes()
      loadServicos()
      loadPlanos()
      
      // Preencher cliente pré-selecionado
      if (preSelectedClient) {
        setFormData(prev => ({
          ...prev,
          clienteId: preSelectedClient.id,
          clienteNome: preSelectedClient.name
        }))
        loadClienteDetails(preSelectedClient.id)
      }
    }
  }, [isOpen, preSelectedClient])

  useEffect(() => {
    if (formData.clienteId) {
      loadClienteDetails(formData.clienteId)
    }
  }, [formData.clienteId])

  const loadClientes = async () => {
    try {
      const users = await api.getUsers({ role: 'CLIENT', isActive: true })
      setClientes(users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        hasSubscription: user.subscription?.status === 'ACTIVE'
      })))
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      toast.error('Erro ao carregar clientes')
    }
  }

  const loadClienteDetails = async (userId: string) => {
    try {
      const user = await api.getUser(userId)
      console.log('👤 Detalhes do cliente carregados:', {
        name: user.name,
        hasSubscription: !!user.subscription,
        subscriptionStatus: user.subscription?.status,
        plan: user.subscription?.plan?.name
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

  const loadPlanos = async () => {
    try {
      const response = await api.getPlans()
      setPlanos(response.filter(p => p.isActive))
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      toast.error('Erro ao carregar planos')
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.name.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.email.toLowerCase().includes(buscaCliente.toLowerCase())
  )

  const servicosFiltrados = servicos.filter(s =>
    s.name.toLowerCase().includes(buscaServico.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.clienteId) {
      toast.error('Selecione um cliente')
      return
    }

    if (formData.tipo === 'DISCOUNT' && !formData.valor) {
      toast.error('Informe o valor do desconto')
      return
    }

    if (formData.tipo === 'FREE_TREATMENT' && !formData.servicoId) {
      toast.error('Selecione o serviço')
      return
    }

    if (formData.tipo === 'FREE_MONTH' && !formData.planoId) {
      toast.error('Selecione o plano')
      return
    }

    setLoading(true)
    try {
      const motivo = formData.motivoPreset 
        ? motivosPreset.find(m => m.value === formData.motivoPreset)?.message 
        : formData.motivoCustom

      // Preparar dados do voucher
      const voucherData: any = {
        userId: formData.clienteId,
        type: formData.tipo,
        description: motivo || 'Voucher especial',
        expiresAt: formData.validade.toISOString(),
        grantedBy: 'admin', // TODO: Pegar do usuário logado
        grantedReason: motivo || undefined
      }

      // Adicionar campos específicos por tipo
      if (formData.tipo === 'DISCOUNT') {
        voucherData.discountPercent = parseInt(formData.valor)
        voucherData.anyService = true // Desconto vale para qualquer serviço
      } else if (formData.tipo === 'FREE_TREATMENT') {
        voucherData.serviceId = formData.servicoId
        voucherData.anyService = false
      } else if (formData.tipo === 'FREE_MONTH') {
        voucherData.planId = formData.planoId
        voucherData.anyService = false
      }

      console.log('📤 Criando voucher:', voucherData)

      const voucher = await api.createVoucher(voucherData)
      
      console.log('✅ Voucher criado:', voucher)
      
      toast.success('Voucher criado com sucesso! 🎁')
      
      // Callback opcional (pode redirecionar para página de vouchers)
      if (onVoucherCreated) {
        onVoucherCreated()
      }
      
      /* 
      ═══════════════════════════════════════════════════════════
      TODO: NOTIFICAÇÃO PARA O CLIENTE
      ═══════════════════════════════════════════════════════════
      
      Quando implementar a notificação na página do cliente:
      
      1. Criar um componente NotificacaoVoucher que mostra:
         - Tipo do voucher (desconto, tratamento grátis, mês grátis)
         - Valor/descrição
         - Data de validade
         - Botão "Ver detalhes" ou "Usar agora"
      
      2. Se for tratamento grátis:
         - Redirecionar para /cliente/servicos?service={serviceId}
         - Abrir modal de agendamento automaticamente
         - Mostrar badge "GRÁTIS" no serviço
      
      3. Se for mês grátis:
         - Redirecionar para /cliente/plano
         - Mostrar modal de ativação do plano
         - Aplicar o voucher automaticamente
      
      4. Se for desconto:
         - Mostrar na lista de vouchers disponíveis
         - Aplicar automaticamente no checkout
         - Mostrar economia em tempo real
      
      Exemplo de notificação:
      
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8 text-pink-600" />
          <div className="flex-1">
            <h4 className="font-bold text-pink-900">
              🎁 Você ganhou um voucher!
            </h4>
            <p className="text-sm text-gray-700">
              {voucher.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 bg-pink-200 text-pink-800 rounded">
                Válido até {new Date(voucher.expiresAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          <Button onClick={() => handleUseVoucher(voucher)}>
            Usar agora →
          </Button>
        </div>
      </div>
      
      ═══════════════════════════════════════════════════════════
      */
      
      onClose()
      resetForm()
    } catch (error: any) {
      console.error('❌ Erro ao criar voucher:', error)
      toast.error(error.message || 'Erro ao criar voucher')
    } finally {
      setLoading(false)
    }
  }

  const handlePercentageInput = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Limita a 100
    let num = parseInt(numbers) || 0
    if (num > 100) num = 100
    
    setFormData({ ...formData, valor: num > 0 ? num.toString() : '' })
  }

  const resetForm = () => {
    setFormData({
      clienteId: '',
      clienteNome: '',
      tipo: 'DISCOUNT',
      valor: '',
      servicoId: '',
      servicoNome: '',
      planoId: '',
      planoNome: '',
      validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      motivoPreset: '',
      motivoCustom: ''
    })
    setBuscaCliente('')
    setBuscaServico('')
    setClienteDetails(null)
  }

  const getTipoLabel = () => {
    if (formData.tipo === 'DISCOUNT') return '💰 Desconto em %'
    if (formData.tipo === 'FREE_TREATMENT') return '✨ Tratamento Grátis'
    if (formData.tipo === 'FREE_MONTH') return '🎁 Mês de Plano Grátis'
    return 'Voucher'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dar Voucher: ${getTipoLabel()}`} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente - Dropdown com busca */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Cliente *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
              value={buscaCliente || formData.clienteNome}
              onChange={(e) => {
                setBuscaCliente(e.target.value)
                setShowClientesList(true)
                setFormData({ ...formData, clienteId: '', clienteNome: '' })
              }}
              onFocus={() => setShowClientesList(true)}
              placeholder="Digite para buscar cliente..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Lista de clientes */}
          {showClientesList && (buscaCliente || !formData.clienteId) && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowClientesList(false)} />
              <div className="absolute z-20 w-full mt-1 bg-white border-2 border-pink-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
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
                      className="w-full px-4 py-3 hover:bg-pink-50 transition-colors text-left border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900">{cliente.name}</div>
                          <div className="text-xs text-gray-500 truncate">{cliente.email}</div>
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
                  <div className="px-4 py-3 text-sm text-gray-500">Nenhum cliente encontrado</div>
                )}
              </div>
            </>
          )}

          {formData.clienteId && (
            <>
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <User className="w-4 h-4" />
                Cliente selecionado: <strong>{formData.clienteNome}</strong>
              </div>
              
              {/* Mostrar plano do cliente */}
              {clienteDetails?.subscription?.status === 'ACTIVE' ? (
                <div className="mt-2 p-3 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-xs font-semibold text-purple-900">
                        Cliente possui: {clienteDetails.subscription.plan.name}
                      </p>
                      <p className="text-xs text-purple-700 mt-0.5">
                        {clienteDetails.subscription.remaining?.thisMonth || 0}/{clienteDetails.subscription.limits?.maxPerMonth || 0} sessões este mês
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-3 bg-gray-50 border-l-4 border-gray-300 rounded-lg">
                  <p className="text-xs text-gray-600">
                    Cliente não possui plano ativo
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tipo de Voucher */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Gift className="w-4 h-4 inline mr-1" />
            Tipo de Voucher *
          </label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 font-medium"
          >
            <option value="DISCOUNT">💰 Desconto em Porcentagem</option>
            <option value="FREE_TREATMENT">✨ Tratamento Grátis</option>
            <option value="FREE_MONTH">🎁 Mês de Plano Grátis</option>
          </select>
        </div>

        {/* Valor (para desconto) */}
        {formData.tipo === 'DISCOUNT' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Desconto (%) *
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formData.valor}
                onChange={(e) => handlePercentageInput(e.target.value)}
                placeholder="20"
                maxLength={3}
                className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 placeholder:text-gray-400 text-lg font-semibold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-semibold">
                %
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Digite apenas números de 1 a 100</p>
            {formData.valor && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  💰 Cliente ganhará <strong>{formData.valor}% de desconto</strong> em qualquer serviço
                </p>
              </div>
            )}
          </div>
        )}

        {/* Serviço (para tratamento grátis) */}
        {formData.tipo === 'FREE_TREATMENT' && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Serviço / Tratamento *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
                value={buscaServico || formData.servicoNome}
                onChange={(e) => {
                  setBuscaServico(e.target.value)
                  setShowServicosList(true)
                  setFormData({ ...formData, servicoId: '', servicoNome: '' })
                }}
                onFocus={() => setShowServicosList(true)}
                placeholder="Digite para buscar serviço..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Lista de serviços */}
            {showServicosList && (buscaServico || !formData.servicoId) && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowServicosList(false)} />
                <div className="absolute z-20 w-full mt-1 bg-white border-2 border-pink-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {servicosFiltrados.length > 0 ? (
                    servicosFiltrados.map(servico => (
                      <button
                        key={servico.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, servicoId: servico.id, servicoNome: servico.name })
                          setBuscaServico('')
                          setShowServicosList(false)
                        }}
                        className="w-full px-4 py-3 hover:bg-pink-50 transition-colors text-left border-b border-gray-100 last:border-0"
                      >
                        <div className="font-semibold text-gray-900">{servico.name}</div>
                        <div className="text-sm text-gray-500">
                          {servico.duration} min • R$ {servico.price.toFixed(2)}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">Nenhum serviço encontrado</div>
                  )}
                </div>
              </>
            )}

            {formData.servicoId && (() => {
              const servico = servicos.find(s => s.id === formData.servicoId)
              return (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                    Serviço selecionado: <strong>{formData.servicoNome}</strong>
                  </div>
                  {servico && (
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-800">
                        🎁 Cliente ganhará <strong>{servico.name}</strong> grátis (valor: R$ {servico.price.toFixed(2)})
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Plano (para mês grátis) */}
        {formData.tipo === 'FREE_MONTH' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Gift className="w-4 h-4 inline mr-1" />
              Plano *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {planos.map(plano => (
                <button
                  key={plano.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, planoId: plano.id, planoNome: plano.name })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.planoId === plano.id
                      ? 'border-pink-500 bg-pink-50 shadow-md'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{plano.name}</h3>
                    {formData.planoId === plano.id && (
                      <div className="w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{plano.maxTreatmentsPerMonth} sessões/mês</p>
                  <p className="text-lg font-bold text-pink-600">R$ {plano.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
            {formData.planoId && (
              <div className="mt-2 p-2 bg-green-50 rounded-lg">
                <p className="text-xs text-green-800">
                  🎁 Cliente ganhará <strong>1 mês grátis do {formData.planoNome}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Validade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Validade
          </label>
          <DatePicker
            value={formData.validade}
            onChange={(date) => setFormData({ ...formData, validade: date || new Date() })}
            minDate={new Date()}
            placeholder="Selecione a data de validade"
          />
        </div>

        {/* Motivo Preset */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💝 Motivo (Preset)
          </label>
          <select
            value={formData.motivoPreset}
            onChange={(e) => {
              setFormData({ ...formData, motivoPreset: e.target.value })
              if (e.target.value) {
                const preset = motivosPreset.find(m => m.value === e.target.value)
                if (preset) {
                  setFormData(prev => ({ ...prev, motivoCustom: preset.message }))
                }
              }
            }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 font-medium"
          >
            <option value="">Selecione um motivo (opcional)</option>
            {motivosPreset.map(motivo => (
              <option key={motivo.value} value={motivo.value}>{motivo.label}</option>
            ))}
          </select>
        </div>

        {/* Motivo/Observação Custom */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem Personalizada
          </label>
          <textarea
            value={formData.motivoCustom}
            onChange={(e) => setFormData({ ...formData, motivoCustom: e.target.value, motivoPreset: '' })}
            placeholder="Escreva uma mensagem personalizada (opcional)"
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 resize-none text-gray-900 placeholder:text-gray-400"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1" isLoading={loading}>
            <Gift className="w-4 h-4 mr-2" />
            Criar Voucher
          </Button>
        </div>
      </form>
    </Modal>
  )
}

