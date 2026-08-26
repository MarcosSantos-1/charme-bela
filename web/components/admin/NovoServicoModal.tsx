'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Scissors, DollarSign, Clock, Sparkles, Check, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'

interface NovoServicoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editingService?: api.Service | null
}

export function NovoServicoModal({ isOpen, onClose, onSuccess, editingService }: NovoServicoModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'FACIAL' as 'FACIAL' | 'CORPORAL' | 'MASSAGEM' | 'COMBO',
    preco: '',
    duracao: '60',
    descricao: '',
    planosIds: [] as string[],
    isSpecial: false,
    machineKind: '' as '' | 'LASER' | 'CRYO',
    allowOnSubscription: true,
    sessoes: '5',
    packageItemIds: [] as string[],
    installmentsAllowed: false,
  })

  const [planos, setPlanos] = useState<api.Plan[]>([])
  const [procedimentos, setProcedimentos] = useState<api.Service[]>([])
  const [loading, setLoading] = useState(false)
  const isPackage = formData.categoria === 'COMBO'

  // Categorias do banco de dados
  const categorias = [
    { value: 'FACIAL', label: '✨ Facial', color: 'bg-pink-100 text-pink-700' },
    { value: 'CORPORAL', label: '💪 Corporal', color: 'bg-blue-100 text-blue-700' },
    { value: 'MASSAGEM', label: '💆 Massagem', color: 'bg-purple-100 text-purple-700' },
    { value: 'COMBO', label: '🎁 Pacote', color: 'bg-orange-100 text-orange-700' }
  ]

  useEffect(() => {
    if (isOpen) {
      loadPlanos()
      loadProcedimentos()
      
      // Se está editando, preenche o form
      if (editingService) {
        setFormData({
          nome: editingService.name,
          categoria: editingService.category,
          preco: editingService.price.toString(),
          duracao: editingService.duration.toString(),
          descricao: editingService.description,
          planosIds: [], // Vai carregar dos planos
          isSpecial: Boolean(editingService.machineKind),
          machineKind: editingService.machineKind || '',
          allowOnSubscription: editingService.allowOnSubscription !== false,
          sessoes: String(editingService.packageSessionCount || 5),
          packageItemIds: (editingService.packageItems || [])
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => item.includedServiceId),
          installmentsAllowed: Boolean(editingService.installmentsAllowed),
        })
      } else {
        resetForm()
      }
    }
  }, [isOpen, editingService])

  const loadPlanos = async () => {
    try {
      const response = await api.getPlans()
      setPlanos(response.filter(p => p.isActive))
      
      // Se está editando, carregar quais planos têm este serviço
      if (editingService) {
        const planosComServico = response
          .filter(p => p.services.some(s => s.id === editingService.id))
          .map(p => p.id)
        
        setFormData(prev => ({ ...prev, planosIds: planosComServico }))
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
    }
  }

  const loadProcedimentos = async () => {
    try {
      const all = await api.getServices(true)
      setProcedimentos(all.filter((item) => item.category !== 'COMBO' && !item.machineKind && item.isActive))
    } catch (error) {
      console.error('Erro ao carregar procedimentos:', error)
    }
  }

  const togglePlano = (planoId: string) => {
    const planos = formData.planosIds
    if (planos.includes(planoId)) {
      setFormData({ ...formData, planosIds: planos.filter(p => p !== planoId) })
    } else {
      setFormData({ ...formData, planosIds: [...planos, planoId] })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.categoria || !formData.preco || (!isPackage && !formData.duracao)) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    if (isPackage && formData.packageItemIds.length === 0) {
      toast.error('Inclua pelo menos um procedimento no pacote')
      return
    }

    setLoading(true)
    try {
      const selectedItems = formData.packageItemIds.map((id, index) => {
        const proc = procedimentos.find((item) => item.id === id)
        return {
          includedServiceId: id,
          durationMinutes: proc?.duration || 30,
          sortOrder: index,
        }
      })
      const packageDuration = selectedItems.reduce((sum, item) => sum + item.durationMinutes, 0)

      const serviceData = {
        name: formData.nome,
        category: formData.categoria,
        price: parseFloat(formData.preco),
        duration: isPackage ? packageDuration || 30 : parseInt(formData.duracao),
        description: formData.descricao,
        machineKind: isPackage ? null : formData.isSpecial && formData.machineKind ? formData.machineKind : null,
        allowOnSubscription: isPackage ? false : formData.isSpecial ? formData.allowOnSubscription : true,
        packageSessionCount: isPackage ? parseInt(formData.sessoes, 10) : undefined,
        installmentsAllowed: isPackage ? formData.installmentsAllowed : false,
        packageItems: isPackage ? selectedItems : undefined,
      }

      if (formData.isSpecial && !formData.machineKind) {
        toast.error('Selecione Laser ou Crio para serviço especial')
        setLoading(false)
        return
      }

      const planIdsToLink = isPackage || (formData.isSpecial && !formData.allowOnSubscription) ? [] : formData.planosIds

      let createdService: api.Service

      if (editingService) {
        // Atualizar serviço existente
        console.log('📝 Atualizando serviço:', editingService.id, serviceData)
        createdService = await api.updateService(editingService.id, serviceData)
        console.log('✅ Serviço atualizado:', createdService)

        // Atualizar planos - remover de todos e adicionar aos selecionados
        const todosPlanos = await api.getPlans()
        
        // Remover de todos os planos primeiro
        for (const plano of todosPlanos) {
          const temServico = plano.services.some(s => s.id === editingService.id)
          if (temServico && !planIdsToLink.includes(plano.id)) {
            try {
              await api.removeServicesFromPlan(plano.id, [editingService.id])
              console.log(`🔗 Serviço removido do plano ${plano.name}`)
            } catch (error) {
              console.error(`Erro ao remover do plano ${plano.id}:`, error)
            }
          }
        }

        // Adicionar aos planos selecionados
        for (const planoId of planIdsToLink) {
          const plano = todosPlanos.find(p => p.id === planoId)
          const temServico = plano?.services.some(s => s.id === editingService.id)
          
          if (!temServico) {
            try {
              await api.addServicesToPlan(planoId, [editingService.id])
              console.log(`✅ Serviço adicionado ao plano ${planoId}`)
            } catch (error) {
              console.error(`Erro ao adicionar ao plano ${planoId}:`, error)
            }
          }
        }
      } else {
        // Criar novo serviço
        console.log('📤 Criando novo serviço:', serviceData)
        createdService = await api.createService(serviceData)
        console.log('✅ Serviço criado:', createdService)

        // Adicionar serviço aos planos selecionados
        if (planIdsToLink.length > 0) {
          console.log('🔗 Adicionando serviço aos planos:', planIdsToLink)
          
          for (const planoId of planIdsToLink) {
            try {
              await api.addServicesToPlan(planoId, [createdService.id])
              console.log(`✅ Serviço adicionado ao plano ${planoId}`)
            } catch (error) {
              console.error(`Erro ao adicionar ao plano ${planoId}:`, error)
            }
          }
        }
      }

      toast.success(editingService ? 'Atualizado com sucesso!' : isPackage ? 'Pacote criado com sucesso!' : 'Serviço criado com sucesso!')
      
      if (onSuccess) onSuccess()
      resetForm()
      onClose()
    } catch (error: any) {
      console.error('❌ Erro ao salvar serviço:', error)
      toast.error(error.message || 'Erro ao salvar serviço')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      categoria: 'FACIAL',
      preco: '',
      duracao: '60',
      descricao: '',
      planosIds: [],
      isSpecial: false,
      machineKind: '',
      allowOnSubscription: true,
      sessoes: '5',
      packageItemIds: [],
      installmentsAllowed: false,
    })
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { resetForm(); onClose(); }} 
      title={editingService ? (isPackage ? 'Editar Pacote' : 'Editar Serviço') : (isPackage ? 'Novo Pacote' : 'Adicionar Novo Serviço')} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Scissors className="w-4 h-4 inline mr-1" />
            Nome do {isPackage ? 'Pacote' : 'Serviço'} *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Limpeza de Pele Profunda"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 placeholder:text-gray-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categorias.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  categoria: cat.value as any,
                  isSpecial: cat.value === 'COMBO' ? false : formData.isSpecial,
                  machineKind: cat.value === 'COMBO' ? '' : formData.machineKind,
                })}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  formData.categoria === cat.value
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{cat.label}</span>
                  {formData.categoria === cat.value && (
                    <Check className="w-4 h-4 text-pink-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {isPackage ? (
          <div className="rounded-xl border-2 border-orange-200 bg-orange-50/60 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-gray-900">Composição do pacote</span>
            </div>
            <p className="text-xs text-gray-600">
              Cada sessão inclui todos os procedimentos abaixo, no mesmo agendamento. A duração é a soma.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sessões *</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.sessoes}
                  onChange={(e) => setFormData({ ...formData, sessoes: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-900"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.installmentsAllowed}
                    onChange={(e) => setFormData({ ...formData, installmentsAllowed: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  Parcelado (checkout futuro)
                </label>
              </div>
            </div>
            <div className="space-y-2">
              {procedimentos.map((proc) => {
                const selected = formData.packageItemIds.includes(proc.id)
                return (
                  <label
                    key={proc.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer ${
                      selected ? 'border-orange-500 bg-white' : 'border-gray-200 bg-white/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        setFormData({
                          ...formData,
                          packageItemIds: selected
                            ? formData.packageItemIds.filter((id) => id !== proc.id)
                            : [...formData.packageItemIds, proc.id],
                        })
                      }}
                      className="w-4 h-4 text-orange-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{proc.name}</div>
                      <div className="text-xs text-gray-500">{proc.duration} min · {proc.category}</div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-orange-600" />}
                  </label>
                )
              })}
            </div>
            {formData.packageItemIds.length > 0 && (
              <div className="text-sm text-orange-800 bg-white rounded-lg p-3">
                {String(formData.sessoes).padStart(2, '0')} sessões ·{' '}
                {formData.packageItemIds
                  .map((id) => procedimentos.find((item) => item.id === id))
                  .filter(Boolean)
                  .map((item) => item!.name)
                  .join(' + ')}
                {' · '}
                {formData.packageItemIds.reduce((sum, id) => {
                  const proc = procedimentos.find((item) => item.id === id)
                  return sum + (proc?.duration || 0)
                }, 0)}{' '}
                min por visita
              </div>
            )}
          </div>
        ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isSpecial}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  isSpecial: e.target.checked,
                  machineKind: e.target.checked ? formData.machineKind || 'LASER' : '',
                  allowOnSubscription: e.target.checked ? false : true,
                  categoria: e.target.checked ? 'CORPORAL' : formData.categoria,
                })
              }
              className="w-4 h-4 text-pink-600 rounded"
            />
            <span className="text-sm font-medium text-gray-900">
              Serviço especial (máquina alugada)
            </span>
          </label>
          {formData.isSpecial && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'LASER' as const, label: 'Laser', hint: 'Dia exclusivo' },
                  { value: 'CRYO' as const, label: 'Crio', hint: 'Dia compartilhado' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, machineKind: opt.value })}
                    className={`p-3 rounded-xl border-2 text-left ${
                      formData.machineKind === opt.value
                        ? opt.value === 'LASER'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-sky-500 bg-sky-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.hint}</div>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowOnSubscription}
                  onChange={(e) =>
                    setFormData({ ...formData, allowOnSubscription: e.target.checked })
                  }
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  Permitir inclusão em planos de assinatura
                </span>
              </label>
            </>
          )}
        </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Preço *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                R$
              </span>
              <input
                type="number"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                placeholder="150.00"
                min="0"
                step="0.01"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>
          </div>

          {!isPackage && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Duração (min) *
            </label>
            <select
              value={formData.duracao}
              onChange={(e) => setFormData({ ...formData, duracao: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900"
              required
            >
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos (1h)</option>
              <option value="90">90 minutos (1h30)</option>
              <option value="120">120 minutos (2h)</option>
              <option value="150">150 minutos (2h30)</option>
              <option value="180">180 minutos (3h)</option>
            </select>
          </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição *
          </label>
          <textarea
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Descreva o serviço..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 resize-none text-gray-900 placeholder:text-gray-400"
            required
          />
        </div>

        {/* Incluir em Planos */}
        {!isPackage && (!formData.isSpecial || formData.allowOnSubscription) && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-gray-900">
              Incluir em Planos de Assinatura
            </span>
          </div>

          {planos.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 mb-3">
                Selecione em quais planos este serviço estará disponível:
              </p>
              {planos.map(plano => (
                <label
                  key={plano.id}
                  className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.planosIds.includes(plano.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.planosIds.includes(plano.id)}
                    onChange={() => togglePlano(plano.id)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900">{plano.name}</div>
                    <div className="text-xs text-gray-500">
                      {plano.maxTreatmentsPerMonth} sessões/mês • R$ {plano.price.toFixed(2)}
                    </div>
                  </div>
                  {formData.planosIds.includes(plano.id) && (
                    <Check className="w-5 h-5 text-purple-600" />
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Nenhum plano disponível</p>
          )}
        </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => { resetForm(); onClose(); }} 
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Salvando...' : editingService ? 'Salvar Alterações' : isPackage ? 'Criar Pacote' : 'Criar Serviço'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

