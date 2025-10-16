'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Scissors, DollarSign, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface NovoServicoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NovoServicoModal({ isOpen, onClose }: NovoServicoModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    preco: '',
    duracao: '',
    descricao: ''
  })

  const categorias = [
    'Tratamentos Faciais',
    'Tratamentos Corporais',
    'Depilação',
    'Pós-operatório',
    'Injetáveis'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.categoria || !formData.preco) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    toast.success('Serviço adicionado com sucesso!')
    onClose()
    setFormData({ nome: '', categoria: '', preco: '', duracao: '', descricao: '' })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Novo Serviço" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Scissors className="w-4 h-4 inline mr-1" />
            Nome do Serviço *
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Limpeza de Pele Profunda"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria *
          </label>
          <select
            value={formData.categoria}
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            required
          >
            <option value="">Selecione uma categoria</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Preço *
            </label>
            <input
              type="number"
              value={formData.preco}
              onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              placeholder="150.00"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Duração (min)
            </label>
            <input
              type="number"
              value={formData.duracao}
              onChange={(e) => setFormData({ ...formData, duracao: e.target.value })}
              placeholder="60"
              min="15"
              step="15"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Descreva o serviço..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1">
            Adicionar Serviço
          </Button>
        </div>
      </form>
    </Modal>
  )
}

