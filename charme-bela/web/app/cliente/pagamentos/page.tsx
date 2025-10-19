'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { Button } from '@/components/Button'
import { 
  Calendar, 
  Download, 
  Check, 
  Clock,
  X,
  CreditCard,
  AlertCircle,
  ExternalLink,
  Loader2,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  getPaymentMethods, 
  getPaymentHistory, 
  createCustomerPortalSession,
  PaymentMethod,
  PaymentHistory
} from '@/lib/api'

export default function PagamentosPage() {
  const { user } = useAuth()
  const { subscription, hasSubscription, loading: subLoading } = useSubscription(user?.id)
  const searchParams = useSearchParams()
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  
  // Captura parâmetros de sucesso/cancelamento do Stripe
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    if (user) {
      loadPaymentData()
    }
  }, [user])
  
  useEffect(() => {
    // Mostra toast de sucesso/erro
    if (success === 'true') {
      toast.success('Pagamento confirmado com sucesso! 🎉', { duration: 5000 })
    } else if (canceled === 'true') {
      toast.error('Pagamento cancelado. Nenhuma cobrança foi feita.', { duration: 5000 })
    }
  }, [success, canceled])

  const loadPaymentData = async () => {
    if (!user) return
    
    try {
      const [methods, history] = await Promise.all([
        getPaymentMethods(user.id),
        getPaymentHistory(user.id)
      ])
      
      setPaymentMethods(methods)
      setPaymentHistory(history)
    } catch (error) {
      console.error('Erro ao carregar dados de pagamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCustomerPortal = async () => {
    if (!user) return
    
    setOpeningPortal(true)
    
    try {
      const portalData = await createCustomerPortalSession(user.id)
      
      // apiRequest já retorna só o data, então portalData = { url }
      if (portalData && portalData.url) {
        // Redireciona para o Customer Portal do Stripe
        window.location.href = portalData.url
      } else {
        throw new Error('Erro ao abrir portal')
      }
    } catch (error: any) {
      console.error('Erro ao abrir portal:', error)
      
      // Mostra mensagem de erro específica se disponível
      const errorMessage = error?.message || 'Erro ao abrir portal. Tente novamente.'
      
      if (errorMessage.includes('Portal de Pagamentos precisa ser ativado')) {
        toast.error('⚙️ Configure o Portal de Pagamentos no Stripe Dashboard primeiro', { duration: 6000 })
      } else if (errorMessage.includes('Assine um plano primeiro')) {
        toast.error('Você precisa assinar um plano primeiro para acessar o portal', { duration: 5000 })
      } else {
        toast.error(errorMessage, { duration: 5000 })
      }
    } finally {
      setOpeningPortal(false)
    }
  }

  const getNextBillingDate = () => {
    if (!subscription?.startDate) return 'Não definido'
    
    const start = new Date(subscription.startDate)
    const dayOfMonth = start.getDate()
    const now = new Date()
    
    let nextDate = new Date()
    nextDate.setDate(dayOfMonth)
    
    if (now.getDate() >= dayOfMonth) {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }
    
    return nextDate.toLocaleDateString('pt-BR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }
  
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    const timeStr = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${dateStr} às ${timeStr}`
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      // Invoice statuses
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pago', icon: '✓' },
      open: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendente', icon: '⏳' },
      void: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelado', icon: '✗' },
      uncollectible: { bg: 'bg-red-100', text: 'text-red-700', label: 'Falhou', icon: '⚠' },
      // Payment Intent statuses
      succeeded: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pago', icon: '✓' },
      canceled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelado', icon: '✗' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processando', icon: '⏳' },
      requires_payment_method: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Falhou', icon: '⚠' },
    }
    
    const badge = badges[status as keyof typeof badges] || badges.open
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon} {badge.label}
      </span>
    )
  }
  
  const getTypeBadge = (type: string) => {
    return type === 'subscription' ? (
      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
        📅 Assinatura
      </span>
    ) : (
      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
        🎫 Avulso
      </span>
    )
  }

  if (subLoading || loading) {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Pagamentos">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Pagamentos">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Banner de Sucesso */}
          {success === 'true' && (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Pagamento Confirmado!</h3>
                  <p className="text-sm text-green-800">
                    Seu pagamento foi processado com sucesso. O comprovante está disponível no histórico abaixo.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Banner de Cancelamento */}
          {canceled === 'true' && (
            <div className="bg-orange-50 border-l-4 border-orange-500 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-1">Pagamento Cancelado</h3>
                  <p className="text-sm text-orange-800">
                    Você cancelou o processo de pagamento. Nenhuma cobrança foi realizada.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Sem Assinatura */}
          {!hasSubscription && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Nenhuma assinatura ativa</h3>
                  <p className="text-sm text-yellow-800 mb-4">
                    Você não possui uma assinatura ativa no momento. Para contratar um plano, visite a página de planos.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => window.location.href = '/planos'}
                  >
                    Ver Planos Disponíveis
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Next Payment */}
          {hasSubscription && subscription && (
            <>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl text-white p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Calendar className="w-6 h-6" />
                  <h2 className="font-semibold">Próximo Pagamento</h2>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold">
                      R$ {subscription.plan.price.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-green-100 text-sm mt-1">{getNextBillingDate()}</div>
                  </div>
                  <div className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    {subscription.plan.name}
                  </div>
                </div>
              </div>

              {/* Assinatura Info */}
              <div className="bg-white rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Detalhes da Assinatura</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Plano</span>
                    <span className="font-medium text-gray-900">{subscription.plan.name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Valor Mensal</span>
                    <span className="font-medium text-gray-900">
                      R$ {subscription.plan.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subscription.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700'
                        : subscription.status === 'CANCELED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {subscription.status === 'ACTIVE' ? 'Ativo' : 
                       subscription.status === 'CANCELED' ? 'Cancelado' : 
                       subscription.status === 'PAST_DUE' ? 'Em atraso' : subscription.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Data de início</span>
                    <span className="font-medium text-gray-900">
                      {new Date(subscription.startDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {subscription.status === 'CANCELED' && subscription.endDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Acesso até</span>
                      <span className="font-medium text-red-600">
                        {new Date(subscription.endDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Seus Cartões</h3>

            {paymentMethods.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 mb-3">Cartões salvos:</p>
                <div className="space-y-4">
                  {paymentMethods.map((card) => {
                  // Gradientes modernos por bandeira
                  const brandStyle = card.brand === 'visa' 
                    ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800' 
                    : card.brand === 'mastercard'
                    ? 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-600'
                    : card.brand === 'amex'
                    ? 'bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800'
                    : card.brand === 'elo'
                    ? 'bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600'
                    : 'bg-gradient-to-br from-gray-700 via-gray-800 to-slate-900'
                  
                  return (
                    <div
                      key={card.id}
                      className={`relative rounded-2xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${brandStyle}`}
                    >
                      {/* Pattern de fundo */}
                      <div className="absolute inset-0 opacity-10 rounded-2xl" style={{
                        backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                      }}></div>
                      
                      {/* Conteúdo */}
                      <div className="relative z-10">
                        {/* Header: Chip + Badge */}
                        <div className="flex items-start justify-between mb-8">
                          <div className="w-14 h-11 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-lg shadow-md"></div>
                          {card.isDefault && (
                            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1">
                              ⭐ Padrão
                            </div>
                          )}
            </div>

                        {/* Número do Cartão */}
                        <div className="text-2xl font-mono tracking-[0.2em] mb-6 flex items-center gap-3">
                          <span className="opacity-60">••••</span>
                          <span className="opacity-60">••••</span>
                          <span className="opacity-60">••••</span>
                          <span className="font-bold">{card.last4}</span>
            </div>

                        {/* Footer: Validade + Bandeira */}
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-xs opacity-70 mb-1 uppercase tracking-wider">Válido até</div>
                            <div className="text-base font-semibold">{String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}</div>
                          </div>
                          <div className="text-2xl font-bold uppercase tracking-wider opacity-90">
                            {card.brand}
                      </div>
                        </div>
                      </div>
                      
                      {/* Brilho sutil */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    </div>
                  )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum cartão salvo ainda</p>
                <p className="text-xs mt-1">Seus cartões aparecerão aqui após o primeiro pagamento</p>
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span>Histórico de Pagamentos</span>
              {paymentHistory.length > 0 && (
                <span className="text-xs text-gray-500 font-normal">
                  {paymentHistory.length} transações
                </span>
              )}
            </h3>
            
            <div className="space-y-3">
              {paymentHistory.length > 0 ? (
                <>
                  {paymentHistory
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((payment) => {
                      const isPaid = payment.status === 'paid' || payment.status === 'succeeded'
                      const isFailed = payment.status === 'uncollectible' || payment.status === 'requires_payment_method'
                      const isCanceled = payment.status === 'void' || payment.status === 'canceled'
                      const isPending = payment.status === 'open' || payment.status === 'processing'
                      
                      return (
                  <div
                    key={payment.id}
                          className="border border-gray-200 rounded-xl p-4 hover:border-pink-300 transition-all"
                  >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isPaid ? 'bg-green-100' :
                                isFailed ? 'bg-red-100' :
                                isCanceled ? 'bg-gray-100' :
                                'bg-yellow-100'
                              }`}>
                                {isPaid ? (
                          <Check className="w-5 h-5 text-green-600" />
                                ) : isFailed ? (
                                  <X className="w-5 h-5 text-red-600" />
                                ) : isCanceled ? (
                                  <X className="w-5 h-5 text-gray-600" />
                                ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                                <div className="font-bold text-gray-900 text-lg">
                          R$ {payment.amount.toFixed(2).replace('.', ',')}
                        </div>
                                <div className="text-sm text-gray-600 flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDateTime(payment.paidAt || payment.createdAt)}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {payment.description}
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              {getStatusBadge(payment.status)}
                              {getTypeBadge(payment.type)}
                      </div>
                    </div>
                      
                      {/* Links de comprovante */}
                      {isPaid && (
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          {payment.invoicePdf && (
                            <a
                              href={payment.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
                            >
                              <Download className="w-4 h-4" />
                              <span>PDF</span>
                            </a>
                          )}
                          {payment.hostedInvoiceUrl && (
                            <a
                              href={payment.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Comprovante</span>
                            </a>
                          )}
                          {payment.receiptUrl && (
                            <a
                              href={payment.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                              <Download className="w-4 h-4" />
                              <span>Recibo</span>
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Mensagem de erro se falhou */}
                      {isFailed && (
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-xs text-red-600">
                            ⚠️ Pagamento não foi processado. Tente novamente ou use outro cartão.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                  })}
                  
                {/* Paginação */}
                {paymentHistory.length > itemsPerPage && (
                    <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                        }`}
                      >
                        ← Anterior
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(paymentHistory.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg font-medium transition-all ${
                              currentPage === page
                                ? 'bg-pink-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(paymentHistory.length / itemsPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(paymentHistory.length / itemsPerPage)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          currentPage === Math.ceil(paymentHistory.length / itemsPerPage)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                        }`}
                      >
                        Próxima →
                      </button>
                  </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum pagamento registrado ainda</p>
                  <p className="text-sm mt-1">Seu histórico aparecerá aqui após o primeiro pagamento</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ClientLayout>
    </ProtectedRoute>
  )
}

