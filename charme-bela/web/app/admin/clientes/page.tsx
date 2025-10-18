'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Plus, Mail, Phone, Calendar, MoreVertical, Sparkles, Gift, Loader2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdicionarClienteModal } from '@/components/admin/AdicionarClienteModal'
import { DarVoucherModal } from '@/components/admin/DarVoucherModal'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  totalAppointments: number
  lastVisit: string
  status: 'active' | 'inactive'
  hasSubscription: boolean
  subscriptionPlan?: string
  createdAt?: string
}

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdicionarClienteOpen, setIsAdicionarClienteOpen] = useState(false)
  const [isDarVoucherOpen, setIsDarVoucherOpen] = useState(false)
  const [isEditarClienteOpen, setIsEditarClienteOpen] = useState(false)
  const [selectedClientForVoucher, setSelectedClientForVoucher] = useState<{id: string, name: string} | null>(null)
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    try {
      const users = await api.getUsers({ role: 'CLIENT' })
      
      // Transformar dados do backend para o formato local
      const clientsData = await Promise.all(users.map(async (user) => {
        // Buscar agendamentos do cliente
        let totalAppointments = 0
        let lastVisitDate = 'Nunca'
        
        try {
          const userAppointments = await api.getAppointments({ userId: user.id })
          totalAppointments = userAppointments.length
          
          // Pegar a última visita (agendamento mais recente concluído)
          const completedAppts = userAppointments
            .filter(apt => apt.status === 'COMPLETED')
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          
          if (completedAppts.length > 0) {
            lastVisitDate = format(new Date(completedAppts[0].startTime), 'dd/MM/yyyy')
          }
        } catch (error) {
          console.error(`Erro ao buscar agendamentos do cliente ${user.id}:`, error)
        }
        
        return {
          id: user.id,
          name: user.name, // Já vem correto do backend
          email: user.email,
          phone: user.phone || 'Não informado',
          totalAppointments,
          lastVisit: lastVisitDate,
          status: user.isActive ? 'active' as const : 'inactive' as const,
          hasSubscription: user.subscription?.status === 'ACTIVE',
          subscriptionPlan: user.subscription?.plan?.name,
          createdAt: (user as any).createdAt
        }
      }))
      
      setClients(clientsData)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar clientes
  const filteredClients = clients.filter(client =>
    searchTerm === '' ||
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  )

  // Calcular novos clientes este mês
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const novosEsteMes = clients.filter(client => {
    if (!client.createdAt) return false
    const createdDate = new Date(client.createdAt)
    return createdDate >= currentMonthStart
  }).length

  const handleToggleStatus = async (clientId: string, currentStatus: boolean) => {
    try {
      await api.updateUser(clientId, { isActive: !currentStatus })
      toast.success(currentStatus ? 'Cliente inativado' : 'Cliente ativado')
      loadClients()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status do cliente')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-gray-600 mt-1">Gerencie seus clientes e acessos</p>
        </div>

        <Button 
          variant="primary"
          onClick={() => setIsAdicionarClienteOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <Button variant="outline">
          <Filter className="w-5 h-5 mr-2" />
          Filtros
        </Button>

        <Button 
          variant="secondary"
          onClick={() => setIsDarVoucherOpen(true)}
        >
          <Gift className="w-5 h-5 mr-2" />
          Dar Voucher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total de Clientes</div>
          <div className="text-3xl font-bold text-gray-900">{clients.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Clientes Ativos</div>
          <div className="text-3xl font-bold text-green-600">
            {clients.filter(c => c.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Novos Este Mês</div>
          <div className="text-3xl font-bold text-pink-600">{novosEsteMes}</div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">Carregando clientes...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Agendamentos
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Última Visita
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-pink-600 font-semibold">
                          {client.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{client.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {client.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {client.hasSubscription ? (
                      <div className="flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                        <div>
                          <div className="text-sm font-medium text-purple-700">
                            {client.subscriptionPlan}
                          </div>
                          <div className="text-xs text-gray-500">Assinante</div>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Sem plano
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 text-pink-600 text-sm font-bold">
                      {client.totalAppointments}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {client.lastVisit}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                        client.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {client.status === 'active' ? '✓ Ativo' : '✗ Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === client.id ? null : client.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                      
                      {openMenuId === client.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-[100]" 
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border-2 border-gray-200 z-[101]">
                            <button
                              onClick={() => {
                                handleToggleStatus(client.id, client.status === 'active')
                                setOpenMenuId(null)
                              }}
                              className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 first:rounded-t-xl transition-colors ${
                                client.status === 'active' ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {client.status === 'active' ? '🔒 Inativar Conta' : '✅ Ativar Conta'}
                            </button>
                            <div className="border-t border-gray-100"></div>
                            <button
                              onClick={() => {
                                setSelectedClientForEdit(client)
                                setIsEditarClienteOpen(true)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              ✏️ Editar Cliente
                            </button>
                            <div className="border-t border-gray-100"></div>
                            <button
                              onClick={() => {
                                setSelectedClientForVoucher({ id: client.id, name: client.name })
                                setIsDarVoucherOpen(true)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-3 text-left text-sm font-medium text-purple-600 hover:bg-purple-50 last:rounded-b-xl transition-colors"
                            >
                              🎁 Dar Voucher
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-medium">{filteredClients.length}</span> de{' '}
            <span className="font-medium">{clients.length}</span> resultados
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próximo
            </Button>
          </div>
        </div>
          </div>
        </>
      )}

      {/* Modais */}
      <AdicionarClienteModal 
        isOpen={isAdicionarClienteOpen}
        onClose={() => {
          setIsAdicionarClienteOpen(false)
          loadClients() // Recarregar após adicionar cliente
        }}
      />

      <AdicionarClienteModal 
        isOpen={isEditarClienteOpen}
        onClose={() => {
          setIsEditarClienteOpen(false)
          setSelectedClientForEdit(null)
          loadClients()
        }}
        editingClient={selectedClientForEdit}
      />
      
      <DarVoucherModal 
        isOpen={isDarVoucherOpen}
        onClose={() => {
          setIsDarVoucherOpen(false)
          setSelectedClientForVoucher(null)
        }}
        preSelectedClient={selectedClientForVoucher}
      />
    </div>
  )
}

