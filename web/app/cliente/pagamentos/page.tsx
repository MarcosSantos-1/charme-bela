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
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  getPaymentMethods, 
  getPaymentHistory, 
  addCardCheckout,
  updateSavedCard,
  deleteSavedCard,
  releaseAppointmentHold,
  PaymentMethod,
  PaymentHistory
} from '@/lib/api'

// Componente separado que usa useSearchParams
function PaymentAlerts() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  const appointmentId = searchParams.get('appointmentId')

  useEffect(() => {
    if (success === 'true') {
      toast.success('Pagamento confirmado com sucesso! 🎉', { duration: 5000 })
    } else if (canceled === 'true') {
      // Libera imediatamente o horário que estava reservado para este checkout.
      // Se a chamada falhar, sem problema: o hold expira sozinho no backend.
      if (appointmentId) {
        releaseAppointmentHold(appointmentId).catch(() => {})
      }
      toast.error('Pagamento cancelado. O horário reservado foi liberado.', { duration: 5000 })
    }
  }, [success, canceled, appointmentId])

  return (
    <>
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
      
      {canceled === 'true' && (
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-xl p-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">Pagamento Cancelado</h3>
              <p className="text-sm text-orange-800">
                Você cancelou o processo de pagamento. Nenhuma cobrança foi realizada e o horário reservado foi liberado.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PagamentosContent() {
  const { user } = useAuth()
  const { subscription, hasSubscription, loading: subLoading } = useSubscription(user?.id)
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [openingAddCard, setOpeningAddCard] = useState(false)
  const [busyCardId, setBusyCardId] = useState<string | null>(null)
  const [editingCard, setEditingCard] = useState<PaymentMethod | null>(null)
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    if (user) {
      loadPaymentData()
    }
  }, [user])

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

  const handleAddCard = async () => {
    if (!user) return
    setOpeningAddCard(true)
    try {
      const result = await addCardCheckout(user.id)
      if (result?.url) {
        window.location.href = result.url
        return
      }
      throw new Error('Não foi possível abrir o checkout do cartão')
    } catch (error: any) {
      toast.error(error?.message || 'Use um cartão novo no próximo pagamento para memorizá-lo.')
    } finally {
      setOpeningAddCard(false)
    }
  }

  const handleSetDefault = async (card: PaymentMethod) => {
    if (!user) return
    if (card.kind === 'debit') {
      toast.error('Cartão de débito não pode ser o débito automático da assinatura.')
      return
    }
    setBusyCardId(card.id)
    try {
      const next = await updateSavedCard(card.id, { userId: user.id, isDefault: true })
      setPaymentMethods(next)
      toast.success('Este cartão passa a ser debitado automaticamente.')
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível trocar o cartão do débito automático.')
    } finally {
      setBusyCardId(null)
    }
  }

  const handleDeleteCard = async (card: PaymentMethod) => {
    if (!user) return
    if (!window.confirm(`Remover ${card.nickname || card.brand + ' •••• ' + card.last4}?`)) return
    setBusyCardId(card.id)
    try {
      const next = await deleteSavedCard(card.id, user.id)
      setPaymentMethods(next)
      toast.success('Cartão removido')
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível remover o cartão.')
    } finally {
      setBusyCardId(null)
    }
  }

  const handleSaveNickname = async () => {
    if (!user || !editingCard) return
    const nickname = nicknameDraft.trim()
    if (!nickname) {
      toast.error('Digite um apelido')
      return
    }
    setBusyCardId(editingCard.id)
    try {
      const next = await updateSavedCard(editingCard.id, { userId: user.id, nickname })
      setPaymentMethods(next)
      setEditingCard(null)
      toast.success('Apelido salvo')
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível salvar o apelido.')
    } finally {
      setBusyCardId(null)
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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Alertas de Pagamento */}
      <Suspense fallback={<div />}>
        <PaymentAlerts />
      </Suspense>
      
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
            <h3 className="font-semibold text-gray-900 mb-1">Seus Cartões</h3>
            <p className="text-sm text-gray-500 mb-4">
              Débito automático da assinatura usa crédito. Débito vale para avulsos. O apelido aparece na hora de pagar.
            </p>

            {paymentMethods.length > 0 ? (
              <div className="space-y-4">
                {paymentMethods.map((card) => {
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
                    <div key={card.id} className="space-y-2">
                    <div
                      className={`relative rounded-2xl p-6 text-white shadow-lg ${brandStyle}`}
                    >
                      <div className="absolute inset-0 opacity-10 rounded-2xl" style={{
                        backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                      }}></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-6">
                          <div className="w-14 h-11 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-lg shadow-md"></div>
                          <div className="flex gap-2">
                            {card.kind === 'debit' ? (
                              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold">
                                Débito
                              </div>
                            ) : (
                              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold">
                                Crédito
                              </div>
                            )}
                            {card.isDefault && (
                              <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold">
                                Débito automático
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-lg font-bold mb-2">
                          {card.nickname?.trim() || `${card.brand} •••• ${card.last4}`}
                        </div>
                        {card.nickname?.trim() ? (
                          <div className="text-sm font-mono tracking-[0.2em] opacity-80 mb-4">
                            •••• {card.last4}
                          </div>
                        ) : (
                          <div className="text-2xl font-mono tracking-[0.2em] mb-4 flex items-center gap-3">
                            <span className="opacity-60">••••</span>
                            <span className="font-bold">{card.last4}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {card.kind !== 'debit' && !card.isDefault ? (
                        <button
                          type="button"
                          disabled={busyCardId === card.id}
                          onClick={() => void handleSetDefault(card)}
                          className="text-sm font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-full px-3 py-1.5"
                        >
                          Usar no débito automático
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCard(card)
                          setNicknameDraft(card.nickname || '')
                        }}
                        className="text-sm font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-full px-3 py-1.5"
                      >
                        {card.nickname ? 'Editar apelido' : 'Dar apelido'}
                      </button>
                      <button
                        type="button"
                        disabled={busyCardId === card.id}
                        onClick={() => void handleDeleteCard(card)}
                        className="text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-full px-3 py-1.5"
                      >
                        Remover
                      </button>
                    </div>
                    </div>
                  )
                  })}
                </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum cartão salvo ainda</p>
                <p className="text-xs mt-1">Pague uma vez no checkout seguro e o cartão aparece aqui</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleAddCard()}
              disabled={openingAddCard}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-pink-200 py-3 text-sm font-bold text-pink-700 hover:bg-pink-50 disabled:opacity-60"
            >
              {openingAddCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Adicionar cartão
            </button>
          </div>

          {editingCard ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4">
                <h3 className="font-bold text-gray-900">Apelido do cartão</h3>
                <p className="text-sm text-gray-500">
                  Como você quer ver {editingCard.brand} •••• {editingCard.last4} na hora de pagar?
                </p>
                <input
                  value={nicknameDraft}
                  onChange={(event) => setNicknameDraft(event.target.value.slice(0, 40))}
                  placeholder="Ex.: Nubank pessoal"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="primary" className="flex-1" onClick={() => void handleSaveNickname()}>
                    Salvar apelido
                  </Button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-gray-200 font-semibold text-gray-600"
                    onClick={() => setEditingCard(null)}
                  >
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          ) : null}

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
                      
                      {isPaid && (payment.hostedInvoiceUrl || payment.receiptUrl || payment.invoicePdf) ? (
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          {payment.invoicePdf ? (
                            <a
                              href={payment.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
                            >
                              <Download className="w-4 h-4" />
                              <span>PDF</span>
                            </a>
                          ) : null}
                          {(payment.receiptUrl || payment.hostedInvoiceUrl) ? (
                            <a
                              href={payment.receiptUrl || payment.hostedInvoiceUrl || ''}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Ver comprovante</span>
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                      
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
  )
}

// Componente wrapper principal
export default function PagamentosPage() {
  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Pagamentos">
        <PagamentosContent />
      </ClientLayout>
    </ProtectedRoute>
  )
}

