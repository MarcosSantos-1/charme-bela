'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Button } from '@/components/Button'
import { ArrowLeft, Sparkles, Check, X, AlertCircle, Calendar, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function PlanoPage() {
  const router = useRouter()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Mock data - usuário tem plano Plus
  const currentPlan = {
    name: 'Plus Care',
    price: 249.90,
    sessionsUsed: 2,
    sessionsTotal: 4,
    status: 'active',
    nextBilling: '15/Nov/2025'
  }

  const plans = [
    {
      id: 'essencial',
      name: 'Essencial Beauty',
      price: 149.90,
      badge: '',
      features: [
        'Até 4 procedimentos por mês',
        'Limpeza de pele',
        'Máscara de LED',
        'Peeling de diamante',
        'Drenagem linfática',
        'Massagens relaxantes',
        'Tratamentos corporais básicos'
      ],
      unavailable: [
        'Radiofrequência',
        'Microagulhamento',
        'Tratamentos premium'
      ]
    },
    {
      id: 'plus',
      name: 'Plus Care',
      price: 249.90,
      badge: 'Seu Plano Atual',
      current: true,
      features: [
        'Tudo do Plano Essencial',
        'Até 4 procedimentos por mês',
        'Radiofrequência facial e corporal',
        'Jato de plasma',
        'Tratamento para acne',
        'Massagem modeladora',
        'Tratamento para celulite'
      ],
      unavailable: [
        'Microagulhamento',
        'Peeling químico',
        'Hidrolipoclasia'
      ]
    },
    {
      id: 'premium',
      name: 'Premium Experience',
      price: 399.90,
      badge: 'Mais Completo',
      features: [
        'Tudo dos Planos anteriores',
        'Até 4 procedimentos por mês',
        'Microagulhamento',
        'Peeling químico',
        'Skinbooster',
        'Hidrolipoclasia',
        'Lipo sem corte',
        'Mix de massagens'
      ],
      unavailable: []
    }
  ]

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Gerenciar Plano</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-20">
          {/* Current Plan Card */}
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <Sparkles className="w-8 h-8" />
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                {currentPlan.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-1">{currentPlan.name}</h2>
            <p className="text-pink-100 text-sm mb-6">R$ {currentPlan.price.toFixed(2)} / mês</p>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
              <div className="text-sm text-pink-100 mb-2">Sessões usadas este mês</div>
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${(currentPlan.sessionsUsed / currentPlan.sessionsTotal) * 100}%` }} 
                  />
                </div>
                <div className="text-xl font-bold">{currentPlan.sessionsUsed}/{currentPlan.sessionsTotal}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-pink-100">Próxima cobrança</span>
              <span className="font-semibold">{currentPlan.nextBilling}</span>
            </div>
          </div>

          {/* Plan Benefits */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Benefícios do seu plano</h3>
            <div className="space-y-3">
              {plans.find(p => p.id === 'plus')?.features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Options */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Outros Planos Disponíveis</h3>
            <div className="space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-6 border-2 ${
                    plan.current ? 'border-pink-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{plan.name}</h4>
                      <p className="text-2xl font-bold text-pink-600 mt-1">
                        R$ {plan.price.toFixed(2)}
                        <span className="text-sm text-gray-600 font-normal"> / mês</span>
                      </p>
                    </div>
                    {plan.badge && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        plan.current
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {plan.unavailable.length > 0 && (
                      <>
                        {plan.unavailable.map((feature, index) => (
                          <div key={`unavailable-${index}`} className="flex items-start space-x-2">
                            <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-500">{feature}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {plan.current ? (
                    <Button variant="outline" className="w-full" disabled>
                      Plano Atual
                    </Button>
                  ) : plan.id === 'premium' ? (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      Fazer Upgrade
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full">
                      Fazer Downgrade
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl p-6 border-2 border-red-200">
            <div className="flex items-start space-x-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Cancelar assinatura</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Você perderá acesso aos benefícios do seu plano ao final do período de faturamento atual.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setShowCancelModal(true)}
            >
              Cancelar Plano
            </Button>
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Cancelar Assinatura?</h2>
                <p className="text-gray-600">
                  Você perderá acesso aos tratamentos inclusos no seu plano. Tem certeza?
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => {
                    toast.success('Assinatura cancelada com sucesso!', {
                      duration: 3000,
                      icon: '✅'
                    })
                    setShowCancelModal(false)
                  }}
                >
                  Sim, cancelar plano
                </Button>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setShowCancelModal(false)}
                >
                  Manter meu plano
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade para Premium</h2>
                <p className="text-gray-600 mb-4">
                  Você terá acesso imediato a todos os tratamentos premium!
                </p>
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="text-sm text-gray-600">Novo valor mensal</div>
                  <div className="text-3xl font-bold text-purple-600">R$ 399,90</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Diferença de R$ 150,00/mês
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    toast.success('Upgrade realizado com sucesso! 🎉', {
                      duration: 3000,
                      style: {
                        background: '#a855f7',
                        color: '#fff',
                        fontWeight: '600',
                      }
                    })
                    setShowUpgradeModal(false)
                  }}
                >
                  Confirmar Upgrade
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

