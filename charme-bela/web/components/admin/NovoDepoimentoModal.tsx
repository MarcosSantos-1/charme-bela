'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Star, User, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

interface NovoDepoimentoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NovoDepoimentoModal({ isOpen, onClose }: NovoDepoimentoModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    servico: '',
    avaliacao: 5,
    depoimento: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.depoimento) {
      toast.error('Preencha nome e depoimento')
      return
    }

    toast.success('Depoimento adicionado com sucesso! ⭐')
    onClose()
    setFormData({ nome: '', servico: '', avaliacao: 5, depoimento: '' })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Depoimento" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Nome do Cliente *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Maria Silva"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Serviço Realizado
          </label>
          <input
            type="text"
            value={formData.servico}
            onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
            placeholder="Ex: Limpeza de Pele"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Star className="w-4 h-4 inline mr-1" />
            Avaliação *
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData({ ...formData, avaliacao: star })}
                className="focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= formData.avaliacao
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Depoimento *
          </label>
          <textarea
            value={formData.depoimento}
            onChange={(e) => setFormData({ ...formData, depoimento: e.target.value })}
            placeholder="Escreva o depoimento do cliente..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
            required
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1">
            Adicionar Depoimento
          </Button>
        </div>
      </form>
    </Modal>
  )
}

