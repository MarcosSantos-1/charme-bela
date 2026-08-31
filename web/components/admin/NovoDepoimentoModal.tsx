'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { RiStarFill, RiUser3Fill, RiChat3Fill } from 'react-icons/ri'
import toast from 'react-hot-toast'

interface NovoDepoimentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NovoDepoimentoModal({ isOpen, onClose, onSuccess }: NovoDepoimentoModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    plano: '',
    avaliacao: 5,
    depoimento: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.depoimento) {
      toast.error('Preencha nome e depoimento')
      return
    }

    setSaving(true)
    try {
      const { createTestimonial } = await import('@/lib/api')
      
      await createTestimonial({
        name: formData.nome,
        role: formData.plano || 'Cliente',
        avatar: formData.nome.charAt(0).toUpperCase(),
        text: formData.depoimento,
        rating: formData.avaliacao
      })
      
      toast.success('Depoimento adicionado com sucesso! ⭐')
      setFormData({ nome: '', plano: '', avaliacao: 5, depoimento: '' })
      onSuccess()
    } catch (error) {
      console.error('Erro ao criar depoimento:', error)
      toast.error('Erro ao criar depoimento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Depoimento" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            <RiUser3Fill className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
            Nome da Cliente *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Maria Silva"
            className="w-full px-3.5 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Plano / Observação
          </label>
          <input
            type="text"
            value={formData.plano}
            onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
            placeholder="Ex: Assinante Plano Ouro"
            className="w-full px-3.5 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            <RiStarFill className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
            Avaliação *
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData({ ...formData, avaliacao: star })}
                className="focus:outline-none p-1 hover:scale-110 transition-transform"
              >
                <RiStarFill
                  className={`w-7 h-7 ${
                    star <= formData.avaliacao
                      ? 'text-amber-400 drop-shadow-xs'
                      : 'text-slate-200'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            <RiChat3Fill className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
            Depoimento *
          </label>
          <textarea
            value={formData.depoimento}
            onChange={(e) => setFormData({ ...formData, depoimento: e.target.value })}
            placeholder="Escreva o depoimento do cliente..."
            rows={4}
            className="w-full px-3.5 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 resize-none text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
            required
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1 shadow-xs" isLoading={saving}>
            Adicionar Depoimento
          </Button>
        </div>
      </form>
    </Modal>
  )
}

