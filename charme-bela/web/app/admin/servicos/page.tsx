'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/Button'
import { getServices, Service } from '@/lib/api'
import { NovoServicoModal } from '@/components/admin/NovoServicoModal'

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isNovoServicoOpen, setIsNovoServicoOpen] = useState(false)

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await getServices()
        setServices(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [])

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Serviços</h2>
          <p className="text-gray-600 mt-1">Gerencie os tratamentos oferecidos</p>
        </div>

        <Button 
          variant="primary"
          onClick={() => setIsNovoServicoOpen(true)}
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
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
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
              className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
            >
              {/* Service header image/icon */}
              <div className="h-32 bg-gradient-to-br from-pink-100 to-pink-200 rounded-t-xl flex items-center justify-center">
                <div className="w-16 h-16 bg-white/30 rounded-full backdrop-blur-sm"></div>
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
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {service.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {service.description}
                </p>

                <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                    {service.duration} min
                  </div>
                  <div className="flex items-center font-semibold text-pink-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    R$ {service.price.toFixed(2)}
                  </div>
                </div>

                <div className="flex space-x-2 pt-4 border-t border-gray-100">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm">
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
        onClose={() => setIsNovoServicoOpen(false)}
      />
    </div>
  )
}

