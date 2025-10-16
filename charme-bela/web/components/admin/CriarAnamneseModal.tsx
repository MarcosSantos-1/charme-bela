'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { User, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface CriarAnamneseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CriarAnamneseModal({ isOpen, onClose }: CriarAnamneseModalProps) {
  const [cliente, setCliente] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!cliente) {
      toast.error('Selecione um cliente')
      return
    }

    // Aqui redirecionaria para o formulário de anamnese
    toast.success('Redirecionando para formulário de anamnese...')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Anamnese" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center py-4">
          <FileText className="w-16 h-16 text-pink-600 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">
            Selecione o cliente para criar uma nova ficha de anamnese
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Cliente *
          </label>
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Digite o nome do cliente"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            required
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Dica:</strong> A anamnese será preenchida em etapas com informações sobre saúde, estilo de vida e objetivos do cliente.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1">
            Iniciar Anamnese
          </Button>
        </div>
      </form>
    </Modal>
  )
}

