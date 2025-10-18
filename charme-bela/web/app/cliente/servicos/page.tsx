'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { BookingModal } from '@/components/BookingModal'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import * as api from '@/lib/api'
import { Service } from '@/types'
import toast from 'react-hot-toast'

export default function ServicosClientePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { subscription, hasSubscription, remainingTreatments } = useSubscription(user?.id)
  
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // Buscar serviços do backend
  useEffect(() => {
    async function loadServices() {
      try {
        const data = await api.getServices()
        setServices(data)
      } catch (error) {
        console.error('Erro ao carregar serviços:', error)
        toast.error('Erro ao carregar serviços')
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [])
  
  // Aplicar filtro da URL quando a página carregar
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    if (categoryParam && ['COMBO', 'FACIAL', 'CORPORAL', 'MASSAGEM'].includes(categoryParam)) {
      setSelectedCategory(categoryParam)
    }
  }, [searchParams])
  
  // Verificar se serviço está incluído no plano
  const isIncludedInPlan = (serviceId: string): boolean => {
    if (!hasSubscription || !subscription) return false
    return subscription.plan.services.some(s => s.id === serviceId)
  }
  
  // Categorias
  const categories = ['Todos', 'COMBO', 'FACIAL', 'CORPORAL', 'MASSAGEM']
  const categoryNames: Record<string, string> = {
    Todos: 'Todos',
    COMBO: '🎁 Combos',
    FACIAL: '💆 Faciais',
    CORPORAL: '🧘 Corporais',
    MASSAGEM: '💆‍♀️ Massagens'
  }
  
  // Filtrar e ordenar serviços (inclusos no plano primeiro)
  const filteredServices = services
    .filter(service => {
      const matchesCategory = selectedCategory === 'Todos' || service.category === selectedCategory
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           service.description.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
    .sort((a, b) => {
      const aIncluded = isIncludedInPlan(a.id)
      const bIncluded = isIncludedInPlan(b.id)
      
      // Se tem plano, priorizar serviços inclusos
      if (hasSubscription) {
        if (aIncluded && !bIncluded) return -1
        if (!aIncluded && bIncluded) return 1
      }
      
      return 0 // Manter ordem original para o resto
    })
  
  const handleServiceClick = (service: Service) => {
    setSelectedService(service)
    setShowModal(true)
  }
  
  const handleBookingSuccess = (type: 'SUBSCRIPTION' | 'SINGLE') => {
    if (type === 'SINGLE') {
      router.push('/cliente/checkout?mock=true')
    } else {
      router.push('/cliente/agenda')
    }
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Serviços">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar tratamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder:text-gray-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-pink-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  {categoryNames[category]}
                </button>
              ))}
            </div>
          </div>

          {/* Services List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
            </div>
          ) : filteredServices.length > 0 ? (
            <div className="space-y-3">
              {filteredServices.map((service) => {
                const includedInPlan = isIncludedInPlan(service.id)
                
                return (
                  <button
                    key={service.id}
                    onClick={() => handleServiceClick(service)}
                    className="w-full bg-white rounded-xl p-4 border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{service.name}</h3>
                          {includedInPlan && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              ✓ Incluso no plano
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={`px-2 py-1 rounded-full ${
                            service.category === 'FACIAL' ? 'bg-pink-100 text-pink-700' :
                            service.category === 'MASSAGEM' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {service.category}
                          </span>
                          <span className="text-gray-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {service.duration}min
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {includedInPlan ? (
                          <div className="text-sm font-bold text-green-600">Plano</div>
                        ) : (
                          <div className="text-lg font-bold text-pink-600">R$ {service.price.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600">Nenhum serviço encontrado</p>
            </div>
          )}
        </div>

        {/* Booking Modal */}
        <BookingModal
          service={selectedService}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          hasSubscription={hasSubscription}
          remainingTreatments={remainingTreatments || 0}
          isIncludedInPlan={selectedService ? isIncludedInPlan(selectedService.id) : false}
          userId={user?.id || ''}
          onSuccess={handleBookingSuccess}
        />
      </ClientLayout>
    </ProtectedRoute>
  )
}
