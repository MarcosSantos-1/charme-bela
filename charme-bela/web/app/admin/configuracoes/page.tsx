'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Clock, Calendar, MapPin, Phone, Mail, Instagram, Save, DollarSign } from 'lucide-react'
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
  
  // Estados para os campos do formulário
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
    minCancellationHours: 24,
    cancellationPolicy: '',
    priceBronze: 200.00,
    priceSilver: 300.00,
    priceGold: 450.00
  })

  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    setLoading(true)
    try {
      const [schedulesData, configData] = await Promise.all([
        api.getManagerSchedule(),
        api.getConfig()
      ])
      
      setSchedules(schedulesData as ManagerSchedule[])
      
      if (configData && typeof configData === 'object') {
        const data: any = configData
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
          minCancellationHours: data.minCancellationHours || 24,
          cancellationPolicy: data.cancellationPolicy || 'Cancelamentos devem ser feitos com no mínimo 24 horas de antecedência. Cancelamentos fora deste prazo estarão sujeitos a cobrança.',
          priceBronze: data.priceBronze || 200.00,
          priceSilver: data.priceSilver || 300.00,
          priceGold: data.priceGold || 450.00
        })
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
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
    setSaving(true)
    try {
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
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }
  
  const handleChange = (field: keyof SystemConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }
  
  // Máscara de preço - formatação visual
  const formatPrice = (value: number | undefined): string => {
    if (!value) return '0,00'
    return value.toFixed(2).replace('.', ',')
  }
  
  // Parse de preço - converte string formatada para number
  const parsePrice = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
  }
  
  // Handler para inputs de preço
  const handlePriceChange = (field: 'priceBronze' | 'priceSilver' | 'priceGold', value: string) => {
    // Permite apenas números e vírgula
    const cleaned = value.replace(/[^\d,]/g, '')
    
    // Limita a 2 casas decimais
    const parts = cleaned.split(',')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    
    const numValue = parsePrice(cleaned)
    setConfig(prev => ({ ...prev, [field]: numValue }))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
        <p className="text-gray-600 mt-1">Gerencie as configurações do sistema</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      ) : (
        <>
          {/* Horários de Funcionamento */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Clock className="w-6 h-6 text-pink-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Horários de Funcionamento
                </h3>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsDefinirHorariosOpen(true)}
              >
                Editar Horários
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Phone className="w-6 h-6 text-pink-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Informações de Contato
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <MapPin className="w-6 h-6 text-pink-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Endereço
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Calendar className="w-6 h-6 text-pink-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Política de Cancelamento
              </h3>
            </div>

            <div className="space-y-4">
              <Input
                label="Tempo mínimo para cancelamento (horas)"
                type="number"
                value={config.minCancellationHours?.toString()}
                onChange={(e) => handleChange('minCancellationHours', parseInt(e.target.value) || 24)}
                placeholder="24"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Cancelamento
                </label>
                <textarea
                  rows={4}
                  value={config.cancellationPolicy}
                  onChange={(e) => handleChange('cancellationPolicy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Descrição da política de cancelamento..."
                />
              </div>
            </div>
          </div>

          {/* Preços dos Planos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <DollarSign className="w-6 h-6 text-pink-600 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Preços dos Planos
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Os valores alterados aqui serão refletidos em todo o sistema
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Plano Bronze */}
              <div className="border-2 border-amber-200 rounded-lg p-4 bg-gradient-to-br from-amber-50 to-white">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-amber-600 rounded-full mr-2"></div>
                  <h4 className="font-semibold text-gray-900">Plano Bronze</h4>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formatPrice(config.priceBronze)}
                    onChange={(e) => handlePriceChange('priceBronze', e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 font-medium text-lg"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  4 tratamentos/mês
                </p>
              </div>

              {/* Plano Prata */}
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <h4 className="font-semibold text-gray-900">Plano Prata</h4>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formatPrice(config.priceSilver)}
                    onChange={(e) => handlePriceChange('priceSilver', e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-gray-900 font-medium text-lg"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  4 tratamentos/mês + 2 limpezas
                </p>
              </div>

              {/* Plano Ouro */}
              <div className="border-2 border-yellow-400 rounded-lg p-4 bg-gradient-to-br from-yellow-50 to-white">
                <div className="flex items-center mb-3">
                  <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
                  <h4 className="font-semibold text-gray-900">Plano Ouro</h4>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 font-medium">
                    R$
                  </span>
                  <input
                    type="text"
                    value={formatPrice(config.priceGold)}
                    onChange={(e) => handlePriceChange('priceGold', e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 font-medium text-lg"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  6 tratamentos/mês + 2 limpezas
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Importante:</strong> Os preços alterados aqui serão aplicados automaticamente em todos os textos, modais e páginas do sistema. Isso inclui a página de planos, checkout e área do cliente.
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSave}
              isLoading={saving}
            >
              <Save className="w-5 h-5 mr-2" />
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
