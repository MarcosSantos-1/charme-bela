'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Input } from '../Input'
import { Button } from '../Button'
import { Calendar, Clock, User, Scissors } from 'lucide-react'
import toast from 'react-hot-toast'

interface NovoAgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NovoAgendamentoModal({ isOpen, onClose }: NovoAgendamentoModalProps) {
  const [formData, setFormData] = useState({
    cliente: '',
    servico: '',
    data: '',
    hora: '',
    observacoes: ''
  })

  const servicos = [
    'Limpeza de Pele',
    'Peeling Químico',
    'Massagem Modeladora',
    'Drenagem Linfática',
    'Depilação',
    'Outros'
  ]

  const horarios = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.cliente || !formData.servico || !formData.data || !formData.hora) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    // Aqui você faria a chamada para API
    toast.success('Agendamento criado com sucesso!')
    onClose()
    setFormData({ cliente: '', servico: '', data: '', hora: '', observacoes: '' })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Agendamento" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cliente */}
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

        {/* Serviço */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Scissors className="w-4 h-4 inline mr-1" />
            Serviço *
          </label>
          <select
            value={formData.servico}
            onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
            required
          >
            <option value="">Selecione um serviço</option>
            {servicos.map(servico => (
              <option key={servico} value={servico}>{servico}</option>
            ))}
          </select>
        </div>

        {/* Data e Hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data *
            </label>
            <input
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Horário *
            </label>
            <select
              value={formData.hora}
              onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              required
            >
              <option value="">Selecione</option>
              {horarios.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            placeholder="Informações adicionais (opcional)"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {/* Botões */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
          >
            Criar Agendamento
          </Button>
        </div>
      </form>
    </Modal>
  )
}

