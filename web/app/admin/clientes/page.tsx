'use client'

import { useState, useEffect, useRef } from 'react'
import {
  RiSearchLine,
  RiAddLine,
  RiMailFill,
  RiPhoneFill,
  RiCalendar2Fill,
  RiMore2Fill,
  RiSparklingFill,
  RiGiftFill,
  RiLoader4Line,
  RiUser3Fill,
  RiTeamFill,
  RiLineChartFill,
  RiEdit2Fill,
  RiLockFill,
  RiLockUnlockFill,
} from 'react-icons/ri'
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
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs hover:border-rose-300 transition-all">
      {/* Header with avatar and menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 bg-rose-100 text-rose-600 font-extrabold text-base rounded-2xl flex items-center justify-center shrink-0 border border-rose-200 shadow-xs">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">{client.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span
                className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${
                  client.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {client.status === 'active' ? '✓ Ativa' : '✗ Inativa'}
              </span>
              {client.hasSubscription && (
                <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full ${
                  client.subscriptionPlan?.toLowerCase().includes('ouro')
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : client.subscriptionPlan?.toLowerCase().includes('prata')
                    ? 'bg-slate-100 text-slate-800 border border-slate-300'
                    : client.subscriptionPlan?.toLowerCase().includes('bronze')
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : 'bg-violet-100 text-violet-800 border border-violet-200'
                }`}>
                  <RiSparklingFill className="w-3 h-3 mr-1 text-amber-500" />
                  {client.subscriptionPlan}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
            aria-label="Opções"
          >
            <RiMore2Fill className="w-5 h-5" />
          </button>

          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-[100]" 
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border-2 border-slate-200 z-[101] overflow-hidden py-1">
                <button
                  onClick={() => {
                    onToggleStatus(client.id, client.status === 'active')
                    setMenuOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                    client.status === 'active' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {client.status === 'active' ? <RiLockFill className="w-4 h-4" /> : <RiLockUnlockFill className="w-4 h-4" />}
                  {client.status === 'active' ? 'Inativar Conta' : 'Ativar Conta'}
                </button>
                <div className="border-t border-slate-100"></div>
                <button
                  onClick={() => {
                    onEdit(client)
                    setMenuOpen(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <RiEdit2Fill className="w-4 h-4 text-slate-500" />
                  Editar Dados
                </button>
                <div className="border-t border-slate-100"></div>
                <button
                  onClick={() => {
                    onGiveVoucher(client.id, client.name)
                    setMenuOpen(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-violet-600 hover:bg-violet-50 transition-colors flex items-center gap-2"
                >
                  <RiGiftFill className="w-4 h-4 text-violet-500" />
                  Dar Voucher
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1.5 mb-3 bg-slate-50 p-2.5 rounded-xl text-xs font-semibold text-slate-700">
        <div className="flex items-center">
          <RiMailFill className="w-3.5 h-3.5 mr-2 text-rose-500 shrink-0" />
          <span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center">
          <RiPhoneFill className="w-3.5 h-3.5 mr-2 text-rose-500 shrink-0" />
          <span>{client.phone}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center text-xs font-semibold text-slate-500">
          <RiCalendar2Fill className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
          <span>Última: <strong className="text-slate-800">{client.lastVisit}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-semibold">Agendamentos:</span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-extrabold">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Clientes</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">Gerencie suas clientes, assinaturas e histórico</p>
        </div>

        <Button 
          variant="primary"
          onClick={() => setIsAdicionarClienteOpen(true)}
          className="shadow-xs"
        >
          <RiAddLine className="w-4 h-4 mr-1.5" />
          Nova Cliente
        </Button>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1 relative">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white touch-manipulation"
          />
        </div>

        <Button 
          variant="secondary"
          onClick={() => setIsDarVoucherOpen(true)}
          className="whitespace-nowrap font-bold"
        >
          <RiGiftFill className="w-4 h-4 mr-1.5 text-violet-500" />
          <span>Dar Voucher</span>
        </Button>
      </div>

      {/* Stats - Grid de 3 colunas mesmo em mobile */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-3.5 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <RiUser3Fill className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-xl sm:text-3xl font-extrabold mb-0.5">{clients.length}</div>
          <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide">Total</div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-3.5 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <RiTeamFill className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-xl sm:text-3xl font-extrabold mb-0.5">
            {clients.filter(c => c.status === 'active').length}
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide">Ativas</div>
        </div>
        
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-3.5 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <RiLineChartFill className="w-5 h-5 text-white/80" />
          </div>
          <div className="text-xl sm:text-3xl font-extrabold mb-0.5">{novosEsteMes}</div>
          <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide">Novas (Mês)</div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
          <div className="text-center">
            <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
            <p className="text-slate-600 text-xs font-bold">Carregando clientes...</p>
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
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Agendamentos
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Última Visita
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mr-3 font-extrabold text-sm border border-rose-200 shadow-xs">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{client.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-xs font-semibold text-slate-600">
                      <div className="flex items-center">
                        <RiMailFill className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {client.email}
                      </div>
                      <div className="flex items-center">
                        <RiPhoneFill className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {client.hasSubscription ? (
                      <div className="flex items-center">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mr-2.5 shadow-xs ${
                          client.subscriptionPlan?.toLowerCase().includes('ouro')
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                            : client.subscriptionPlan?.toLowerCase().includes('prata')
                            ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white'
                            : client.subscriptionPlan?.toLowerCase().includes('bronze')
                            ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                            : 'bg-violet-600 text-white'
                        }`}>
                          <RiSparklingFill className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={`text-xs font-extrabold ${
                            client.subscriptionPlan?.toLowerCase().includes('ouro')
                              ? 'text-amber-800'
                              : client.subscriptionPlan?.toLowerCase().includes('prata')
                              ? 'text-slate-800'
                              : client.subscriptionPlan?.toLowerCase().includes('bronze')
                              ? 'text-orange-800'
                              : 'text-violet-800'
                          }`}>
                            {client.subscriptionPlan}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Assinante</div>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        Sem plano
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-extrabold">
                      {client.totalAppointments}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-xs font-semibold text-slate-600">
                      <RiCalendar2Fill className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {client.lastVisit}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        client.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {client.status === 'active' ? '✓ Ativa' : '✗ Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          const buttonRect = e.currentTarget.getBoundingClientRect()
                          const spaceBelow = window.innerHeight - buttonRect.bottom
                          const menuHeight = 180
                          const shouldOpenUp = spaceBelow < menuHeight
                          e.currentTarget.dataset.openUp = shouldOpenUp.toString()
                          
                          setOpenMenuId(openMenuId === client.id ? null : client.id)
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                      >
                        <RiMore2Fill className="w-5 h-5" />
                      </button>
                      
                      {openMenuId === client.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-[100]" 
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-xl border-2 border-slate-200 z-[101] overflow-hidden py-1">
                            <button
                              onClick={() => {
                                handleToggleStatus(client.id, client.status === 'active')
                                setOpenMenuId(null)
                              }}
                              className={`w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                                client.status === 'active' ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {client.status === 'active' ? <RiLockFill className="w-4 h-4" /> : <RiLockUnlockFill className="w-4 h-4" />}
                              {client.status === 'active' ? 'Inativar Conta' : 'Ativar Conta'}
                            </button>
                            <div className="border-t border-slate-100"></div>
                            <button
                              onClick={() => {
                                setSelectedClientForEdit(client)
                                setIsEditarClienteOpen(true)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                              <RiEdit2Fill className="w-4 h-4 text-slate-500" />
                              Editar Cliente
                            </button>
                            <div className="border-t border-slate-100"></div>
                            <button
                              onClick={() => {
                                setSelectedClientForVoucher({ id: client.id, name: client.name })
                                setIsDarVoucherOpen(true)
                                setOpenMenuId(null)
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-violet-600 hover:bg-violet-50 transition-colors flex items-center gap-2"
                            >
                              <RiGiftFill className="w-4 h-4 text-violet-500" />
                              Dar Voucher
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
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-xs font-semibold text-slate-600">
            Mostrando <span className="font-extrabold text-slate-900">{filteredClients.length}</span> de{' '}
            <span className="font-extrabold text-slate-900">{clients.length}</span> cliente{clients.length !== 1 ? 's' : ''}
          </div>
        </div>
          </div>

          {/* Mobile results count */}
          <div className="lg:hidden text-center text-xs font-semibold text-slate-500 py-3">
            Mostrando <span className="font-extrabold text-slate-800">{filteredClients.length}</span> de{' '}
            <span className="font-extrabold text-slate-800">{clients.length}</span> clientes
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

