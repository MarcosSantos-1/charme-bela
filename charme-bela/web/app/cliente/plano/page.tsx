'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { Button } from '@/components/Button'
import { Sparkles, Check, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import * as api from '@/lib/api'
import { Plan } from '@/types'
import toast from 'react-hot-toast'

export default function PlanoPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { subscription, hasSubscription, remainingTreatments, cancelSubscription } = useSubscription(user?.id)
  
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<Plan | null>(null)

  // Buscar todos os planos
  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await api.getPlans()
        setPlans(data)
      } catch (error) {
        console.error('Erro ao carregar planos:', error)
        toast.error('Erro ao carregar planos')
      } finally {
        setLoading(false)
      }
    }
    loadPlans()
  }, [])

  const handleCancelSubscription = async () => {
    if (!subscription) return
    
    try {
      const result = await cancelSubscription('Cliente solicitou cancelamento')
      setShowCancelModal(false)
      
      // Mostra mensagem sobre acesso restante
      toast.success(
        `Plano cancelado. Você pode usar até ${subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('pt-BR') : 'o fim do ciclo'}`,
        { duration: 6000 }
      )
      
      // Aguarda um pouco para o usuário ler a mensagem
      setTimeout(() => {
        router.push('/cliente')
      }, 1000)
    } catch (error: any) {
      // Erro já tratado no hook
      console.error('Erro ao cancelar:', error)
    }
  }
  
  // Verificar se pode cancelar (3 meses de compromisso)
  const canCancelPlan = () => {
    if (!subscription?.minimumCommitmentEnd) return true
    return new Date() >= new Date(subscription.minimumCommitmentEnd)
  }
  
  // Calcular quando poderá cancelar
  const getMonthsUntilCancel = () => {
    if (!subscription?.minimumCommitmentEnd) return 0
    const now = new Date()
    const end = new Date(subscription.minimumCommitmentEnd)
    if (now >= end) return 0
    
    const months = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
    return months
  }

  const handleUpgrade = async (planId: string) => {
    try {
      // Criar nova assinatura (substitui a antiga)
      await api.createSubscription({
        userId: user!.id,
        planId
      })
      toast.success('Plano atualizado com sucesso! 🎉')
      setSelectedPlanForUpgrade(null)
      // Recarrega página
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar plano')
    }
  }

  // Formatar data de próxima cobrança
  const getNextBillingDate = () => {
    if (!subscription?.startDate) return '-'
    const start = new Date(subscription.startDate)
    const next = new Date(start)
    next.setMonth(next.getMonth() + 1)
    return next.toLocaleDateString('pt-BR')
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Meu Plano">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
            </div>
          ) : hasSubscription && subscription ? (
            <>
              {/* Current Plan Card */}
              <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <Sparkles className="w-8 h-8" />
                  <span className={`px-3 py-1 backdrop-blur-sm rounded-full text-xs font-medium ${
                    subscription.status === 'ACTIVE' ? 'bg-green-500/30' : 'bg-red-500/30'
                  }`}>
                    {subscription.status === 'ACTIVE' ? 'Ativo' : subscription.status}
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-1">{subscription.plan.name}</h2>
                <p className="text-pink-100 text-sm mb-6">R$ {subscription.plan.price.toFixed(2)} / mês</p>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                  <div className="text-sm text-pink-100 mb-2">Tratamentos usados este mês</div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all" 
                        style={{ 
                          width: `${((subscription.currentMonthUsage?.totalTreatments || 0) / subscription.plan.maxTreatmentsPerMonth) * 100}%` 
                        }} 
                      />
                    </div>
                    <div className="text-xl font-bold">
                      {subscription.currentMonthUsage?.totalTreatments || 0}/{subscription.plan.maxTreatmentsPerMonth}
                    </div>
                  </div>
                  <div className="text-xs text-pink-200 mt-2">
                    Restam: {remainingTreatments} tratamentos
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-pink-100">Próxima cobrança</span>
                  <span className="font-semibold">{getNextBillingDate()}</span>
                </div>
              </div>

              {/* Plan Benefits - Serviços Inclusos */}
              <div className="bg-white rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Serviços Inclusos ({subscription.plan.services.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {subscription.plan.services.map((service) => (
                    <div key={service.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium">{service.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            service.category === 'FACIAL' ? 'bg-pink-100 text-pink-700' :
                            service.category === 'MASSAGEM' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {service.category}
                          </span>
                          <span className="text-xs text-gray-500">{service.duration}min</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Usuário sem assinatura - mostrar planos disponíveis */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Você ainda não tem um plano ativo
              </h3>
              <p className="text-gray-600 mb-6">
                Escolha um plano abaixo para começar a aproveitar nossos tratamentos!
              </p>
            </div>
          )}

          {/* Todos os Planos Disponíveis */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">
              {hasSubscription ? 'Outros Planos Disponíveis' : 'Escolha seu Plano'}
            </h3>
            <div className="space-y-4">
              {plans.map((plan) => {
                const isCurrent = subscription?.plan.id === plan.id
                const tierBadges = {
                  BRONZE: '🥉 Plano Inicial',
                  SILVER: '🥈 Mais Popular',
                  GOLD: '🥇 Completo'
                }

                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-2xl p-6 border-2 ${
                      isCurrent ? 'border-pink-500' : 'border-gray-200'
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isCurrent
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {isCurrent ? 'Seu Plano Atual' : tierBadges[plan.tier]}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                    {/* Informações do plano */}
                    <div className="bg-pink-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">Tratamentos inclusos:</span>
                        <span className="font-bold text-pink-600">{plan.maxTreatmentsPerMonth} por mês</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-700">Serviços disponíveis:</span>
                        <span className="font-bold text-pink-600">{plan.services.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-700">Limite diário:</span>
                        <span className="font-bold text-pink-600">Até 3 tratamentos</span>
                      </div>
                    </div>

                    {/* Lista resumida de serviços */}
                    <details className="mb-4">
                      <summary className="cursor-pointer text-sm font-medium text-pink-600 hover:text-pink-700">
                        Ver todos os {plan.services.length} serviços inclusos
                      </summary>
                      <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                        {plan.services.map((service) => (
                          <div key={service.id} className="flex items-center space-x-2 text-xs">
                            <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                            <span className="text-gray-700">{service.name}</span>
                          </div>
                        ))}
                      </div>
                    </details>

                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        Plano Atual
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => setSelectedPlanForUpgrade(plan)}
                      >
                        {hasSubscription ? 'Alterar para este Plano' : 'Assinar Agora'}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Danger Zone - Só aparece se tiver assinatura */}
          {hasSubscription && subscription && (
            <div className="bg-white rounded-2xl p-6 border-2 border-red-200">
              <div className="flex items-start space-x-3 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Cancelar assinatura</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Você perderá acesso aos benefícios do seu plano.
                  </p>
                  {subscription.minimumCommitmentEnd && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ Compromisso mínimo até: {new Date(subscription.minimumCommitmentEnd).toLocaleDateString('pt-BR')}
                    </p>
                  )}
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
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && subscription && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl p-6">
              {canCancelPlan() ? (
                /* Pode cancelar */
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Cancelar Assinatura?</h2>
                    <p className="text-gray-600 mb-4">
                      Você perderá acesso aos {subscription.plan.services.length} tratamentos inclusos no plano {subscription.plan.name}.
                    </p>
                    
                    {/* Info sobre acesso restante */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-left">
                      <p className="text-sm text-blue-900">
                        <strong>📅 Importante:</strong> Você ainda poderá usar seu plano até <strong>{getNextBillingDate()}</strong> (fim do período já pago).
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        Após essa data, seu plano será encerrado e você voltará ao status "sem plano".
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                      onClick={handleCancelSubscription}
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
                </>
              ) : (
                /* NÃO pode cancelar - compromisso mínimo não cumprido */
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Não é Possível Cancelar</h2>
                    <p className="text-gray-600 mb-4">
                      Você ainda está no período de compromisso mínimo de 3 meses do Charme & Bela Club.
                    </p>
                    
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded text-left">
                      <p className="text-sm text-orange-900">
                        <strong>📅 Compromisso até:</strong><br />
                        {subscription.minimumCommitmentEnd && new Date(subscription.minimumCommitmentEnd).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-xs text-orange-700 mt-2">
                        Faltam aproximadamente <strong>{getMonthsUntilCancel()} mês(es)</strong> para você poder cancelar.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => setShowCancelModal(false)}
                  >
                    Entendi
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Upgrade/Subscribe Modal */}
        {selectedPlanForUpgrade && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl p-6">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedPlanForUpgrade.tier === 'GOLD' ? 'bg-purple-100' :
                  selectedPlanForUpgrade.tier === 'SILVER' ? 'bg-pink-100' :
                  'bg-blue-100'
                }`}>
                  <Sparkles className={`w-8 h-8 ${
                    selectedPlanForUpgrade.tier === 'GOLD' ? 'text-purple-600' :
                    selectedPlanForUpgrade.tier === 'SILVER' ? 'text-pink-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {hasSubscription ? 'Alterar para' : 'Assinar'} {selectedPlanForUpgrade.name}
                </h2>
                <p className="text-gray-600 mb-4">
                  Acesso a {selectedPlanForUpgrade.services.length} tratamentos e {selectedPlanForUpgrade.maxTreatmentsPerMonth} sessões por mês!
                </p>
                <div className={`rounded-xl p-4 ${
                  selectedPlanForUpgrade.tier === 'GOLD' ? 'bg-purple-50' :
                  selectedPlanForUpgrade.tier === 'SILVER' ? 'bg-pink-50' :
                  'bg-blue-50'
                }`}>
                  <div className="text-sm text-gray-600">Valor mensal</div>
                  <div className={`text-3xl font-bold ${
                    selectedPlanForUpgrade.tier === 'GOLD' ? 'text-purple-600' :
                    selectedPlanForUpgrade.tier === 'SILVER' ? 'text-pink-600' :
                    'text-blue-600'
                  }`}>
                    R$ {selectedPlanForUpgrade.price.toFixed(2)}
                  </div>
                  {hasSubscription && subscription && (
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedPlanForUpgrade.price > subscription.plan.price 
                        ? `Diferença de +R$ ${(selectedPlanForUpgrade.price - subscription.plan.price).toFixed(2)}/mês`
                        : `Economia de R$ ${(subscription.plan.price - selectedPlanForUpgrade.price).toFixed(2)}/mês`
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleUpgrade(selectedPlanForUpgrade.id)}
                >
                  {hasSubscription ? 'Confirmar Alteração' : 'Confirmar Assinatura'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedPlanForUpgrade(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </ClientLayout>
    </ProtectedRoute>
  )
}

