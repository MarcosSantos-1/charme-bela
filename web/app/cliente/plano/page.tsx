'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { Button } from '@/components/Button'
import { Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react'
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
  const { subscription, hasSubscription, remainingTreatments, cancelSubscription, loading: subLoading, refetch } = useSubscription(user?.id)
  
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<Plan | null>(null)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)

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
  
  // Cancelamento livre: cliente usa o plano até o fim do período já pago
  
  const handleCancelPending = async () => {
    if (!user) return
    try {
      await api.cancelPendingPlanChange(user.id)
      toast.success('Troca cancelada. Você permanece no plano atual.')
      await refetch()
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível cancelar a troca')
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (!user) return
    
    setProcessingPlanId(planId)
    
    try {
      const target = plans.find((plan) => plan.id === planId)
      if (hasSubscription && subscription) {
        const isUpgrade = (target?.price || 0) > subscription.plan.price
        if (isUpgrade && subscription.asaasSubscriptionId) {
          const payerCpf = window.prompt('Digite o CPF do titular do cartão (obrigatório pelo Asaas):')
          const cpfDigits = (payerCpf || '').replace(/\D/g, '')
          if (cpfDigits.length !== 11) {
            toast.error('Informe um CPF válido com 11 dígitos')
            return
          }
          const checkoutData = await api.createUpgradeCheckout(user.id, planId, cpfDigits)
          const paymentId = checkoutData?.paymentId || checkoutData?.sessionId
          if (paymentId) {
            setSelectedPlanForUpgrade(null)
            router.push(`/cliente/checkout?paymentId=${encodeURIComponent(paymentId)}&plan=1&upgrade=1`)
            return
          }
          throw new Error('URL do checkout não encontrada')
        }

        const response = await api.changePlan(user.id, planId)
        if (response) {
          toast.success(response.message || (response.scheduled
            ? `Você continua no ${subscription.plan.name} até a próxima cobrança.`
            : `Plano alterado para ${response.newPlan || target?.name}!`))
          setSelectedPlanForUpgrade(null)
          await refetch()
        } else {
          throw new Error('Erro ao trocar plano')
        }
      } 
      else {
        const payerCpf = window.prompt('Digite o CPF do titular do cartão (obrigatório pelo Asaas):')
        const cpfDigits = (payerCpf || '').replace(/\D/g, '')
        if (cpfDigits.length !== 11) {
          toast.error('Informe um CPF válido com 11 dígitos')
          return
        }
        const checkoutData = await api.createCheckoutSession(user.id, planId, cpfDigits)
        
        if (checkoutData?.paymentId || checkoutData?.sessionId) {
          router.push(`/cliente/checkout?paymentId=${encodeURIComponent(checkoutData.paymentId || checkoutData.sessionId)}&plan=1`)
        } else if (checkoutData?.url || checkoutData?.invoiceUrl) {
          window.location.href = checkoutData.url || checkoutData.invoiceUrl || ''
        } else {
          throw new Error('URL do checkout não encontrada')
        }
      }
    } catch (error: any) {
      console.error('Erro ao processar plano:', error)
      toast.error(error.message || 'Erro ao processar. Tente novamente.')
    } finally {
      setProcessingPlanId(null)
    }
  }

  // Verificar se é mês grátis (sem gateway)
  const isFreeMonth = subscription && !subscription.stripeSubscriptionId && !subscription.asaasSubscriptionId
  
  const formatPlanDate = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('pt-BR')
  }

  const getNextBillingDate = () => {
    if (isFreeMonth && subscription?.endDate) {
      return `Válido até ${formatPlanDate(subscription.endDate)}`
    }
    if (subscription?.nextDueDate) {
      return formatPlanDate(subscription.nextDueDate)
    }
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

                {/* Mostrar expiração para mês grátis, cobrança para planos pagos */}
                {isFreeMonth ? (
                  <div className="bg-gradient-to-r from-green-400/20 to-emerald-400/20 backdrop-blur-sm rounded-xl p-3 border border-green-300/30">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-100 font-medium">🎁 Mês Grátis</span>
                      <span className="font-semibold text-white">{getNextBillingDate()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-pink-100">Próxima cobrança</span>
                    <span className="font-semibold">{getNextBillingDate()}</span>
                  </div>
                )}
              </div>

              {subscription.pendingPlan ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="font-semibold text-amber-900">
                    Downgrade agendado para {subscription.pendingPlan.name}
                  </p>
                  <p className="text-sm text-amber-800 mt-1">
                    Você continua no {subscription.plan.name} até {getNextBillingDate()}. A partir da próxima cobrança o valor passa a ser R$ {subscription.pendingPlan.price.toFixed(2)}/mês.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCancelPending()}
                    className="mt-3 text-sm font-semibold text-amber-900 underline"
                  >
                    Desfazer troca
                  </button>
                </div>
              ) : null}

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
                    Você pode cancelar a qualquer momento. Continua usando o plano até o fim do período já pago — sem novas cobranças.
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
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && subscription && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Cancelar Assinatura?</h2>
                <p className="text-gray-600 mb-4">
                  Você deixa de renovar o plano {subscription.plan.name}. Os {subscription.plan.services.length} tratamentos inclusos ficam disponíveis até o fim do período já pago.
                </p>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-left">
                  <p className="text-sm text-blue-900">
                    <strong>📅 Importante:</strong> Você ainda poderá usar seu plano até <strong>{getNextBillingDate()}</strong> (fim do período já pago).
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    Depois disso não haverá novas cobranças e o plano será encerrado.
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
                  {hasSubscription
                    ? selectedPlanForUpgrade.price > (subscription?.plan.price || 0)
                      ? `Fazer upgrade para ${selectedPlanForUpgrade.name}`
                      : `Mudar para ${selectedPlanForUpgrade.name}`
                    : `Assinar ${selectedPlanForUpgrade.name}`}
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
                        ? `Cobra agora a diferença de R$ ${(selectedPlanForUpgrade.price - subscription.plan.price).toFixed(2)}. O plano troca na hora.`
                        : `Você continua no ${subscription.plan.name} até ${getNextBillingDate()}. Depois passa para ${selectedPlanForUpgrade.name}.`
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
                  disabled={processingPlanId === selectedPlanForUpgrade.id}
                >
                  {processingPlanId === selectedPlanForUpgrade.id ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                      Processando...
                    </>
                  ) : (
                    hasSubscription
                      ? selectedPlanForUpgrade.price > (subscription?.plan.price || 0)
                        ? 'Pagar diferença e atualizar'
                        : 'Agendar troca'
                      : 'Confirmar Assinatura'
                  )}
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

