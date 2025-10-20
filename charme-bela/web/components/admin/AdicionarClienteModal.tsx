'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { PhoneInput } from '../PhoneInput'
import { User, Mail, Phone, MapPin, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker from '../DatePicker'
import * as api from '@/lib/api'

interface AdicionarClienteModalProps {
  isOpen: boolean
  onClose: () => void
  editingClient?: {
    id: string
    name: string
    email: string
    phone: string
  } | null
}

export function AdicionarClienteModal({ isOpen, onClose, editingClient }: AdicionarClienteModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    endereco: '',
    dataNascimento: undefined as Date | undefined
  })

  const [loading, setLoading] = useState(false)
  
  // Preencher dados ao editar
  useEffect(() => {
    if (isOpen && editingClient) {
      setFormData({
        nome: editingClient.name,
        email: editingClient.email,
        telefone: editingClient.phone,
        endereco: '',
        dataNascimento: undefined
      })
    } else if (!isOpen) {
      resetForm()
    }
  }, [isOpen, editingClient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.telefone) {
      toast.error('Preencha pelo menos nome e telefone')
      return
    }

    setLoading(true)
    try {
      if (editingClient) {
        // Editar cliente existente
        const updateData: any = {
          name: formData.nome,
          phone: formData.telefone
        }
        
        if (formData.email && formData.email !== editingClient.email) {
          updateData.email = formData.email
        }

        await api.updateUser(editingClient.id, updateData)
        toast.success('Cliente atualizado com sucesso!')
      } else {
        // Criar novo cliente
        const userData: any = {
          name: formData.nome,
          email: formData.email || `${formData.telefone.replace(/\D/g, '')}@temp.com`,
          phone: formData.telefone,
          role: 'CLIENT',
          isActive: true
        }

        await api.createUser(userData)
        toast.success('Cliente adicionado com sucesso!')
      }
      
      onClose()
      resetForm()
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error)
      toast.error(error.message || 'Erro ao salvar cliente')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ 
      nome: '', 
      email: '', 
      telefone: '', 
      endereco: '', 
      dataNascimento: undefined
    })
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingClient ? "Editar Cliente" : "Adicionar Novo Cliente"} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome e Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Nome Completo *
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
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="maria@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Telefone e Data Nascimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Telefone *
            </label>
            <PhoneInput
              value={formData.telefone}
              onChange={(value) => setFormData({ ...formData, telefone: value })}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data de Nascimento
            </label>
            <DatePicker
              value={formData.dataNascimento}
              onChange={(date) => setFormData({ ...formData, dataNascimento: date })}
              maxDate={new Date()}
              showYearPicker={true}
              placeholder="Selecione a data de nascimento"
            />
          </div>
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Endereço
          </label>
          <input
            type="text"
            value={formData.endereco}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            placeholder="Rua, número, bairro, cidade"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
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
            isLoading={loading}
          >
            {editingClient ? 'Salvar Alterações' : 'Adicionar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

