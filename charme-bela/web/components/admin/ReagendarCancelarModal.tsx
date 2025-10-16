'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReagendarCancelarModalProps {
  isOpen: boolean
  onClose: () => void
  agendamento?: {
    id: string
    cliente: string
    servico: string
    data: string
    hora: string
  }
}

export function ReagendarCancelarModal({ isOpen, onClose, agendamento }: ReagendarCancelarModalProps) {
  const [acao, setAcao] = useState<'reagendar' | 'cancelar'>('reagendar')
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [motivo, setMotivo] = useState('')

  const horarios = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (acao === 'reagendar') {
      if (!novaData || !novaHora) {
        toast.error('Selecione nova data e horário')
        return
      }
      toast.success('Agendamento reagendado com sucesso!')
    } else {
      toast.success('Agendamento cancelado')
    }
    
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reagendar ou Cancelar" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info do agendamento atual */}
        {agendamento && (
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Agendamento Atual:</h3>
            <p className="text-sm text-gray-700">Cliente: <strong>{agendamento.cliente}</strong></p>
            <p className="text-sm text-gray-700">Serviço: {agendamento.servico}</p>
            <p className="text-sm text-gray-700">Data: {agendamento.data} às {agendamento.hora}</p>
          </div>
        )}

        {/* Escolher ação */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setAcao('reagendar')}
            className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
              acao === 'reagendar'
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-pink-300'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Reagendar
          </button>
          <button
            type="button"
            onClick={() => setAcao('cancelar')}
            className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
              acao === 'cancelar'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Cancelar
          </button>
        </div>

        {/* Se reagendar */}
        {acao === 'reagendar' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Data *
              </label>
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Novo Horário *
              </label>
              <select
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                required
              >
                <option value="">Selecione</option>
                {horarios.map(hora => (
                  <option key={hora} value={hora}>{hora}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Motivo (para cancelamento) */}
        {acao === 'cancelar' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo do Cancelamento
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo (opcional)"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Voltar
          </Button>
          <Button
            type="submit"
            variant={acao === 'reagendar' ? 'primary' : 'outline'}
            className={`flex-1 ${acao === 'cancelar' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}`}
          >
            {acao === 'reagendar' ? 'Confirmar Reagendamento' : 'Confirmar Cancelamento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

