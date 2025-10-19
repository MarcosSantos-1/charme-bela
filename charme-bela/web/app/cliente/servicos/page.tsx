'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { BookingModal } from '@/components/BookingModal'
import { VoucherBanner } from '@/components/VoucherBanner'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Clock, Gift, Tag } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import * as api from '@/lib/api'
import { Service } from '@/types'
import toast from 'react-hot-toast'

function ServicosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { subscription, hasSubscription, remainingTreatments } = useSubscription(user?.id)
  
  const [services, setServices] = useState<Service[]>([])
  const [vouchers, setVouchers] = useState<api.Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedVoucher, setSelectedVoucher] = useState<api.Voucher | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // Buscar serviços e vouchers do backend
  useEffect(() => {
    async function loadData() {
      try {
        const [servicesData, vouchersData] = await Promise.all([
          api.getServices(),
          user?.id ? api.getVouchersByUserId(user.id) : Promise.resolve([])
        ])
        
        setServices(servicesData)
        // Filtrar apenas vouchers ativos (não usados e não expirados)
        const activeVouchers = vouchersData.filter(v => 
          !v.isUsed && (!v.expiresAt || new Date(v.expiresAt) > new Date())
        )
        setVouchers(activeVouchers)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])
  
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
  
  // Verificar se serviço tem voucher de tratamento grátis
  const hasFreeVoucher = (serviceId: string): api.Voucher | null => {
    const freeVoucher = vouchers.find(v => 
      v.type === 'FREE_TREATMENT' && 
      (v.anyService || v.serviceId === serviceId)
    )
    return freeVoucher || null
  }
  
  // Pegar voucher de desconto ativo (se houver)
  const activeDiscountVoucher = vouchers.find(v => v.type === 'DISCOUNT')
  
  // Calcular preço com desconto
  const calculatePrice = (originalPrice: number): { original: number, final: number, discount: number } => {
    if (!activeDiscountVoucher) return { original: originalPrice, final: originalPrice, discount: 0 }
    
    let discount = 0
    if (activeDiscountVoucher.discountPercent) {
      discount = originalPrice * (activeDiscountVoucher.discountPercent / 100)
    } else if (activeDiscountVoucher.discountAmount) {
      discount = Math.min(activeDiscountVoucher.discountAmount, originalPrice)
    }
    
    return {
      original: originalPrice,
      final: Math.max(0, originalPrice - discount),
      discount
    }
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

  const handleVoucherClick = (voucher: api.Voucher) => {
    if (voucher.type === 'FREE_MONTH') {
      router.push('/cliente/plano')
      return
    }
    
    // Se for tratamento grátis específico, rolar até o serviço
    if (voucher.type === 'FREE_TREATMENT' && voucher.serviceId) {
      const element = document.getElementById(`service-${voucher.serviceId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Destacar com animação
        element.classList.add('ring-4', 'ring-green-500', 'ring-offset-2', 'scale-105', 'shadow-2xl')
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-green-500', 'ring-offset-2', 'scale-105', 'shadow-2xl')
        }, 3000)
        
        // Toast informativo
        toast.success('Este tratamento é GRÁTIS com seu voucher! 🎁', {
          duration: 3000,
          position: 'top-center'
        })
      }
    } else if (voucher.type === 'DISCOUNT') {
      // Para desconto geral, mostrar toast
      const discountText = voucher.discountPercent 
        ? `${voucher.discountPercent}% de desconto` 
        : `R$ ${voucher.discountAmount?.toFixed(2)} de desconto`
      
      toast.success(`${discountText} aplicado em todos os tratamentos! 💰`, {
        duration: 3000,
        position: 'top-center'
      })
    }
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Serviços">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Vouchers Banner */}
          {vouchers.length > 0 && (
            <VoucherBanner 
              vouchers={vouchers} 
              onSelectVoucher={handleVoucherClick}
              onVoucherActivated={() => {
                // Recarregar dados após ativar voucher
                window.location.reload()
              }}
            />
          )}
          
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
                const freeVoucher = hasFreeVoucher(service.id)
                const pricing = calculatePrice(service.price)
                const hasDiscount = pricing.discount > 0
                
                return (
                  <button
                    key={service.id}
                    id={`service-${service.id}`}
                    onClick={() => handleServiceClick(service)}
                    className={`w-full bg-white rounded-xl p-4 border transition-all text-left ${
                      freeVoucher 
                        ? 'border-green-500 shadow-lg shadow-green-100 hover:shadow-xl' 
                        : 'border-gray-200 hover:border-pink-300 hover:shadow-md'
                    }`}
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
                          {freeVoucher && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs rounded-full font-bold animate-pulse">
                              🎁 GRÁTIS!
                            </span>
                          )}
                          {!freeVoucher && hasDiscount && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium">
                              -{activeDiscountVoucher?.discountPercent}% OFF
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
                        {freeVoucher ? (
                          <div>
                            <div className="text-lg font-bold text-green-600">GRÁTIS</div>
                            <div className="text-xs text-gray-400 line-through">R$ {service.price.toFixed(2)}</div>
                          </div>
                        ) : includedInPlan ? (
                          <div>
                            <div className="text-sm font-bold text-green-600">Incluso</div>
                            <div className="text-xs text-gray-500 mt-0.5">R$ {service.price.toFixed(2)}</div>
                          </div>
                        ) : hasDiscount ? (
                          <div>
                            <div className="text-lg font-bold text-pink-600">R$ {pricing.final.toFixed(2)}</div>
                            <div className="text-xs text-gray-400 line-through">R$ {pricing.original.toFixed(2)}</div>
                          </div>
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
          availableVoucher={selectedService ? hasFreeVoucher(selectedService.id) : null}
          discountVoucher={activeDiscountVoucher}
        />
      </ClientLayout>
    </ProtectedRoute>
  )
}

export default function ServicosClientePage() {
  return (
    <Suspense fallback={
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Serviços">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    }>
      <ServicosContent />
    </Suspense>
  )
}
