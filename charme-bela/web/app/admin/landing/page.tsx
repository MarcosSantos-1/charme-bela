'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Edit, Trash2, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { NovoDepoimentoModal } from '@/components/admin/NovoDepoimentoModal'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'

interface Testimonial {
  id: string
  name: string
  role: string
  avatar: string
  text: string
  rating: number
  photoUrl?: string
  isActive?: boolean
  order?: number
}

export default function LandingPageAdmin() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Testimonial>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadTestimonials()
  }, [])

  const loadTestimonials = async () => {
    setLoading(true)
    try {
      console.log('🔄 Buscando depoimentos...')
      const data = await api.getTestimonials(false) // Buscar todos (ativos e inativos)
      console.log('📝 Depoimentos carregados:', data)
      console.log('📝 Tipo de data:', typeof data, Array.isArray(data))
      
      if (Array.isArray(data)) {
        setTestimonials(data)
        console.log('✅ Testimonials state atualizado:', data.length, 'depoimentos')
      } else {
        console.error('❌ Data não é array:', data)
        setTestimonials([])
      }
    } catch (error) {
      console.error('❌ Erro ao carregar depoimentos:', error)
      toast.error('Erro ao carregar depoimentos')
      setTestimonials([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (testimonial: Testimonial) => {
    setEditingId(testimonial.id)
    setEditForm(testimonial)
  }

  const handleSave = async () => {
    if (!editingId) return
    
    try {
      await api.updateTestimonial(editingId, {
        name: editForm.name,
        role: editForm.role,
        avatar: editForm.avatar,
        text: editForm.text,
        rating: editForm.rating
      })
      
      toast.success('Depoimento atualizado com sucesso!')
      setEditingId(null)
      setEditForm({})
      loadTestimonials()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar depoimento')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este depoimento?')) return
    
    try {
      await api.deleteTestimonial(id)
      toast.success('Depoimento excluído com sucesso!')
      loadTestimonials()
    } catch (error) {
      console.error('Erro ao deletar:', error)
      toast.error('Erro ao deletar depoimento')
    }
  }
  
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.updateTestimonial(id, { isActive: !currentStatus })
      toast.success(currentStatus ? 'Depoimento desativado' : 'Depoimento ativado')
      loadTestimonials()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão da Landing Page</h2>
          <p className="text-gray-600 mt-1">Edite testemunhos e depoimentos de clientes</p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Novo Depoimento
        </Button>
      </div>

      {/* Info */}
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
        <p className="text-sm text-pink-800">
          💡 Os depoimentos aparecem na landing page logo após a seção de planos. 
          Recomendamos manter 3-5 depoimentos ativos para melhor visualização.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      ) : testimonials.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600 mb-4">Nenhum depoimento cadastrado</p>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Primeiro Depoimento
          </Button>
        </div>
      ) : (
        /* Testimonials List */
        <div className="space-y-4">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className={`bg-white rounded-xl border-2 p-6 transition-all ${
                testimonial.isActive === false 
                  ? 'border-gray-300 opacity-50' 
                  : 'border-gray-200'
              }`}
            >
              {editingId === testimonial.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Nome"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div>
                      <Input
                        label="Plano/Cargo"
                        value={editForm.role || ''}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        placeholder="Ex: Assinante Plus Care"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depoimento
                    </label>
                    <textarea
                      rows={4}
                      value={editForm.text || ''}
                      onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                      placeholder="Digite o depoimento..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Avatar (letra inicial)
                      </label>
                      <input
                        type="text"
                        maxLength={1}
                        value={editForm.avatar || ''}
                        onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 text-center text-2xl font-bold uppercase"
                        placeholder="M"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Avaliação (estrelas)
                      </label>
                      <select
                        value={editForm.rating || 5}
                        onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 estrelas)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 estrelas)</option>
                        <option value={3}>⭐⭐⭐ (3 estrelas)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-lg flex-shrink-0">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{testimonial.name}</div>
                        <div className="text-sm text-gray-500">{testimonial.role}</div>
                        <div className="flex items-center mt-1">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <span key={i} className="text-yellow-400">★</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Toggle Active/Inactive */}
                      <button
                        onClick={() => handleToggleActive(testimonial.id, testimonial.isActive !== false)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          testimonial.isActive === false
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {testimonial.isActive === false ? 'Inativo' : 'Ativo'}
                      </button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(testimonial)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(testimonial.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                    "{testimonial.text}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Depoimento */}
      <NovoDepoimentoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          loadTestimonials()
        }}
      />
    </div>
  )
}
