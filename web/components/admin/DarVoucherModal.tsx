'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import {
  RiGiftFill,
  RiUser3Fill,
  RiMoneyDollarCircleFill,
  RiCalendar2Fill,
  RiSearchLine,
  RiSparklingFill,
  RiCloseLine,
  RiCheckFill,
} from 'react-icons/ri'
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

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Motivos pré-definidos com opção "outro"
  const motivosPreset = [
    { value: 'aniversario', label: '🎂 Aniversário', message: '🎂 Parabéns pelo seu aniversário! Este voucher é um presente especial para você.' },
    { value: 'fidelidade', label: '💝 Fidelidade', message: '💝 Obrigada pela sua fidelidade! Este voucher é uma forma de agradecermos por ser uma cliente especial.' },
    { value: 'primeira_vez', label: '✨ Primeira Vez', message: '✨ Seja bem-vinda! Este voucher é um presente de boas-vindas para sua primeira experiência conosco.' },
    { value: 'indicacao', label: '🤝 Indicação', message: '🤝 Obrigada por nos indicar! Este voucher é um agradecimento especial.' },
    { value: 'desculpas', label: '🙏 Desculpas', message: '🙏 Pedimos desculpas pelo inconveniente. Este voucher é uma forma de compensar.' },
    { value: 'promocao', label: '🎁 Promoção', message: '🎁 Você ganhou! Este voucher faz parte de nossa promoção especial.' },
    { value: 'outro', label: '✍️ Outro (Personalizado)', message: '' },
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

  const handlePercentageInput = (value: string) => {
    const numbers = value.replace(/\D/g, '')
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
    setShowClientesList(false)
    setShowServicosList(false)
  }

  const isFormValid = Boolean(
    formData.clienteId &&
    (formData.tipo === 'DISCOUNT' ? (parseInt(formData.valor) > 0 && parseInt(formData.valor) <= 100) : true) &&
    (formData.tipo === 'FREE_TREATMENT' ? Boolean(formData.servicoId) : true) &&
    (formData.tipo === 'FREE_MONTH' ? Boolean(formData.planoId) : true) &&
    Boolean(formData.motivoPreset) &&
    Boolean(formData.motivoCustom.trim().length > 0)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.clienteId) {
      toast.error('Selecione um cliente')
      return
    }

    if (formData.tipo === 'DISCOUNT' && !formData.valor) {
      toast.error('Informe a porcentagem de desconto')
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

    if (!formData.motivoPreset) {
      toast.error('Selecione o motivo do voucher')
      return
    }

    if (!formData.motivoCustom.trim()) {
      toast.error('Informe a mensagem personalizada')
      return
    }

    setLoading(true)
    try {
      const voucherData: any = {
        userId: formData.clienteId,
        type: formData.tipo,
        description: formData.motivoCustom.trim(),
        expiresAt: formData.validade.toISOString(),
        grantedBy: 'admin',
        grantedReason: formData.motivoCustom.trim()
      }

      if (formData.tipo === 'DISCOUNT') {
        voucherData.discountPercent = parseInt(formData.valor)
        voucherData.anyService = true
      } else if (formData.tipo === 'FREE_TREATMENT') {
        voucherData.serviceId = formData.servicoId
        voucherData.anyService = false
      } else if (formData.tipo === 'FREE_MONTH') {
        voucherData.planId = formData.planoId
        voucherData.anyService = false
      }

      await api.createVoucher(voucherData)
      toast.success('Voucher concedido com sucesso! 🎁')
      
      if (onVoucherCreated) {
        onVoucherCreated()
      }
      
      onClose()
      resetForm()
    } catch (error: any) {
      console.error('Erro ao criar voucher:', error)
      toast.error(error.message || 'Erro ao criar voucher')
    } finally {
      setLoading(false)
    }
  }

  const getTipoLabel = () => {
    if (formData.tipo === 'DISCOUNT') return 'Desconto em %'
    if (formData.tipo === 'FREE_TREATMENT') return 'Tratamento Grátis'
    if (formData.tipo === 'FREE_MONTH') return 'Mês de Plano Grátis'
    return 'Voucher'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose(); resetForm(); }}
      title={`Dar Voucher: ${getTipoLabel()}`}
      size="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => { onClose(); resetForm(); }}
            className="flex-1 text-xs font-bold"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="dar-voucher-form"
            variant="primary"
            className="flex-1 text-xs font-bold shadow-xs"
            isLoading={loading}
            disabled={!isFormValid || loading}
          >
            <RiGiftFill className="w-4 h-4 mr-1.5" />
            Criar Voucher
          </Button>
        </div>
      }
    >
      <form id="dar-voucher-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente - Seleção / Busca */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            <RiUser3Fill className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
            Cliente *
          </label>

          {formData.clienteId ? (
            <div className="flex items-center justify-between p-3 bg-rose-50/70 border-2 border-rose-200 rounded-2xl">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {formData.clienteNome.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {formData.clienteNome}
                  </div>
                  {clienteDetails?.subscription?.status === 'ACTIVE' && (
                    <div className="text-[11px] font-bold text-violet-700">
                      ★ {clienteDetails.subscription.plan.name}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, clienteId: '', clienteNome: '' })
                  setClienteDetails(null)
                  setBuscaCliente('')
                }}
                className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors shrink-0"
                title="Trocar cliente"
              >
                <RiCloseLine className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="relative">
                <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={buscaCliente}
                  onChange={(e) => {
                    setBuscaCliente(e.target.value)
                    setShowClientesList(true)
                  }}
                  onFocus={() => setShowClientesList(true)}
                  placeholder="Buscar cliente por nome ou email..."
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white touch-manipulation"
                />
              </div>

              {showClientesList && (
                <div className="max-h-44 overflow-y-auto border-2 border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-lg">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, clienteId: cliente.id, clienteNome: cliente.name })
                          setBuscaCliente('')
                          setShowClientesList(false)
                        }}
                        className="w-full px-3.5 py-2.5 hover:bg-rose-50 transition-colors text-left flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">{cliente.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{cliente.email}</div>
                        </div>
                        {cliente.hasSubscription && (
                          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] rounded-md font-bold shrink-0">
                            Plano VIP
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs font-semibold text-slate-400 text-center">
                      Nenhum cliente encontrado
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tipo de Voucher */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            <RiGiftFill className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
            Tipo de Voucher *
          </label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
            className="w-full px-3.5 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-base sm:text-sm font-bold text-slate-900 bg-white touch-manipulation"
          >
            <option value="DISCOUNT">💰 Desconto em Porcentagem</option>
            <option value="FREE_TREATMENT">✨ Tratamento Grátis</option>
            <option value="FREE_MONTH">🎁 Mês de Plano Grátis</option>
          </select>
        </div>

        {/* Valor (para desconto) */}
        {formData.tipo === 'DISCOUNT' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <RiMoneyDollarCircleFill className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
              Desconto (%) *
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formData.valor}
                onChange={(e) => handlePercentageInput(e.target.value)}
                placeholder="Ex: 20"
                maxLength={3}
                className="w-full px-3.5 py-2.5 sm:py-3 pr-10 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-slate-900 placeholder:text-slate-400 text-base sm:text-sm font-bold bg-white touch-manipulation"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                %
              </span>
            </div>
            {formData.valor && (
              <div className="mt-1.5 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-xs font-bold text-emerald-800">
                  💰 Cliente receberá {formData.valor}% de desconto em qualquer serviço
                </p>
              </div>
            )}
          </div>
        )}

        {/* Serviço (para tratamento grátis) */}
        {formData.tipo === 'FREE_TREATMENT' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <RiSparklingFill className="w-3.5 h-3.5 inline mr-1 text-purple-600" />
              Serviço / Tratamento *
            </label>

            {formData.servicoId ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    🎁 {formData.servicoNome}
                  </div>
                  {(() => {
                    const serv = servicos.find(s => s.id === formData.servicoId)
                    return serv ? (
                      <div className="text-[11px] font-semibold text-emerald-700">
                        {serv.duration} min • Valor original: R$ {serv.price.toFixed(2)}
                      </div>
                    ) : null
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, servicoId: '', servicoNome: '' })}
                  className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors shrink-0"
                  title="Trocar serviço"
                >
                  <RiCloseLine className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={buscaServico}
                    onChange={(e) => {
                      setBuscaServico(e.target.value)
                      setShowServicosList(true)
                    }}
                    onFocus={() => setShowServicosList(true)}
                    placeholder="Buscar serviço..."
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white touch-manipulation"
                  />
                </div>

                {showServicosList && (
                  <div className="max-h-44 overflow-y-auto border-2 border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-lg">
                    {servicosFiltrados.length > 0 ? (
                      servicosFiltrados.map((servico) => (
                        <button
                          key={servico.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, servicoId: servico.id, servicoNome: servico.name })
                            setBuscaServico('')
                            setShowServicosList(false)
                          }}
                          className="w-full px-3.5 py-2.5 hover:bg-rose-50 transition-colors text-left flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">{servico.name}</div>
                            <div className="text-[11px] text-slate-500">{servico.duration} min</div>
                          </div>
                          <span className="text-xs font-extrabold text-rose-600 shrink-0">
                            R$ {servico.price.toFixed(2)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs font-semibold text-slate-400 text-center">
                        Nenhum serviço encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Plano (para mês grátis) */}
        {formData.tipo === 'FREE_MONTH' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <RiGiftFill className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
              Plano *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {planos.map(plano => (
                <button
                  key={plano.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, planoId: plano.id, planoNome: plano.name })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    formData.planoId === plano.id
                      ? 'border-rose-600 bg-rose-50 shadow-xs'
                      : 'border-slate-200 hover:border-rose-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-slate-900 text-xs">{plano.name}</span>
                    {formData.planoId === plano.id && (
                      <RiCheckFill className="w-4 h-4 text-rose-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{plano.maxTreatmentsPerMonth} sessões/mês</p>
                  <p className="text-xs font-extrabold text-rose-600 mt-0.5">R$ {plano.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Validade */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            <RiCalendar2Fill className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
            Validade do Voucher *
          </label>
          <DatePicker
            value={formData.validade}
            onChange={(date) => setFormData({ ...formData, validade: date || new Date() })}
            minDate={new Date()}
            placeholder="Selecione a data de validade"
          />
        </div>

        {/* Motivo Preset - Obrigatório sem (opcional) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            💝 Motivo do Voucher *
          </label>
          <select
            value={formData.motivoPreset}
            onChange={(e) => {
              const selectedValue = e.target.value
              const preset = motivosPreset.find(m => m.value === selectedValue)
              setFormData({
                ...formData,
                motivoPreset: selectedValue,
                motivoCustom: preset ? preset.message : ''
              })
              if (selectedValue) {
                setTimeout(() => {
                  textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  textareaRef.current?.focus()
                }, 100)
              }
            }}
            className="w-full px-3.5 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-base sm:text-sm font-semibold text-slate-900 bg-white touch-manipulation"
            required
          >
            <option value="">Selecione o motivo...</option>
            {motivosPreset.map(motivo => (
              <option key={motivo.value} value={motivo.value}>{motivo.label}</option>
            ))}
          </select>
        </div>

        {/* Mensagem Personalizada - Aparece após selecionar preset */}
        {formData.motivoPreset && (
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ✍️ Mensagem Personalizada (Enviada à cliente) *
            </label>
            <textarea
              ref={textareaRef}
              value={formData.motivoCustom}
              onChange={(e) => setFormData({ ...formData, motivoCustom: e.target.value })}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 300)
              }}
              placeholder="Digite a mensagem que a cliente receberá..."
              rows={3}
              className="w-full px-3.5 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 resize-none text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white touch-manipulation"
              required
            />
          </div>
        )}
      </form>
    </Modal>
  )
}

