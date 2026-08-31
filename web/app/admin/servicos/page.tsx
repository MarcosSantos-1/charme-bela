'use client'

import { useEffect, useState } from 'react'
import {
  RiAddLine,
  RiSearchLine,
  RiEdit2Fill,
  RiDeleteBin5Fill,
  RiTimeFill,
  RiArrowDownSLine,
  RiLoader4Line,
} from 'react-icons/ri'
import { Button } from '@/components/Button'
import { useConfirm } from '@/hooks/useConfirm'
import * as api from '@/lib/api'
import { NovoServicoModal } from '@/components/admin/NovoServicoModal'
import toast from 'react-hot-toast'

interface CategoryItem {
  id: string
  name: string
  imageIcon: string
  color: 'pink' | 'blue' | 'purple' | 'orange'
}

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

  const categories: CategoryItem[] = [
    { id: 'FACIAL', name: 'Tratamentos Faciais', imageIcon: '/icons/faciais.png', color: 'pink' },
    { id: 'CORPORAL', name: 'Tratamentos Corporais', imageIcon: '/icons/corporais.png', color: 'blue' },
    { id: 'MASSAGEM', name: 'Massagens & Bem-estar', imageIcon: '/icons/massagens.png', color: 'purple' },
    { id: 'COMBO', name: 'Pacotes & Combos', imageIcon: '/icons/pacotes.png', color: 'orange' }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Serviços & Procedimentos</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">Gerencie os tratamentos, pacotes e durações oferecidos</p>
        </div>

        <Button 
          variant="primary"
          onClick={() => {
            setEditingService(null)
            setIsNovoServicoOpen(true)
          }}
          className="shadow-xs"
        >
          <RiAddLine className="w-4 h-4 mr-1.5" />
          Novo Serviço
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar serviços..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white touch-manipulation"
        />
      </div>

      {/* Categories with Dropdown */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
          <div className="text-center">
            <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
            <p className="text-slate-600 text-xs font-bold">Carregando serviços...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryServices = getServicesByCategory(category.id)
            const isExpanded = expandedCategories.includes(category.id)
            
            if (categoryServices.length === 0 && searchTerm) return null

            return (
              <div key={category.id} className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xs">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between hover:opacity-95 transition-all text-left ${
                    category.color === 'pink' ? 'bg-gradient-to-r from-rose-50 to-pink-50' :
                    category.color === 'blue' ? 'bg-gradient-to-r from-sky-50 to-blue-50' :
                    category.color === 'purple' ? 'bg-gradient-to-r from-violet-50 to-purple-50' :
                    'bg-gradient-to-r from-amber-50 to-orange-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white p-1.5 shadow-xs border border-black/5 flex items-center justify-center shrink-0">
                      <Image
                        src={category.imageIcon}
                        alt={category.name}
                        width={32}
                        height={32}
                        className="object-contain w-8 h-8"
                      />
                    </div>
                    <div>
                      <h3 className={`text-base sm:text-lg font-extrabold ${
                        category.color === 'pink' ? 'text-rose-700' :
                        category.color === 'blue' ? 'text-sky-800' :
                        category.color === 'purple' ? 'text-violet-800' :
                        'text-amber-800'
                      }`}>
                        {category.name}
                      </h3>
                      <p className="text-xs font-bold text-slate-500">
                        {categoryServices.length} {categoryServices.length === 1 ? 'serviço' : 'serviços'}
                      </p>
                    </div>
                  </div>
                  <RiArrowDownSLine className={`w-6 h-6 text-slate-400 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Category Services */}
                {isExpanded && categoryServices.length > 0 && (
                  <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {categoryServices.map((service) => (
                        <div
                          key={service.id}
                          className={`bg-white rounded-2xl border-2 transition-all p-4 flex flex-col justify-between shadow-xs ${
                            service.isActive 
                              ? 'border-slate-200 hover:shadow-md hover:border-rose-300' 
                              : 'border-slate-200 opacity-60 bg-slate-50'
                          }`}
                        >
                          <div>
                            {/* Service details */}
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex-1 leading-snug">
                                {service.name}
                              </h4>
                              <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    service.isActive
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {service.isActive ? 'Ativo' : 'Inativo'}
                                </span>
                                {service.machineKind === 'LASER' && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 text-violet-800">
                                    Laser
                                  </span>
                                )}
                                {service.machineKind === 'CRYO' && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-sky-800">
                                    Crio
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-slate-500 mb-3 line-clamp-2">
                              {service.description}
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-3 text-xs bg-slate-50 p-2.5 rounded-xl">
                              <div className="flex items-center text-slate-600 font-bold">
                                <RiTimeFill className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                <span>{service.duration} min</span>
                              </div>
                              <div className="font-extrabold text-rose-600 text-base">
                                R$ {service.price.toFixed(2).replace('.', ',')}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              <button 
                                type="button"
                                onClick={() => handleEdit(service)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all touch-manipulation cursor-pointer"
                              >
                                <RiEdit2Fill className="w-3.5 h-3.5 text-rose-400" />
                                <span>Editar</span>
                              </button>
                              <button 
                                type="button"
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all shrink-0 active:scale-95 touch-manipulation cursor-pointer"
                                onClick={() => handleDelete(service)}
                                title="Desativar serviço"
                                aria-label="Desativar serviço"
                              >
                                <RiDeleteBin5Fill className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state for expanded category */}
                {isExpanded && categoryServices.length === 0 && (
                  <div className="p-8 text-center text-slate-400 border-t border-slate-100">
                    <p className="text-xs font-bold">Nenhum serviço nesta categoria</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {filteredServices.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-xs font-bold">Nenhum serviço encontrado</p>
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

