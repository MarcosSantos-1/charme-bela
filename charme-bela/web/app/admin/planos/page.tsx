'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Search, Star, Calendar, X } from 'lucide-react'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string
  email: string
  subscription?: any
}

interface Plan {
  id: string
  name: string
  tier: string
  price: number
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

    setActivating(true)
    try {
      // Criar assinatura
      const now = new Date()
      const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

      await api.createSubscription({
        userId: selectedUser.id,
        planId: selectedPlan,
        status: 'ACTIVE',
        startDate: now.toISOString(),
        endDate: oneYear.toISOString(),
        minimumCommitmentEnd: threeMonths.toISOString()
      })

      toast.success('Plano ativado com sucesso!')
      setShowModal(false)
      loadData()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error(error.message || 'Erro ao ativar plano')
    } finally {
      setActivating(false)
    }
  }

  const handleCancelPlan = async (userId: string, subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar o plano deste cliente?')) return

    try {
      await api.cancelSubscription(subscriptionId, 'Cancelado pelo admin')
      toast.success('Plano cancelado')
      loadData()
    } catch (error: any) {
      console.error('Erro:', error)
      toast.error('Erro ao cancelar plano')
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
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Planos</h2>
        <p className="text-gray-600 mt-1">Ative e gerencie assinaturas dos clientes</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const hasPlan = user.subscription?.status === 'ACTIVE'
            
            return (
              <div key={user.id} className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-pink-600 font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base truncate">{user.name}</h3>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      </div>
                    </div>
                    
                    {/* Plan Status */}
                    <div className="ml-13">
                      {hasPlan ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ✓ Plano {user.subscription.plan.name}
                          </span>
                          <p className="text-xs text-gray-500">
                            Válido até {new Date(user.subscription.endDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          Sem plano ativo
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 sm:flex-shrink-0">
                    {hasPlan ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelPlan(user.id, user.subscription.id)}
                        className="text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-initial"
                      >
                        <X className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Cancelar Plano</span>
                        <span className="sm:hidden">Cancelar</span>
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleActivatePlan(user)}
                        className="flex-1 sm:flex-initial"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Ativar Plano
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Ativar Plano */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Ativar Plano</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-1">Cliente:</p>
              <p className="font-semibold text-gray-900">{selectedUser.name}</p>
              <p className="text-sm text-gray-600">{selectedUser.email}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Selecione o Plano:
              </label>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedPlan === plan.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        <p className="text-sm text-gray-600">{plan.tier}</p>
                      </div>
                      <p className="text-lg font-bold text-pink-600">
                        R$ {plan.price.toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-blue-800">
                <Calendar className="w-3 h-3 inline mr-1" />
                <strong>Duração:</strong> 1 ano (365 dias)
                <br />
                <strong>Fidelidade:</strong> 3 meses
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowModal(false)}
                disabled={activating}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="flex-1"
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
    </div>
  )
}

