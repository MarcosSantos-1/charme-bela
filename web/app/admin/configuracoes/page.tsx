'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import {
  RiTimeFill,
  RiCalendar2Fill,
  RiMapPin2Fill,
  RiPhoneFill,
  RiMailFill,
  RiInstagramFill,
  RiSaveFill,
  RiMoneyDollarCircleFill,
  RiLoader4Line,
} from 'react-icons/ri'
import { DefinirHorariosModal } from '@/components/admin/DefinirHorariosModal'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'

interface SystemConfig {
  id: string
  phone?: string
  whatsapp?: string
  email?: string
  instagram?: string
  addressCep?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressNeighborhood?: string
  addressCity?: string
  addressState?: string
  minCancellationHours?: number
  cancellationPolicy?: string
  priceBronze?: number
  priceSilver?: number
  priceGold?: number
}

export default function ConfiguracoesPage() {
  const [saving, setSaving] = useState(false)
  const [isDefinirHorariosOpen, setIsDefinirHorariosOpen] = useState(false)
  
  interface ManagerSchedule {
    id: string
    dayOfWeek: number
    isAvailable: boolean
    availableSlots: Array<{ start: string; end: string }>
  }

  const [schedules, setSchedules] = useState<ManagerSchedule[]>([])
  const [loading, setLoading] = useState(true)
  
  const [config, setConfig] = useState<SystemConfig>({
    id: '',
    phone: '',
    whatsapp: '',
    email: '',
    instagram: '',
    addressCep: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressCity: '',
    addressState: '',
    minCancellationHours: 4,
    cancellationPolicy: '',
    priceBronze: 0,
    priceSilver: 0,
    priceGold: 0,
  })

  useEffect(() => {
    loadConfig()
    loadSchedules()
  }, [])
  
  const loadConfig = async () => {
    try {
      setLoading(true)
      const data = await api.getConfig()
      if (data) {
        setConfig({
          id: data.id || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          instagram: data.instagram || '',
          addressCep: data.addressCep || '',
          addressStreet: data.addressStreet || '',
          addressNumber: data.addressNumber || '',
          addressComplement: data.addressComplement || '',
          addressNeighborhood: data.addressNeighborhood || '',
          addressCity: data.addressCity || '',
          addressState: data.addressState || '',
          minCancellationHours: data.minCancellationHours ?? 4,
          cancellationPolicy: data.cancellationPolicy || '',
          priceBronze: data.priceBronze ?? 0,
          priceSilver: data.priceSilver ?? 0,
          priceGold: data.priceGold ?? 0,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const loadSchedules = async () => {
    try {
      const data = await api.getManagerSchedule() as ManagerSchedule[]
      setSchedules(data)
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.updateConfig({
        phone: config.phone,
        whatsapp: config.whatsapp,
        email: config.email,
        instagram: config.instagram,
        addressCep: config.addressCep,
        addressStreet: config.addressStreet,
        addressNumber: config.addressNumber,
        addressComplement: config.addressComplement,
        addressNeighborhood: config.addressNeighborhood,
        addressCity: config.addressCity,
        addressState: config.addressState,
        minCancellationHours: config.minCancellationHours,
        cancellationPolicy: config.cancellationPolicy,
        priceBronze: config.priceBronze,
        priceSilver: config.priceSilver,
        priceGold: config.priceGold
      })
      
      toast.success('Configurações salvas com sucesso!')
      loadConfig()
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error)
      toast.error(error.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }
  
  const handleChange = (field: keyof SystemConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }
  
  const formatPrice = (value: number | undefined): string => {
    if (!value) return '0,00'
    return value.toFixed(2).replace('.', ',')
  }
  
  const parsePrice = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
  }
  
  const handlePriceChange = (field: 'priceBronze' | 'priceSilver' | 'priceGold', value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '')
    const parts = cleaned.split(',')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    const numValue = parsePrice(cleaned)
    setConfig(prev => ({ ...prev, [field]: numValue }))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Configurações</h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">Gerencie os dados da clínica, horários, preços e políticas</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mr-3 border border-rose-200 shadow-xs">
                  <RiTimeFill className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Horários de Funcionamento
                </h3>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs font-bold"
                onClick={() => setIsDefinirHorariosOpen(true)}
              >
                Editar horários
              </Button>
            </div>

            <div className="space-y-4">
              {['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map((dayName, dayOfWeek) => {
                const schedule = schedules.find(s => s.dayOfWeek === dayOfWeek)
                
                return (
                  <div key={dayOfWeek} className="flex items-center space-x-4">
                    <div className="w-32 text-sm font-medium text-gray-700">
                      {dayName}
                    </div>
                    {!schedule || !schedule.isAvailable ? (
                      <span className="text-sm text-red-600 font-medium">Fechado</span>
                    ) : (
                      <>
                        {schedule.availableSlots && schedule.availableSlots.length > 0 ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {(schedule.availableSlots as Array<{ start: string; end: string }>).map((slot, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                {slot.start} - {slot.end}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Sem horários definidos</span>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Dica:</strong> Os horários definidos aqui serão usados automaticamente no sistema de agendamentos. 
                Se você configurar um intervalo de almoço, os clientes não poderão agendar nesse período.
              </p>
            </div>
          </div>

          {/* Informações de Contato */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mr-3 border border-rose-200 shadow-xs">
                <RiPhoneFill className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Informações de Contato
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <Input
                label="Telefone"
                type="tel"
                value={config.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
              <Input
                label="WhatsApp"
                type="tel"
                value={config.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                placeholder="(00) 00000-0000"
              />
              <Input
                label="Email"
                type="email"
                value={config.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="seu@email.com"
              />
              <Input
                label="Instagram"
                type="text"
                value={config.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="@usuario"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mr-3 border border-rose-200 shadow-xs">
                <RiMapPin2Fill className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Endereço da Clínica
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <Input
                  label="CEP"
                  type="text"
                  value={config.addressCep}
                  onChange={(e) => handleChange('addressCep', e.target.value)}
                  placeholder="00000-000"
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Rua"
                  type="text"
                  value={config.addressStreet}
                  onChange={(e) => handleChange('addressStreet', e.target.value)}
                  placeholder="Nome da rua"
                />
              </div>
              <Input
                label="Número"
                type="text"
                value={config.addressNumber}
                onChange={(e) => handleChange('addressNumber', e.target.value)}
                placeholder="Número"
              />
              <Input
                label="Complemento"
                type="text"
                value={config.addressComplement}
                onChange={(e) => handleChange('addressComplement', e.target.value)}
                placeholder="Apto, sala, etc"
              />
              <Input
                label="Bairro"
                type="text"
                value={config.addressNeighborhood}
                onChange={(e) => handleChange('addressNeighborhood', e.target.value)}
                placeholder="Bairro"
              />
              <Input
                label="Cidade"
                type="text"
                value={config.addressCity}
                onChange={(e) => handleChange('addressCity', e.target.value)}
                placeholder="Cidade"
              />
              <Input
                label="Estado"
                type="text"
                value={config.addressState}
                onChange={(e) => handleChange('addressState', e.target.value)}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>

          {/* Política de Cancelamento */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mr-3 border border-rose-200 shadow-xs">
                <RiCalendar2Fill className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Política de Cancelamento
              </h3>
            </div>

            <div className="space-y-4">
              <Input
                label="Tempo mínimo para cancelamento (horas)"
                type="number"
                value={config.minCancellationHours?.toString()}
                onChange={(e) => handleChange('minCancellationHours', parseInt(e.target.value) || 4)}
                placeholder="4"
              />
              <p className="text-xs font-semibold text-slate-500 -mt-2">
                Este número é o prazo mínimo. Com esse tempo ou mais (ex.: 5h se o prazo for 4h), a cliente do avulso escolhe reembolso ou crédito. Com menos (ex.: 3h59), não há dinheiro de volta — só crédito.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mensagem de Cancelamento
                </label>
                <textarea
                  rows={4}
                  value={config.cancellationPolicy}
                  onChange={(e) => handleChange('cancellationPolicy', e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
                  placeholder="Descrição da política de cancelamento..."
                />
              </div>
            </div>
          </div>

          {/* Preços dos Planos */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mr-3 border border-rose-200 shadow-xs">
                <RiMoneyDollarCircleFill className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Preços dos Planos
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Os valores alterados aqui serão refletidos em todo o sistema
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Plano Bronze */}
              <div className="border-2 border-amber-200 rounded-2xl p-4 bg-gradient-to-br from-amber-50/70 to-white shadow-xs">
                <div className="flex items-center mb-3">
                  <div className="w-2.5 h-2.5 bg-amber-600 rounded-full mr-2"></div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Plano Bronze</h4>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formatPrice(config.priceBronze)}
                    onChange={(e) => handlePriceChange('priceBronze', e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400 text-slate-900 font-extrabold text-base bg-white"
                  />
                </div>
                <p className="text-[11px] font-semibold text-slate-500 mt-2">
                  4 tratamentos/mês
                </p>
              </div>

              {/* Plano Prata */}
              <div className="border-2 border-slate-300 rounded-2xl p-4 bg-gradient-to-br from-slate-50/80 to-white shadow-xs">
                <div className="flex items-center mb-3">
                  <div className="w-2.5 h-2.5 bg-slate-500 rounded-full mr-2"></div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Plano Prata</h4>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formatPrice(config.priceSilver)}
                    onChange={(e) => handlePriceChange('priceSilver', e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-400 text-slate-900 font-extrabold text-base bg-white"
                  />
                </div>
                <p className="text-[11px] font-semibold text-slate-500 mt-2">
                  4 tratamentos/mês + 2 limpezas
                </p>
              </div>

              {/* Plano Ouro */}
              <div className="border-2 border-yellow-300 rounded-2xl p-4 bg-gradient-to-br from-yellow-50/70 to-white shadow-xs">
                <div className="flex items-center mb-3">
                  <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full mr-2"></div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Plano Ouro</h4>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formatPrice(config.priceGold)}
                    onChange={(e) => handlePriceChange('priceGold', e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-400 text-slate-900 font-extrabold text-base bg-white"
                  />
                </div>
                <p className="text-[11px] font-semibold text-slate-500 mt-2">
                  6 tratamentos/mês + 2 limpezas
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-sky-50 border border-sky-200 rounded-xl">
              <p className="text-xs font-semibold text-sky-900">
                💡 <strong>Importante:</strong> Os preços alterados aqui serão aplicados automaticamente em todos os textos, modais e páginas do sistema.
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pb-8 sm:pb-0">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              isLoading={saving}
              className="w-full sm:w-auto text-sm font-bold shadow-xs"
            >
              <RiSaveFill className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </>
      )}

      {/* Modais */}
      <DefinirHorariosModal 
        isOpen={isDefinirHorariosOpen}
        onClose={() => {
          setIsDefinirHorariosOpen(false)
          loadSchedules() // Recarregar após salvar
        }}
      />
    </div>
  )
}
