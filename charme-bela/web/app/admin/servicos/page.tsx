'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { Button } from '@/components/Button'
import { useConfirm } from '@/hooks/useConfirm'
import * as api from '@/lib/api'
import { NovoServicoModal } from '@/components/admin/NovoServicoModal'
import toast from 'react-hot-toast'

export default function ServicosPage() {
  const [services, setServices] = useState<api.Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [isNovoServicoOpen, setIsNovoServicoOpen] = useState(false)
  const [editingService, setEditingService] = useState<api.Service | null>(null)
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
    
    const matchesCategory = categoryFilter === 'ALL' || service.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

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

  const getCategoryColor = (category: string) => {
    const colors = {
      FACIAL: 'bg-pink-100 text-pink-700',
      CORPORAL: 'bg-blue-100 text-blue-700',
      MASSAGEM: 'bg-purple-100 text-purple-700',
      COMBO: 'bg-orange-100 text-orange-700'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      FACIAL: '✨ Facial',
      CORPORAL: '💪 Corporal',
      MASSAGEM: '💆 Massagem',
      COMBO: '🎁 Combo'
    }
    return labels[category as keyof typeof labels] || category
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

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 font-medium"
        >
          <option value="ALL">Todas Categorias</option>
          <option value="FACIAL">✨ Facial</option>
          <option value="CORPORAL">💪 Corporal</option>
          <option value="MASSAGEM">💆 Massagem</option>
          <option value="COMBO">🎁 Combo</option>
        </select>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-xl border-2 transition-all ${
                service.isActive 
                  ? 'border-gray-200 hover:shadow-lg hover:border-pink-300' 
                  : 'border-gray-300 opacity-60 bg-gray-50'
              }`}
            >
              {/* Service header with category color */}
              <div className={`h-32 bg-gradient-to-br ${
                service.category === 'FACIAL' ? 'from-pink-100 to-pink-200' :
                service.category === 'CORPORAL' ? 'from-blue-100 to-blue-200' :
                service.category === 'MASSAGEM' ? 'from-purple-100 to-purple-200' :
                'from-orange-100 to-orange-200'
              } rounded-t-xl flex flex-col items-center justify-center`}>
                <div className="text-4xl mb-2">
                  {service.category === 'FACIAL' ? '✨' :
                   service.category === 'CORPORAL' ? '💪' :
                   service.category === 'MASSAGEM' ? '💆' : '🎁'}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(service.category)}`}>
                  {getCategoryLabel(service.category)}
                </span>
              </div>

              {/* Service details */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 flex-1">
                    {service.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      service.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {service.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {service.description}
                </p>

                <div className="flex items-center justify-between mb-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                    {service.duration} min
                  </div>
                  <div className="flex items-center font-bold text-pink-600 text-lg">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {service.price.toFixed(2)}
                  </div>
                </div>

                <div className="flex space-x-2 pt-4 border-t border-gray-100">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
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
            </div>
          ))}
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

