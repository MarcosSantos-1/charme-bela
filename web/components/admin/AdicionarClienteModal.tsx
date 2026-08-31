'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { PhoneInput } from '../PhoneInput'
import { RiUser3Fill, RiMailFill, RiPhoneFill, RiMapPin2Fill, RiCalendar2Fill } from 'react-icons/ri'
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
        toast.success('Cliente adicionada com sucesso! ✨')
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
      title={editingClient ? "Editar Cliente" : "Adicionar Nova Cliente"} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome e Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <RiUser3Fill className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
              Nome Completo *
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
              <RiMailFill className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="maria@email.com"
              className="w-full px-3.5 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
            />
          </div>
        </div>

        {/* Telefone e Data Nascimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <RiPhoneFill className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
              Telefone / WhatsApp *
            </label>
            <PhoneInput
              value={formData.telefone}
              onChange={(value) => setFormData({ ...formData, telefone: value })}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <RiCalendar2Fill className="w-3.5 h-3.5 inline mr-1 text-purple-600" />
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            <RiMapPin2Fill className="w-3.5 h-3.5 inline mr-1 text-rose-500" />
            Endereço (opcional)
          </label>
          <input
            type="text"
            value={formData.endereco}
            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
            placeholder="Rua, número, bairro, cidade"
            className="w-full px-3.5 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
          />
        </div>

        {/* Botões */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-4">
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


