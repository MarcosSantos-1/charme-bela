'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import { SavedAccountButton } from '@/components/SavedAccountButton'
import { 
  Check, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  Shield,
  Calendar,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getPlans, createCheckoutSession, changePlan, Plan } from '@/lib/api'
import { redirectToCheckout } from '@/lib/stripe'
import { useSubscription } from '@/lib/hooks/useSubscription'

export default function PlanosPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { subscription, hasSubscription } = useSubscription(user?.id)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const data = await getPlans()
      // Ordena por tier (Bronze, Silver, Gold)
      const sortedPlans = data.sort((a, b) => {
        const order = { BRONZE: 1, SILVER: 2, GOLD: 3 }
        return order[a.tier] - order[b.tier]
      })
      setPlans(sortedPlans)
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      toast.error('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const handleChoosePlan = async (planId: string) => {
    // Verifica se está logado
    if (!user) {
      toast.error('Você precisa fazer login para assinar um plano')
      router.push('/login')
      return
    }

    setProcessingPlanId(planId)

    try {
      // Se JÁ TEM assinatura, troca de plano
      if (hasSubscription && subscription) {
        // Verifica se é o mesmo plano
        if (subscription.planId === planId) {
          toast('Você já está neste plano! 😊', { icon: '✨' })
          return
        }

        // Troca de plano
        const response = await changePlan(user.id, planId)
        
        if (response.success) {
          const { isUpgrade, newPlan } = response
          toast.success(`Plano ${isUpgrade ? 'atualizado' : 'alterado'} para ${newPlan}! 🎉`)
          
          // Redireciona para página do plano
          setTimeout(() => {
            router.push('/cliente/plano')
          }, 1500)
        } else {
          throw new Error(response.error || 'Erro ao trocar plano')
        }
      } else {
        // Se NÃO TEM assinatura, cria nova (via Stripe)
        const response = await createCheckoutSession(user.id, planId)
        
        if (response.success && response.data.url) {
          // Redireciona para checkout do Stripe
          window.location.href = response.data.url
        } else {
          throw new Error('Erro ao criar sessão de pagamento')
        }
      }
    } catch (error: any) {
      console.error('Erro ao processar plano:', error)
      toast.error(error.message || 'Erro ao processar. Tente novamente.')
    } finally {
      setProcessingPlanId(null)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BRONZE':
        return {
          gradient: 'from-amber-400 to-amber-600',
          bg: 'bg-amber-100',
          text: 'text-amber-600',
          border: 'border-amber-200',
          emoji: '🥉'
        }
      case 'SILVER':
        return {
          gradient: 'from-pink-500 to-pink-700',
          bg: 'bg-pink-100',
          text: 'text-pink-600',
          border: 'border-pink-500',
          emoji: '🥈',
          popular: true
        }
      case 'GOLD':
        return {
          gradient: 'from-purple-500 to-purple-700',
          bg: 'bg-purple-100',
          text: 'text-purple-600',
          border: 'border-purple-200',
          emoji: '🥇'
        }
      default:
        return {
          gradient: 'from-gray-400 to-gray-600',
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          border: 'border-gray-200',
          emoji: '💎'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-pink-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando planos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2 text-gray-700 hover:text-pink-600">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            
            <h1 className="text-xl font-bold text-gray-900">
              Charme & Bela Club
            </h1>
            
            <SavedAccountButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="py-12 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center space-x-2 bg-pink-100 text-pink-700 px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Oferta Especial</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Escolha Seu Plano Ideal
          </h2>
          
          <p className="text-xl text-gray-600 mb-8">
            Transforme sua rotina de beleza com economia e praticidade. Sem taxas ocultas!
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span>Pagamento seguro</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Cancele quando quiser</span>
            </div>
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <span>Powered by Stripe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const colors = getTierColor(plan.tier)
            const isPopular = colors.popular
            const isProcessing = processingPlanId === plan.id

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all overflow-hidden border-2 ${
                  isPopular 
                    ? 'border-pink-500 transform md:scale-105' 
                    : colors.border
                } relative ${isProcessing ? 'opacity-75 pointer-events-none' : ''}`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      MAIS POPULAR
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className={`bg-gradient-to-br ${colors.gradient} p-6 text-white ${isPopular ? 'mt-4' : ''}`}>
                  <div className="text-3xl mb-2">{colors.emoji}</div>
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-white/80 text-sm">{plan.tier}</p>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">
                        R$ {plan.price.toFixed(0)}
                      </span>
                      <span className="text-gray-600 ml-2">/mês</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Até {plan.maxTreatmentsPerMonth} tratamentos/mês
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4">
                    {plan.description}
                  </p>

                  {/* Services Count */}
                  <div className={`${colors.bg} rounded-xl p-3 mb-6`}>
                    <p className={`text-sm font-medium ${colors.text}`}>
                      ✨ {plan.services.length} tratamentos inclusos
                    </p>
                  </div>

                  {/* CTA Button */}
                  <Button
                    variant={isPopular ? 'primary' : 'outline'}
                    className="w-full"
                    onClick={() => handleChoosePlan(plan.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        {user ? 'Assinar Agora' : 'Login para Assinar'}
                      </>
                    )}
                  </Button>

                  {/* Link to services */}
                  <Link
                    href={`/servicos?plan=${plan.tier}`}
                    className={`block text-center text-sm ${colors.text} hover:underline mt-3`}
                  >
                    Ver todos os tratamentos inclusos →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-16 text-center space-y-4">
          <p className="text-sm text-gray-600">
            🎁 <strong>Sem taxas ocultas.</strong> Contrato mínimo de 3 meses • Cancele online quando quiser
          </p>
          
          <p className="text-xs text-gray-500">
            Pagamentos processados de forma segura pelo Stripe. Seus dados estão protegidos.
          </p>

          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <Link href="/termos" className="hover:text-pink-600">
              Termos de Uso
            </Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:text-pink-600">
              Política de Privacidade
            </Link>
            <span>•</span>
            <Link href="/cancelamento" className="hover:text-pink-600">
              Política de Cancelamento
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

