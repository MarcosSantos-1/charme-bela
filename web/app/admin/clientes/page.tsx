'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Mail, Phone, Calendar, MoreVertical, Sparkles, Gift, Loader2, User, Users, TrendingUp } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdicionarClienteModal } from '@/components/admin/AdicionarClienteModal'
import { DarVoucherModal } from '@/components/admin/DarVoucherModal'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

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

// Mobile Client Card Component
function ClientCard({ 
  client, 
  onToggleStatus, 
  onEdit, 
  onGiveVoucher 
}: { 
  client: Client
  onToggleStatus: (id: string, currentStatus: boolean) => void
  onEdit: (client: Client) => void
  onGiveVoucher: (id: string, name: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-md transition-all">
      {/* Header with avatar and menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-pink-600 font-bold text-lg">
              {client.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{client.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                  client.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {client.status === 'active' ? '✓ Ativo' : '✗ Inativo'}
              </span>
              {client.hasSubscription && (
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                  client.subscriptionPlan?.toLowerCase().includes('ouro')
                    ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300'
                    : client.subscriptionPlan?.toLowerCase().includes('prata')
                    ? 'bg-gradient-to-r from-gray-100 to-slate-200 text-slate-700 border border-gray-300'
                    : client.subscriptionPlan?.toLowerCase().includes('bronze')
                    ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  {client.subscriptionPlan}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-[100]" 
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border-2 border-gray-200 z-[101]">
                <button
                  onClick={() => {
                    onToggleStatus(client.id, client.status === 'active')
                    setMenuOpen(false)
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 first:rounded-t-xl transition-colors ${
                    client.status === 'active' ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {client.status === 'active' ? '🔒 Inativar' : '✅ Ativar'}
                </button>
                <div className="border-t border-gray-100"></div>
                <button
                  onClick={() => {
                    onEdit(client)
                    setMenuOpen(false)
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ✏️ Editar
                </button>
                <div className="border-t border-gray-100"></div>
                <button
                  onClick={() => {
                    onGiveVoucher(client.id, client.name)
                    setMenuOpen(false)
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-purple-600 hover:bg-purple-50 last:rounded-b-xl transition-colors"
                >
                  🎁 Dar Voucher
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          {client.phone}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
          <span className="text-xs">Última: {client.lastVisit}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Agendamentos:</span>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-pink-100 text-pink-600 text-sm font-bold">
            {client.totalAppointments}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const router = useRouter()
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

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
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

        <Button 
          variant="secondary"
          onClick={() => setIsDarVoucherOpen(true)}
          className="whitespace-nowrap"
        >
          <Gift className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline">Dar Voucher</span>
          <span className="sm:hidden">Voucher</span>
        </Button>
      </div>

      {/* Stats - Grid de 3 colunas mesmo em mobile */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">{clients.length}</div>
          <div className="text-[10px] sm:text-sm font-medium text-blue-600">Total</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-green-700 mb-1">
            {clients.filter(c => c.status === 'active').length}
          </div>
          <div className="text-[10px] sm:text-sm font-medium text-green-600">Ativos</div>
        </div>
        
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl border-2 border-pink-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-pink-700 mb-1">{novosEsteMes}</div>
          <div className="text-[10px] sm:text-sm font-medium text-pink-600">Novos</div>
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
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredClients.map((client) => (
              <ClientCard 
                key={client.id}
                client={client}
                onToggleStatus={handleToggleStatus}
                onEdit={(client) => {
                  setSelectedClientForEdit(client)
                  setIsEditarClienteOpen(true)
                }}
                onGiveVoucher={(id, name) => {
                  setSelectedClientForVoucher({ id, name })
                  setIsDarVoucherOpen(true)
                }}
              />
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200">
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
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                          client.subscriptionPlan?.toLowerCase().includes('ouro')
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                            : client.subscriptionPlan?.toLowerCase().includes('prata')
                            ? 'bg-gradient-to-br from-gray-300 to-slate-400'
                            : client.subscriptionPlan?.toLowerCase().includes('bronze')
                            ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                            : 'bg-purple-500'
                        }`}>
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${
                            client.subscriptionPlan?.toLowerCase().includes('ouro')
                              ? 'text-yellow-700'
                              : client.subscriptionPlan?.toLowerCase().includes('prata')
                              ? 'text-slate-600'
                              : client.subscriptionPlan?.toLowerCase().includes('bronze')
                              ? 'text-orange-700'
                              : 'text-purple-700'
                          }`}>
                            {client.subscriptionPlan}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Assinante</div>
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
                        onClick={(e) => {
                          const buttonRect = e.currentTarget.getBoundingClientRect()
                          const spaceBelow = window.innerHeight - buttonRect.bottom
                          const menuHeight = 180 // approximate height of menu
                          
                          // Store if should open upward
                          const shouldOpenUp = spaceBelow < menuHeight
                          e.currentTarget.dataset.openUp = shouldOpenUp.toString()
                          
                          setOpenMenuId(openMenuId === client.id ? null : client.id)
                        }}
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
                          <div className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-xl shadow-xl border-2 border-gray-200 z-[101]">
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
            <span className="font-medium">{clients.length}</span> cliente{clients.length !== 1 ? 's' : ''}
          </div>
        </div>
          </div>

          {/* Mobile results count */}
          <div className="lg:hidden text-center text-sm text-gray-600 py-4">
            Mostrando <span className="font-medium">{filteredClients.length}</span> de{' '}
            <span className="font-medium">{clients.length}</span> cliente{clients.length !== 1 ? 's' : ''}
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
        onVoucherCreated={() => {
          setIsDarVoucherOpen(false)
          setSelectedClientForVoucher(null)
          router.push('/admin/vouchers')
        }}
      />
    </div>
  )
}

