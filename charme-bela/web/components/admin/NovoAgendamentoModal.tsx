'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Input } from '../Input'
import { Button } from '../Button'
import { Calendar, Clock, User, Scissors, CheckCircle } from 'lucide-react'
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

  const [buscaCliente, setBuscaCliente] = useState('')
  const [showClientesList, setShowClientesList] = useState(false)

  // Mock de clientes - substituir por API real
  const clientesCadastrados = [
    { id: '1', nome: 'Maria Silva', telefone: '(11) 99999-9999' },
    { id: '2', nome: 'Ana Santos', telefone: '(11) 88888-8888' },
    { id: '3', nome: 'Julia Oliveira', telefone: '(11) 77777-7777' },
    { id: '4', nome: 'Carla Mendes', telefone: '(11) 66666-6666' },
    { id: '5', nome: 'Beatriz Costa', telefone: '(11) 55555-5555' },
  ]

  const clientesFiltrados = clientesCadastrados.filter(cliente =>
    cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    cliente.telefone.includes(buscaCliente)
  )

  const selecionarCliente = (nome: string) => {
    setFormData({ ...formData, cliente: nome })
    setBuscaCliente(nome)
    setShowClientesList(false)
  }

  const servicos = [
    'Limpeza de Pele',
    'Peeling Químico',
    'Massagem Modeladora',
    'Drenagem Linfática',
    'Depilação',
    'Radiofrequência',
    'Microagulhamento',
    'Outros'
  ]

  const horarios = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
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
        {/* Cliente - com busca */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Cliente *
          </label>
          <input
            type="text"
            value={buscaCliente}
            onChange={(e) => {
              setBuscaCliente(e.target.value)
              setShowClientesList(true)
              setFormData({ ...formData, cliente: '' })
            }}
            onFocus={() => setShowClientesList(true)}
            placeholder="Digite para buscar cliente..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            required
          />

          {/* Lista de clientes */}
          {showClientesList && buscaCliente && (
            <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map(cliente => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => selecionarCliente(cliente.nome)}
                    className="w-full px-4 py-3 hover:bg-pink-50 transition-colors text-left border-b border-gray-100 last:border-0"
                  >
                    <div className="font-semibold text-gray-900">{cliente.nome}</div>
                    <div className="text-sm text-gray-500">{cliente.telefone}</div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Nenhum cliente encontrado
                </div>
              )}
            </div>
          )}

          {formData.cliente && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Cliente selecionado: <strong>{formData.cliente}</strong>
            </div>
          )}
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
            <div className="relative">
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 font-medium cursor-pointer hover:border-pink-300 transition-colors"
                style={{
                  colorScheme: 'light'
                }}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Horário *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500" />
              <select
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-gray-900 font-medium cursor-pointer hover:border-pink-300 transition-colors appearance-none bg-white"
                required
              >
                <option value="">Selecione o horário</option>
                {horarios.map(hora => (
                  <option key={hora} value={hora}>{hora}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
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

