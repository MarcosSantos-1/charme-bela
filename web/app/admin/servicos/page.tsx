'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, Clock, DollarSign, ChevronDown } from 'lucide-react'
import { Button } from '@/components/Button'
import { useConfirm } from '@/hooks/useConfirm'
import * as api from '@/lib/api'
import { NovoServicoModal } from '@/components/admin/NovoServicoModal'
import toast from 'react-hot-toast'

export default function ServicosPage() {
  const [services, setServices] = useState<api.Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isNovoServicoOpen, setIsNovoServicoOpen] = useState(false)
  const [editingService, setEditingService] = useState<api.Service | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['FACIAL', 'CORPORAL', 'MASSAGEM', 'COMBO'])
  const { confirm, ConfirmDialogComponent } = useConfirm()

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    setLoading(true)
    try {
      const data = await api.getServices(true) // true = mostrar todos (incluindo inativos)
      setServices(data)
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
      toast.error('Erro ao carregar serviços')
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const getServicesByCategory = (category: string) => {
    return filteredServices.filter(s => s.category === category)
  }

  const categories = [
    { id: 'FACIAL', name: 'Tratamentos Faciais', icon: '✨', color: 'pink' },
    { id: 'CORPORAL', name: 'Tratamentos Corporais', icon: '💪', color: 'blue' },
    { id: 'MASSAGEM', name: 'Massagens', icon: '💆', color: 'purple' },
    { id: 'COMBO', name: 'Combos e Pacotes', icon: '🎁', color: 'orange' }
  ]

  const handleEdit = (service: api.Service) => {
    setEditingService(service)
    setIsNovoServicoOpen(true)
  }

  const handleDelete = async (service: api.Service) => {
    const confirmed = await confirm({
      title: 'Desativar Serviço',
      message: `Tem certeza que deseja desativar "${service.name}"? Ele não ficará mais disponível para novos agendamentos.`,
      confirmText: 'Sim, desativar',
      cancelText: 'Cancelar',
      type: 'danger'
    })

    if (!confirmed) return

    try {
      console.log('🗑️ Desativando serviço:', service.id)
      await api.deactivateService(service.id)
      toast.success('Serviço desativado com sucesso!')
      loadServices() // Recarrega a lista
    } catch (error: any) {
      console.error('Erro ao desativar serviço:', error)
      toast.error(error.message || 'Erro ao desativar serviço')
    }
  }

  const handleCloseModal = () => {
    setIsNovoServicoOpen(false)
    setEditingService(null)
  }

  const handleSuccess = () => {
    loadServices() // Recarrega a lista
    handleCloseModal()
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Serviços</h2>
          <p className="text-gray-600 mt-1">Gerencie os tratamentos oferecidos</p>
        </div>

        <Button 
          variant="primary"
          onClick={() => {
            setEditingService(null)
            setIsNovoServicoOpen(true)
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar serviços..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
        />
      </div>

      {/* Categories with Dropdown */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryServices = getServicesByCategory(category.id)
            const isExpanded = expandedCategories.includes(category.id)
            
            if (categoryServices.length === 0 && searchTerm) return null

            return (
              <div key={category.id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    category.color === 'pink' ? 'bg-gradient-to-r from-pink-50 to-pink-100' :
                    category.color === 'blue' ? 'bg-gradient-to-r from-blue-50 to-blue-100' :
                    category.color === 'purple' ? 'bg-gradient-to-r from-purple-50 to-purple-100' :
                    'bg-gradient-to-r from-orange-50 to-orange-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{category.icon}</span>
                    <div className="text-left">
                      <h3 className={`text-lg font-bold ${
                        category.color === 'pink' ? 'text-pink-700' :
                        category.color === 'blue' ? 'text-blue-700' :
                        category.color === 'purple' ? 'text-purple-700' :
                        'text-orange-700'
                      }`}>
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {categoryServices.length} {categoryServices.length === 1 ? 'serviço' : 'serviços'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Category Services */}
                {isExpanded && categoryServices.length > 0 && (
                  <div className="p-4 border-t-2 border-gray-100">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryServices.map((service) => (
                        <div
                          key={service.id}
                          className={`bg-white rounded-lg border-2 transition-all p-4 ${
                            service.isActive 
                              ? 'border-gray-200 hover:shadow-md hover:border-pink-300' 
                              : 'border-gray-300 opacity-60 bg-gray-50'
                          }`}
                        >
                          {/* Service details */}
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-base font-bold text-gray-900 flex-1 leading-tight">
                              {service.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${
                                service.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {service.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {service.description}
                          </p>

                          <div className="flex items-center justify-between mb-3 text-sm">
                            <div className="flex items-center text-gray-600">
                              <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                              <span className="font-medium">{service.duration} min</span>
                            </div>
                            <div className="flex items-center font-bold text-pink-600 text-lg">
                              R$ {service.price.toFixed(2)}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-3 border-t border-gray-100">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleEdit(service)}
                            >
                              <Edit className="w-4 h-4 mr-1.5" />
                              Editar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(service)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state for expanded category */}
                {isExpanded && categoryServices.length === 0 && (
                  <div className="p-8 text-center text-gray-500 border-t-2 border-gray-100">
                    <p className="text-sm">Nenhum serviço nesta categoria</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {filteredServices.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-600">Nenhum serviço encontrado</p>
        </div>
      )}

      {/* Modais */}
      <NovoServicoModal 
        isOpen={isNovoServicoOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        editingService={editingService}
      />
    </div>
  )
}

