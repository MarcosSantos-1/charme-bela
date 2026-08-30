'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { FileText, Search, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'

interface CriarAnamneseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CriarAnamneseModal({ isOpen, onClose, onSuccess }: CriarAnamneseModalProps) {
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [showClientesList, setShowClientesList] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadClientes()
    }
  }, [isOpen])

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
          birthDate: '', // Deixar vazio até cliente/admin preencher
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
      
      toast.success(`Anamnese criada para ${clienteNome}! Você pode editar para preencher os dados.`)
      
      if (onSuccess) onSuccess()
      resetForm()
      onClose()
    } catch (error: any) {
      console.error('❌ Erro ao criar anamnese:', error)
      
      // Mensagem específica se já existir
      if (error.message?.includes('já existe') || error.message?.includes('Use PUT')) {
        toast.error(
          `${clienteNome} já possui uma anamnese. Use o botão "Editar" para atualizar.`,
          { duration: 5000, icon: '⚠️' }
        )
      } else {
        toast.error(error.message || 'Erro ao criar anamnese')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setClienteId('')
    setClienteNome('')
    setBuscaCliente('')
    setShowClientesList(false)
  }

  const isSearchingCliente = showClientesList && !clienteId

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { resetForm(); onClose(); }} 
      title="Nova Anamnese" 
      size="md"
      expanded={isSearchingCliente}
      contentClassName={isSearchingCliente ? 'flex flex-col' : ''}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3">
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
            form="criar-anamnese-form"
            variant="primary" 
            className="flex-1"
            disabled={!clienteId || loading}
          >
            {loading ? 'Criando...' : 'Criar Anamnese'}
          </Button>
        </div>
      }
    >
      <form id="criar-anamnese-form" onSubmit={handleSubmit} className={isSearchingCliente ? 'flex flex-col flex-1 min-h-0 min-w-0 overflow-x-hidden' : 'space-y-4 min-w-0 overflow-x-hidden'}>
        {!isSearchingCliente && (
        <div className="text-center py-3">
          <FileText className="w-12 h-12 text-pink-600 mx-auto mb-3" />
          <p className="text-sm text-gray-700">
            Selecione o cliente para criar uma nova ficha de anamnese
          </p>
        </div>
        )}

        {/* Busca de Cliente */}
        <div className={isSearchingCliente ? 'flex flex-col flex-1 min-h-0 min-w-0' : 'min-w-0'}>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            <Search className="w-3.5 h-3.5 inline mr-1" />
            Buscar Cliente *
          </label>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="busca-cliente"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={buscaCliente || clienteNome}
              onChange={(e) => {
                setBuscaCliente(e.target.value)
                setShowClientesList(true)
                setClienteId('')
                setClienteNome('')
              }}
              onFocus={() => setShowClientesList(true)}
              placeholder="Digite nome ou telefone..."
              className="w-full max-w-full pl-9 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-400 text-base text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {isSearchingCliente && (
            <div className="flex-1 min-h-0 min-w-0 mt-2 border-2 border-pink-200 rounded-xl overflow-y-auto overflow-x-hidden">
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
                    className="w-full max-w-full px-3 py-2.5 hover:bg-pink-50 transition-colors text-left border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{cliente.name}</div>
                        <div className="text-xs text-gray-500 truncate">{cliente.email}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cliente.hasAnamnese && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                            Já tem
                          </span>
                        )}
                        {cliente.hasSubscription && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
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
          )}

          {clienteId && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-green-900 truncate">{clienteNome}</div>
                  {clientes.find(c => c.id === clienteId)?.hasAnamnese && (
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

        {!isSearchingCliente && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-800">
            <strong>Nota:</strong> Uma anamnese inicial será criada com email e telefone do cliente. Use o botão "Editar" para preencher os demais campos.
          </p>
        </div>
        )}
      </form>
    </Modal>
  )
}

