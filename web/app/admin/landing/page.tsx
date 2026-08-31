'use client'

import { useState, useEffect } from 'react'
import {
  RiSaveFill,
  RiAddLine,
  RiEdit2Fill,
  RiDeleteBin5Fill,
  RiCloseLine,
  RiStarFill,
  RiLoader4Line,
} from 'react-icons/ri'
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
      const data = await api.getTestimonials(false)
      if (Array.isArray(data)) {
        setTestimonials(data)
      } else {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Gestão da Landing Page</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">Edite testemunhos e depoimentos de clientes que aparecem na home</p>
        </div>

        <Button 
          variant="primary" 
          onClick={() => setIsModalOpen(true)}
          className="shadow-xs"
        >
          <RiAddLine className="w-4 h-4 mr-1.5" />
          Novo Depoimento
        </Button>
      </div>

      {/* Info */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 sm:p-4">
        <p className="text-xs sm:text-sm font-semibold text-rose-900">
          💡 Os depoimentos aparecem na landing page logo após a seção de planos. 
          Recomendamos manter 3-5 depoimentos ativos para melhor visualização.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600" />
        </div>
      ) : testimonials.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-xs sm:text-sm font-bold mb-4">Nenhum depoimento cadastrado</p>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <RiAddLine className="w-4 h-4 mr-1.5" />
            Adicionar Primeiro Depoimento
          </Button>
        </div>
      ) : (
        /* Testimonials List */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className={`bg-white rounded-2xl border-2 p-4 sm:p-6 transition-all shadow-xs ${
                editingId === testimonial.id ? 'md:col-span-3' : ''
              } ${
                testimonial.isActive === false 
                  ? 'border-slate-200 opacity-60' 
                  : 'border-slate-200 hover:border-rose-300'
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
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Depoimento
                    </label>
                    <textarea
                      rows={4}
                      value={editForm.text || ''}
                      onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
                      placeholder="Digite o depoimento..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Avatar (letra inicial)
                      </label>
                      <input
                        type="text"
                        maxLength={1}
                        value={editForm.avatar || ''}
                        onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 text-center text-xl font-extrabold uppercase bg-white"
                        placeholder="M"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Avaliação (estrelas)
                      </label>
                      <select
                        value={editForm.rating || 5}
                        onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) })}
                        className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs sm:text-sm font-semibold text-slate-900 bg-white"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 estrelas)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 estrelas)</option>
                        <option value={3}>⭐⭐⭐ (3 estrelas)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="text-xs font-bold" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button variant="primary" size="sm" className="text-xs font-bold shadow-xs" onClick={handleSave}>
                      <RiSaveFill className="w-3.5 h-3.5 mr-1.5" />
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center font-extrabold text-base shrink-0 border border-rose-200 shadow-xs">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm sm:text-base">{testimonial.name}</div>
                        <div className="text-xs font-semibold text-slate-500">{testimonial.role}</div>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <RiStarFill key={i} className="w-3.5 h-3.5 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Toggle Active/Inactive */}
                      <button
                        onClick={() => handleToggleActive(testimonial.id, testimonial.isActive !== false)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          testimonial.isActive === false
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {testimonial.isActive === false ? 'Inativo' : 'Ativo'}
                      </button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-bold text-slate-600"
                        onClick={() => handleEdit(testimonial)}
                      >
                        <RiEdit2Fill className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-bold text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(testimonial.id)}
                      >
                        <RiDeleteBin5Fill className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-slate-700 text-xs sm:text-sm font-semibold leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    &ldquo;{testimonial.text}&rdquo;
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
