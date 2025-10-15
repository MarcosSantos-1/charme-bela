'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Filter, Sparkles, Clock, Calendar, X, Home, FileText } from 'lucide-react'
import { Button } from '@/components/Button'
import DatePicker from '@/components/DatePicker'
import { useConfirm } from '@/hooks/useConfirm'
import toast from 'react-hot-toast'

interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  category: string
  includedInPlan: boolean
  planLevel: 'essencial' | 'plus' | 'premium' | 'none'
}

// Dados mock dos serviços com base nos planos
const allServices: Service[] = [
  // FACIAIS - Essencial
  { id: '1', name: 'Limpeza de Pele', description: 'Limpeza profunda com extração e hidratação', duration: 60, price: 120, category: 'Facial', includedInPlan: true, planLevel: 'essencial' },
  { id: '2', name: 'Máscara de LED', description: 'Fototerapia para revitalização da pele', duration: 30, price: 80, category: 'Facial', includedInPlan: true, planLevel: 'essencial' },
  { id: '3', name: 'Peeling de Diamante', description: 'Esfoliação profunda com micropartículas', duration: 45, price: 100, category: 'Facial', includedInPlan: true, planLevel: 'essencial' },
  { id: '4', name: 'Peeling Ultrassônico', description: 'Limpeza profunda com ultrassom', duration: 45, price: 100, category: 'Facial', includedInPlan: true, planLevel: 'essencial' },
  { id: '5', name: 'Revitalização Facial', description: 'Tratamento completo anti-idade', duration: 60, price: 150, category: 'Facial', includedInPlan: true, planLevel: 'essencial' },
  
  // FACIAIS - Plus
  { id: '6', name: 'Radiofrequência Facial', description: 'Estímulo de colágeno e firmeza', duration: 50, price: 180, category: 'Facial', includedInPlan: true, planLevel: 'plus' },
  { id: '7', name: 'Jato de Plasma', description: 'Tecnologia avançada para rejuvenescimento', duration: 40, price: 200, category: 'Facial', includedInPlan: true, planLevel: 'plus' },
  { id: '8', name: 'Tratamento para Acne', description: 'Protocolo completo para pele acneica', duration: 60, price: 150, category: 'Facial', includedInPlan: true, planLevel: 'plus' },
  
  // FACIAIS - Premium
  { id: '9', name: 'Microagulhamento', description: 'Indução de colágeno (1x por mês)', duration: 60, price: 250, category: 'Facial', includedInPlan: true, planLevel: 'premium' },
  { id: '10', name: 'Peeling de Algas', description: 'Esfoliação natural profunda', duration: 50, price: 180, category: 'Facial', includedInPlan: true, planLevel: 'premium' },
  { id: '11', name: 'Peeling Químico', description: 'Renovação celular intensa (1x por mês)', duration: 45, price: 200, category: 'Facial', includedInPlan: true, planLevel: 'premium' },
  { id: '12', name: 'Skinbooster', description: 'Hidratação profunda da pele', duration: 30, price: 280, category: 'Facial', includedInPlan: true, planLevel: 'premium' },
  { id: '13', name: 'Tratamento para Melasma', description: 'Protocolo específico para manchas', duration: 60, price: 220, category: 'Facial', includedInPlan: true, planLevel: 'premium' },

  // CORPORAIS - Essencial
  { id: '14', name: 'Pump (Bumbum)', description: 'Levantamento e firmeza glútea', duration: 40, price: 100, category: 'Corporal', includedInPlan: true, planLevel: 'essencial' },
  { id: '15', name: 'Carboxiterapia', description: 'Estímulo circulatório com CO2', duration: 30, price: 120, category: 'Corporal', includedInPlan: true, planLevel: 'essencial' },
  { id: '16', name: 'Vacuoterapia', description: 'Drenagem com sucção', duration: 40, price: 90, category: 'Corporal', includedInPlan: true, planLevel: 'essencial' },
  { id: '17', name: 'Manta Térmica', description: 'Sudorese e detox corporal', duration: 45, price: 80, category: 'Corporal', includedInPlan: true, planLevel: 'essencial' },
  { id: '18', name: 'Vibrocel', description: 'Vibração para celulite', duration: 30, price: 70, category: 'Corporal', includedInPlan: true, planLevel: 'essencial' },

  // CORPORAIS - Plus
  { id: '19', name: 'Radiofrequência Corporal', description: 'Firmeza e redução de medidas', duration: 50, price: 200, category: 'Corporal', includedInPlan: true, planLevel: 'plus' },
  { id: '20', name: 'Heccus', description: 'Tecnologia de modelagem corporal', duration: 45, price: 180, category: 'Corporal', includedInPlan: true, planLevel: 'plus' },
  { id: '21', name: 'Seca Barriga', description: 'Redução de gordura abdominal', duration: 50, price: 150, category: 'Corporal', includedInPlan: true, planLevel: 'plus' },
  { id: '22', name: 'Tratamento para Celulite', description: 'Protocolo anti-celulite completo', duration: 60, price: 160, category: 'Corporal', includedInPlan: true, planLevel: 'plus' },
  { id: '23', name: 'Tratamento para Gordura Localizada', description: 'Redução de medidas localizada', duration: 50, price: 170, category: 'Corporal', includedInPlan: true, planLevel: 'plus' },

  // CORPORAIS - Premium
  { id: '24', name: 'Hidrolipoclasia', description: 'Redução de gordura injetável', duration: 60, price: 350, category: 'Corporal', includedInPlan: true, planLevel: 'premium' },
  { id: '25', name: 'Tratamento para Estria', description: 'Melhora de estrias', duration: 50, price: 200, category: 'Corporal', includedInPlan: true, planLevel: 'premium' },
  { id: '26', name: 'Enzima', description: 'Lipólise enzimática', duration: 45, price: 250, category: 'Corporal', includedInPlan: true, planLevel: 'premium' },
  { id: '27', name: 'Lipo sem Corte', description: 'Lipoaspiração não invasiva', duration: 60, price: 400, category: 'Corporal', includedInPlan: true, planLevel: 'premium' },

  // MASSAGENS - Essencial
  { id: '28', name: 'Drenagem Linfática', description: 'Drenagem manual para desintoxicação', duration: 60, price: 100, category: 'Massagem', includedInPlan: true, planLevel: 'essencial' },
  { id: '29', name: 'Massagem nos Pés', description: 'Relaxamento e reflexologia', duration: 30, price: 60, category: 'Massagem', includedInPlan: true, planLevel: 'essencial' },

  // MASSAGENS - Plus
  { id: '30', name: 'Massagem Modeladora', description: 'Modelagem corporal com massagem', duration: 60, price: 120, category: 'Massagem', includedInPlan: true, planLevel: 'plus' },
  { id: '31', name: 'Massagem Relaxante com Pedras Quentes', description: 'Relaxamento profundo', duration: 60, price: 150, category: 'Massagem', includedInPlan: true, planLevel: 'plus' },
  { id: '32', name: 'Massagem com Bambuterapia', description: 'Massagem oriental com bambu', duration: 60, price: 130, category: 'Massagem', includedInPlan: true, planLevel: 'plus' },
  { id: '33', name: 'Massagem com Ventosaterapia', description: 'Massagem com ventosas', duration: 50, price: 140, category: 'Massagem', includedInPlan: true, planLevel: 'plus' },

  // MASSAGENS - Premium
  { id: '34', name: 'Massagem Pós-Operatório', description: 'Drenagem pós-cirúrgica especializada', duration: 60, price: 150, category: 'Pós-Operatório', includedInPlan: true, planLevel: 'premium' },
  { id: '35', name: 'Mix de Massagens', description: 'Combinação de técnicas', duration: 90, price: 200, category: 'Massagem', includedInPlan: true, planLevel: 'premium' },

  // INJETÁVEIS - Avulso
  { id: '36', name: 'Aplicação de Botox', description: 'Toxina botulínica para rugas', duration: 20, price: 800, category: 'Injetável', includedInPlan: false, planLevel: 'none' },
  { id: '37', name: 'Preenchimento Labial', description: 'Ácido hialurônico nos lábios', duration: 30, price: 1200, category: 'Injetável', includedInPlan: false, planLevel: 'none' },
  { id: '38', name: 'Bioestimulador de Colágeno', description: 'Estímulo natural de colágeno', duration: 30, price: 1500, category: 'Injetável', includedInPlan: false, planLevel: 'none' },
  { id: '39', name: 'Harmonização Facial', description: 'Procedimento completo', duration: 60, price: 2500, category: 'Injetável', includedInPlan: false, planLevel: 'none' },
]

export default function ServicosPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const categoryParam = searchParams.get('category')
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filteredServices, setFilteredServices] = useState<Service[]>(allServices)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  
  // Mock: usuário tem plano Plus
  const [userPlan] = useState<'essencial' | 'plus' | 'premium'>('plus')

  const categories = ['Todos', 'Facial', 'Corporal', 'Massagem', 'Pós-Operatório', 'Injetável']

  // Set initial category from URL parameter
  useEffect(() => {
    if (categoryParam) {
      // Map category names
      const categoryMap: { [key: string]: string } = {
        'Tratamentos Faciais': 'Facial',
        'Tratamentos Corporais': 'Corporal',
        'Procedimentos Injetáveis': 'Injetável',
        'Pós-Operatório': 'Pós-Operatório'
      }
      
      const mappedCategory = categoryMap[categoryParam] || categoryParam
      if (categories.includes(mappedCategory)) {
        setSelectedCategory(mappedCategory)
      }
    }
  }, [categoryParam])

  const planLevelOrder: { [key: string]: number } = {
    'essencial': 1,
    'plus': 2,
    'premium': 3,
    'none': 4
  }

  useEffect(() => {
    let filtered = allServices

    // Filtrar por categoria
    if (selectedCategory !== 'Todos') {
      filtered = filtered.filter(s => s.category === selectedCategory)
    }

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredServices(filtered)
  }, [searchTerm, selectedCategory])

  const isIncludedInMyPlan = (service: Service) => {
    if (userPlan === 'essencial') {
      return service.planLevel === 'essencial'
    }
    if (userPlan === 'plus') {
      return service.planLevel === 'essencial' || service.planLevel === 'plus'
    }
    if (userPlan === 'premium') {
      return service.planLevel === 'essencial' || service.planLevel === 'plus' || service.planLevel === 'premium'
    }
    return false
  }

  const handleServiceClick = async (service: Service) => {
    // Mock: verificar se tem anamnese preenchida
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
      return
    }
    
    setSelectedService(service)
    setShowModal(true)
  }

  // Drag to scroll functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 2
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      {ConfirmDialogComponent}
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 z-30">
          <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200">
            <svg className="w-8 h-8 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div>
              <h2 className="font-bold text-gray-900">Charme & Bela</h2>
              <p className="text-xs text-gray-500">Área do Cliente</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => router.push('/cliente')}
              className="w-full flex items-center px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
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
              className="w-full flex items-center px-4 py-3 rounded-lg transition-colors bg-pink-50 text-pink-600"
            >
              <Sparkles className="w-5 h-5 mr-3" />
              Serviços
            </button>
            <button
              onClick={() => router.push('/cliente')}
              className="w-full flex items-center px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
            >
              <FileText className="w-5 h-5 mr-3" />
              Histórico
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:ml-64">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
            <div className="max-w-2xl mx-auto px-4 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 hover:bg-gray-100 rounded-full md:hidden"
                >
                  <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar tratamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-700"
                />
              </div>

              {/* Category Filters */}
              <div 
                ref={scrollContainerRef}
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide touch-pan-x select-none cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Services List */}
          <div className="max-w-2xl mx-auto px-4 py-4 pb-20">
            <div className="space-y-3">
              {filteredServices.map((service) => {
                const includedInPlan = isIncludedInMyPlan(service)
                
                return (
                  <button
                    key={service.id}
                    onClick={() => handleServiceClick(service)}
                    className="w-full bg-white rounded-xl p-4 border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{service.name}</h3>
                          {includedInPlan && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Seu Plano
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {service.duration} min
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>{service.category}</span>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        {includedInPlan ? (
                          <div className="text-purple-600 font-bold text-sm">Incluído</div>
                        ) : (
                          <div className="text-gray-900 font-bold">R$ {service.price}</div>
                        )}
                        <Button variant="outline" size="sm" className="mt-2">
                          Agendar
                        </Button>
                      </div>
                    </div>
                  </button>
                )
              })}

              {filteredServices.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum serviço encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Agendamento */}
        {showModal && selectedService && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Agendar Tratamento</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-900" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Service Info */}
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{selectedService.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{selectedService.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {selectedService.duration} minutos
                    </span>
                    <span className="flex items-center">
                      {isIncludedInMyPlan(selectedService) ? (
                        <span className="text-purple-600 font-semibold">Incluído no seu plano</span>
                      ) : (
                        <span className="font-semibold">R$ {selectedService.price}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escolha a data
                  </label>
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Selecione a data do tratamento"
                    minDate={new Date()}
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escolha o horário
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

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Alguma observação especial?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button variant="primary" className="w-full">
                    <Calendar className="w-5 h-5 mr-2" />
                    Confirmar Agendamento
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation - Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
          <div className="grid grid-cols-4 h-16">
            <button
              onClick={() => router.push('/cliente')}
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-gray-400 hover:text-gray-600"
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
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-pink-600"
            >
              <Sparkles className="w-6 h-6" />
              <span className="text-xs font-medium">Serviços</span>
            </button>

            <button
              onClick={() => router.push('/cliente')}
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-gray-400 hover:text-gray-600"
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs font-medium">Histórico</span>
            </button>
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  )
}

