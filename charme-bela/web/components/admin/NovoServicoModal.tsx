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
    descricao: '',
    incluirPlano: false,
    planosDisponiveis: [] as string[]
  })

  const categorias = [
    'Tratamentos Faciais',
    'Tratamentos Corporais',
    'Depilação',
    'Pós-operatório',
    'Injetáveis',
    'Massagens'
  ]

  const planos = [
    { id: 'essencial', nome: 'Essencial Beauty (Bronze)', valor: 'R$ 149,90' },
    { id: 'plus', nome: 'Plus Care (Prata)', valor: 'R$ 249,90' },
    { id: 'premium', nome: 'Premium Experience (Ouro)', valor: 'R$ 399,90' }
  ]

  const togglePlano = (planoId: string) => {
    const planos = formData.planosDisponiveis
    if (planos.includes(planoId)) {
      setFormData({ ...formData, planosDisponiveis: planos.filter(p => p !== planoId) })
    } else {
      setFormData({ ...formData, planosDisponiveis: [...planos, planoId] })
    }
  }

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
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {/* Incluir em Planos */}
        <div className="border-t border-gray-200 pt-4">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={formData.incluirPlano}
              onChange={(e) => setFormData({ ...formData, incluirPlano: e.target.checked })}
              className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
            />
            <span className="font-semibold text-gray-900">
              Incluir em planos de assinatura
            </span>
          </label>

          {formData.incluirPlano && (
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 space-y-2">
              <p className="text-sm text-gray-700 mb-3">
                Selecione em quais planos este serviço estará disponível:
              </p>
              {planos.map(plano => (
                <label
                  key={plano.id}
                  className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-pink-300 cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={formData.planosDisponiveis.includes(plano.id)}
                    onChange={() => togglePlano(plano.id)}
                    className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{plano.nome}</div>
                    <div className="text-xs text-gray-500">{plano.valor}/mês</div>
                  </div>
                </label>
              ))}
            </div>
          )}
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

