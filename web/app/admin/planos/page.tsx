'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import {
  RiSearchLine,
  RiVipCrownFill,
  RiCloseLine,
  RiLoader4Line,
  RiAlertFill,
} from 'react-icons/ri'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import { useConfirm } from '@/hooks/useConfirm'

interface User {
  id: string
  name: string
  email: string
  subscription?: api.Subscription
}

interface Plan {
  id: string
  name: string
  tier: string
  price: number
}

function isManagerGrant(sub?: api.Subscription | null) {
  if (!sub) return false
  return !sub.asaasSubscriptionId && !sub.stripeSubscriptionId
}

function isCancelInProgress(sub?: api.Subscription | null) {
  if (!sub || sub.status !== 'CANCELED' || !sub.endDate) return false
  return new Date(sub.endDate).getTime() > Date.now()
}

function formatPlanDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 1990) return null
  return date.toLocaleDateString('pt-BR')
}

function planStatusCopy(sub?: api.Subscription | null) {
  if (!sub) {
    return { badge: 'Sem plano ativo', badgeClass: 'bg-slate-100 text-slate-600', detail: null as string | null }
  }

  if (sub.status === 'ACTIVE' && isManagerGrant(sub) && !sub.endDate) {
    return {
      badge: `Plano ativo pelo Gestor · ${sub.plan?.name || ''}`,
      badgeClass: 'bg-slate-800 text-white border border-slate-700',
      detail: 'Sem cobrança e sem validade (concessão administrativa)',
    }
  }

  if (sub.status === 'ACTIVE' && (sub.asaasSubscriptionId || sub.stripeSubscriptionId)) {
    return {
      badge: `Plano Recorrente ativo · ${sub.plan?.name || ''}`,
      badgeClass: 'bg-violet-100 text-violet-800 border border-violet-200',
      detail: 'Recorrência no cartão ativa',
    }
  }

  if (sub.status === 'ACTIVE' && sub.endDate) {
    const until = formatPlanDate(sub.endDate)
    return {
      badge: `Plano ${sub.plan?.name || ''} ativo`,
      badgeClass: 'bg-violet-100 text-violet-800 border border-violet-200',
      detail: until ? `Válido até ${until}` : 'Plano Recorrente ativo',
    }
  }

  if (sub.status === 'PAST_DUE') {
    return {
      badge: `Pagamento em atraso · ${sub.plan?.name || ''}`,
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
      detail: 'Recorrência ainda ativa até regularizar ou cancelar',
    }
  }

  if (isCancelInProgress(sub)) {
    const until = formatPlanDate(sub.endDate)
    return {
      badge: `Em cancelamento · ${sub.plan?.name || ''}`,
      badgeClass: 'bg-orange-100 text-orange-800 border border-orange-200',
      detail: until ? `Acesso até ${until} · recorrência já desligada` : 'Recorrência desligada',
    }
  }

  if (sub.status === 'CANCELED') {
    const when = formatPlanDate(sub.endDate)
    return {
      badge: 'Plano cancelado',
      badgeClass: 'bg-slate-100 text-slate-600',
      detail: when ? `Cancelado em ${when}` : 'Cancelado',
    }
  }

  return {
    badge: 'Sem plano ativo',
    badgeClass: 'bg-slate-100 text-slate-600',
    detail: null,
  }
}

export default function PlanosAdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [activating, setActivating] = useState(false)
  const { confirm, ConfirmDialogComponent } = useConfirm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, plansData] = await Promise.all([
        api.getUsers(),
        api.getPlans()
      ])
      
      setUsers(usersData)
      setPlans(plansData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleActivatePlan = (user: User) => {
    setSelectedUser(user)
    setSelectedPlan('')
    setShowModal(true)
  }

  const handleConfirm = async () => {
    if (!selectedUser || !selectedPlan) {
      toast.error('Selecione um plano')
      return
    }

    const planName = plans.find((item) => item.id === selectedPlan)?.name || 'selecionado'
    const ok = await confirm({
      type: 'warning',
      title: 'Ativar plano pelo Gestor?',
      message:
        `Isso concede o plano ${planName} para ${selectedUser.name} sem pagamento e sem validade — equivalente a um voucher indefinido (uso administrativo). A cliente não será cobrada no cartão.`,
      confirmText: 'Sim, ativar',
      cancelText: 'Voltar',
    })
    if (!ok) return

    setActivating(true)
    try {
      await api.createSubscription({
        userId: selectedUser.id,
        planId: selectedPlan,
      })

      toast.success('Plano ativado pelo Gestor')
      setShowModal(false)
      loadData()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao ativar plano')
    } finally {
      setActivating(false)
    }
  }

  const handleCancelPlan = async (user: User) => {
    const sub = user.subscription
    if (!sub) return

    const paid = Boolean(sub.asaasSubscriptionId || sub.stripeSubscriptionId)
    const ok = await confirm({
      type: 'danger',
      title: paid ? 'Cancelar recorrência do plano?' : 'Desativar plano do Gestor?',
      message: paid
        ? `A cliente ${user.name} continua com acesso até o fim do período já pago (Em cancelamento). A cobrança no cartão será desligada agora — o cartão não pode descontar no mês seguinte.`
        : `O plano de ${user.name} foi concedido pelo Gestor (sem cobrança). A desativação é imediata.`,
      confirmText: paid ? 'Cancelar recorrência' : 'Desativar agora',
      cancelText: 'Voltar',
    })
    if (!ok) return

    try {
      await api.cancelSubscription(user.id, 'Cancelado pelo admin')
      toast.success(paid ? 'Recorrência desligada. Plano em cancelamento.' : 'Plano desativado')
      loadData()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Não foi possível cancelar o plano')
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Gestão de Assinaturas & Planos</h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">Ative, monitore e gerencie planos VIP das clientes</p>
      </div>

      {/* Search */}
      <div className="relative">
        <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar cliente por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
          <div className="text-center">
            <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
            <p className="text-slate-600 text-xs font-bold">Carregando assinaturas...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const sub = user.subscription
            const status = planStatusCopy(sub)
            const canCancel = sub?.status === 'ACTIVE' || sub?.status === 'PAST_DUE'
            const canActivate = !canCancel && !isCancelInProgress(sub)
            
            return (
              <div key={user.id} className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-xs hover:border-rose-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center font-extrabold text-sm border border-rose-200 shrink-0 shadow-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">{user.name}</h3>
                        <p className="text-xs font-semibold text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    {/* Plan Status */}
                    <div className="sm:ml-13">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.badgeClass}`}>
                          <RiVipCrownFill className="w-3.5 h-3.5 text-amber-500" />
                          {status.badge}
                        </span>
                        {status.detail && (
                          <p className="text-[11px] font-semibold text-slate-500">
                            {status.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    {canCancel ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelPlan(user)}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 flex-1 sm:flex-initial text-xs font-bold"
                      >
                        <RiCloseLine className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Cancelar Plano</span>
                        <span className="sm:hidden">Cancelar</span>
                      </Button>
                    ) : canActivate ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleActivatePlan(user)}
                        className="flex-1 sm:flex-initial text-xs font-bold shadow-xs"
                      >
                        <RiVipCrownFill className="w-4 h-4 mr-1 text-amber-300" />
                        Ativar Plano
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Ativar Plano */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 pb-24 sm:pb-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">Ativar Plano VIP</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500">
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cliente</p>
              <p className="font-extrabold text-slate-900 text-sm">{selectedUser.name}</p>
              <p className="text-xs font-semibold text-slate-600">{selectedUser.email}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Selecione o Plano:
              </label>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all ${
                      selectedPlan === plan.id
                        ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-rose-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <RiVipCrownFill className="w-4 h-4 text-amber-500" />
                          {plan.name}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">{plan.tier}</p>
                      </div>
                      <p className="text-base font-extrabold text-rose-600">
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-900 font-semibold">
                <RiAlertFill className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                Ativar por aqui é uma concessão do Gestor: sem pagamento, sem validade e sem recorrência no cartão. Use só em casos administrativos.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-xs font-bold"
                onClick={() => setShowModal(false)}
                disabled={activating}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="flex-1 text-xs font-bold shadow-xs"
                onClick={handleConfirm}
                isLoading={activating}
                disabled={!selectedPlan}
              >
                Ativar Plano
              </Button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialogComponent}
    </div>
  )
}

