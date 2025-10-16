'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Gift, User, DollarSign, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface DarVoucherModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DarVoucherModal({ isOpen, onClose }: DarVoucherModalProps) {
  const [formData, setFormData] = useState({
    cliente: '',
    tipo: 'desconto',
    valor: '',
    servico: '',
    validade: '',
    motivo: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.cliente || !formData.valor) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    toast.success('Voucher criado com sucesso! 🎁')
    onClose()
    setFormData({ cliente: '', tipo: 'desconto', valor: '', servico: '', validade: '', motivo: '' })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dar Voucher / Desconto" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Cliente *
          </label>
          <input
            type="text"
            value={formData.cliente}
            onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
            placeholder="Nome do cliente"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Gift className="w-4 h-4 inline mr-1" />
            Tipo de Voucher *
          </label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            required
          >
            <option value="desconto">Desconto em %</option>
            <option value="valor">Valor fixo (R$)</option>
            <option value="servico">Serviço grátis</option>
          </select>
        </div>

        {formData.tipo !== 'servico' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Valor *
            </label>
            <input
              type="number"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              placeholder={formData.tipo === 'desconto' ? '20' : '50.00'}
              min="0"
              step={formData.tipo === 'desconto' ? '1' : '0.01'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.tipo === 'desconto' ? 'Porcentagem de desconto' : 'Valor em reais'}
            </p>
          </div>
        )}

        {formData.tipo === 'servico' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Serviço *
            </label>
            <input
              type="text"
              value={formData.servico}
              onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
              placeholder="Ex: Limpeza de Pele"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Validade
          </label>
          <input
            type="date"
            value={formData.validade}
            onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo/Observação
          </label>
          <textarea
            value={formData.motivo}
            onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
            placeholder="Ex: Aniversário, fidelidade..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1">
            Criar Voucher
          </Button>
        </div>
      </form>
    </Modal>
  )
}

