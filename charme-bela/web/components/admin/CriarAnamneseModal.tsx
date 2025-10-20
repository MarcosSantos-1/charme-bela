'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { User, FileText, Search, CheckCircle, Sparkles, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'

interface CriarAnamneseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editingAnamnese?: any
}

export function CriarAnamneseModal({ isOpen, onClose, onSuccess, editingAnamnese }: CriarAnamneseModalProps) {
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [showClientesList, setShowClientesList] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadClientes()
      // Se estiver editando, preencher dados do cliente
      if (editingAnamnese) {
        setClienteId(editingAnamnese.userId)
        setClienteNome(editingAnamnese.user?.name || editingAnamnese.personalData?.fullName || '')
      }
    }
  }, [isOpen, editingAnamnese])

  const loadClientes = async () => {
    try {
      const users = await api.getUsers({ role: 'CLIENT', isActive: true })
      
      // Carregar anamneses para verificar quais clientes já têm
      const anamnesesList = await api.getAnamnesisList()
      const clientesComAnamnese = new Set(anamnesesList.map(a => a.userId))
      
      setClientes(users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        hasAnamnese: clientesComAnamnese.has(user.id),
        hasSubscription: user.subscription?.status === 'ACTIVE'
      })))
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      toast.error('Erro ao carregar clientes')
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.name.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    c.email.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    (c.phone && c.phone.includes(buscaCliente))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clienteId) {
      toast.error('Selecione um cliente')
      return
    }

    setLoading(true)
    try {
      const clienteSelecionado = clientes.find(c => c.id === clienteId)
      
      // Se estiver editando
      if (editingAnamnese) {
        // Atualizar anamnese existente
        const anamneseData = {
          userId: clienteId,
          personalData: {
            fullName: clienteNome,
            email: clienteSelecionado?.email || editingAnamnese.personalData?.email || '',
            phone: clienteSelecionado?.phone || editingAnamnese.personalData?.phone || '',
            // Manter birthDate vazio se termos não foram aceitos
            birthDate: editingAnamnese.termsAccepted ? editingAnamnese.personalData?.birthDate || '' : '',
            address: editingAnamnese.personalData?.address || {
              cep: '',
              street: '',
              number: '',
              neighborhood: '',
              city: '',
              state: ''
            }
          },
          lifestyleData: editingAnamnese.lifestyleData || {},
          healthData: editingAnamnese.healthData || {},
          objectivesData: editingAnamnese.objectivesData || {},
          termsAccepted: editingAnamnese.termsAccepted || false
        }

        console.log('📤 Atualizando anamnese para:', clienteNome)
        await api.updateAnamnesis(clienteId, anamneseData)
        
        toast.success(`Anamnese de ${clienteNome} atualizada com sucesso!`)
        
        if (onSuccess) onSuccess()
        resetForm()
        onClose()
        return
      }
      
      // Se não estiver editando, criar nova
      // Verificar se cliente já tem anamnese
      if (clienteSelecionado?.hasAnamnese) {
        toast.error(
          `${clienteNome} já possui uma anamnese. Use o botão "Editar" para atualizar.`,
          { duration: 5000, icon: '⚠️' }
        )
        setLoading(false)
        return
      }

      // Criar anamnese vazia para o cliente
      const anamneseData = {
        userId: clienteId,
        personalData: {
          fullName: clienteNome,
          email: clienteSelecionado?.email || '',
          phone: clienteSelecionado?.phone || '',
          birthDate: '', // Deixar vazio até cliente preencher
          address: {
            cep: '',
            street: '',
            number: '',
            neighborhood: '',
            city: '',
            state: ''
          }
        },
        lifestyleData: {},
        healthData: {},
        objectivesData: {},
        termsAccepted: false
      }

      console.log('📤 Criando anamnese para:', clienteNome)
      await api.createAnamnesis(anamneseData)
      
      toast.success(`Anamnese criada para ${clienteNome}! Cliente pode preencher pelo app.`)
      
      if (onSuccess) onSuccess()
      resetForm()
      onClose()
    } catch (error: any) {
      console.error('❌ Erro ao criar/atualizar anamnese:', error)
      
      // Mensagem específica se já existir
      if (error.message?.includes('já existe') || error.message?.includes('Use PUT')) {
        toast.error(
          `${clienteNome} já possui uma anamnese. Use o botão "Editar" para atualizar.`,
          { duration: 5000, icon: '⚠️' }
        )
      } else {
        toast.error(error.message || 'Erro ao processar anamnese')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setClienteId('')
    setClienteNome('')
    setBuscaCliente('')
  }

  const isEditing = !!editingAnamnese

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { resetForm(); onClose(); }} 
      title={isEditing ? "Editar Anamnese" : "Nova Anamnese"} 
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center py-3">
          <FileText className="w-12 h-12 text-pink-600 mx-auto mb-3" />
          <p className="text-sm text-gray-700">
            {isEditing 
              ? 'Editando ficha de anamnese' 
              : 'Selecione o cliente para criar uma nova ficha de anamnese'}
          </p>
        </div>

        {/* Busca de Cliente */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            <Search className="w-3.5 h-3.5 inline mr-1" />
            Buscar Cliente *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={buscaCliente || clienteNome}
              onChange={(e) => {
                if (isEditing) return // Não permitir mudança ao editar
                setBuscaCliente(e.target.value)
                setShowClientesList(true)
                setClienteId('')
                setClienteNome('')
              }}
              onFocus={() => !isEditing && setShowClientesList(true)}
              placeholder="Digite nome, email ou telefone..."
              disabled={isEditing}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-sm text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Lista de clientes */}
          {showClientesList && (buscaCliente || !clienteId) && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowClientesList(false)} />
              <div className="absolute z-20 w-full mt-2 bg-white border-2 border-pink-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map(cliente => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => {
                        setClienteId(cliente.id)
                        setClienteNome(cliente.name)
                        setBuscaCliente('')
                        setShowClientesList(false)
                      }}
                      className="w-full px-3 py-2.5 hover:bg-pink-50 transition-colors text-left border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">{cliente.name}</div>
                          <div className="text-xs text-gray-500 truncate">{cliente.email}</div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {cliente.hasAnamnese && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium flex-shrink-0">
                              Já tem
                            </span>
                          )}
                          {cliente.hasSubscription && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium flex-shrink-0">
                              Plano
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>
            </>
          )}

          {clienteId && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-green-900 truncate">{clienteNome}</div>
                  {!isEditing && clientes.find(c => c.id === clienteId)?.hasAnamnese && (
                    <div className="text-xs text-orange-700 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Cliente já possui anamnese
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-800">
            <strong>Nota:</strong> {isEditing 
              ? 'As informações da anamnese serão atualizadas. O email do cliente será preenchido automaticamente.'
              : 'Uma anamnese inicial será criada. O cliente poderá preenchê-la completamente pelo app ou você pode editar manualmente.'}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => { resetForm(); onClose(); }} 
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            className="flex-1"
            disabled={!clienteId || loading}
          >
            {loading 
              ? (isEditing ? 'Atualizando...' : 'Criando...') 
              : (isEditing ? 'Atualizar Anamnese' : 'Criar Anamnese')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

