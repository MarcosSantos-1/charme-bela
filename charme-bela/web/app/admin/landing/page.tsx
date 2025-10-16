'use client'

import { useState } from 'react'
import { Save, Plus, Edit, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import Image from 'next/image'

interface Testimonial {
  id: string
  name: string
  role: string
  avatar: string
  text: string
  rating: number
  photoUrl?: string
}

export default function LandingPageAdmin() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([
    {
      id: '1',
      name: 'Maria Silva',
      role: 'Assinante Plus Care',
      avatar: 'M',
      text: 'Há 6 meses faço parte do Charme & Bela Club e minha pele nunca esteve tão bonita! A economia é real e os tratamentos são impecáveis. Super recomendo!',
      rating: 5
    },
    {
      id: '2',
      name: 'Ana Oliveira',
      role: 'Assinante Premium',
      avatar: 'A',
      text: 'O melhor investimento que fiz em mim mesma! Faço microagulhamento e skinbooster todo mês. O plano premium vale cada centavo, economizo muito.',
      rating: 5
    },
    {
      id: '3',
      name: 'Julia Santos',
      role: 'Assinante Essencial',
      avatar: 'J',
      text: 'Comecei com o plano Essencial e já vi resultados incríveis. A drenagem e limpeza de pele são maravilhosas. Equipe super atenciosa e profissional!',
      rating: 5
    }
  ])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Testimonial>>({})

  const handleEdit = (testimonial: Testimonial) => {
    setEditingId(testimonial.id)
    setEditForm(testimonial)
  }

  const handleSave = () => {
    if (editingId) {
      setTestimonials(testimonials.map(t => 
        t.id === editingId ? { ...t, ...editForm } as Testimonial : t
      ))
      setEditingId(null)
      setEditForm({})
      alert('Depoimento atualizado com sucesso!')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este depoimento?')) {
      setTestimonials(testimonials.filter(t => t.id !== id))
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

        <Button variant="primary">
          <Plus className="w-5 h-5 mr-2" />
          Novo Depoimento
        </Button>
      </div>

      {/* Info */}
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
        <p className="text-sm text-pink-800">
          💡 Os depoimentos aparecem na landing page logo após a seção de planos. 
          Mantenha 3 depoimentos para melhor visualização.
        </p>
      </div>

      {/* Testimonials List */}
      <div className="space-y-4">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="bg-white rounded-xl border border-gray-200 p-6">
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
                      Foto (opcional)
                    </label>
                    <label className="block">
                      <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-400 transition-colors cursor-pointer text-center">
                        <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                        <span className="text-xs text-gray-600">Upload foto</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
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

                  <div className="flex space-x-2">
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

      {/* Save All Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <Button variant="primary" size="lg">
          <Save className="w-5 h-5 mr-2" />
          Publicar Alterações
        </Button>
      </div>
    </div>
  )
}


