'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { Button } from '@/components/Button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, CreditCard, AlertCircle, X as XIcon, Loader2, Copy } from 'lucide-react'
import { useState, Suspense, useEffect } from 'react'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

function pixImageSrc(value?: string | null) {
  if (!value) return null
  return value.startsWith('data:') ? value : `data:image/png;base64,${value}`
}

function cardBrandLabel(brandName?: string | null) {
  const value = (brandName || '').toLowerCase()
  if (value.includes('master')) return 'Mastercard'
  if (value.includes('visa')) return 'Visa'
  if (value.includes('amex') || value.includes('american')) return 'Amex'
  if (value.includes('elo')) return 'Elo'
  if (value.includes('hiper')) return 'Hipercard'
  return 'Cartão'
}

function savedCardLabel(card: api.PaymentMethod) {
  const nick = card.nickname?.trim()
  if (nick) return nick
  return `${cardBrandLabel(card.brand)} •••• ${card.last4}`
}

const MAX_PACKAGE_INSTALLMENTS = 3
const MIN_PACKAGE_INSTALLMENT_VALUE = 5

function packageInstallmentOptions(total: number) {
  const options = [1]
  for (let count = 2; count <= MAX_PACKAGE_INSTALLMENTS; count += 1) {
    if (total / count >= MIN_PACKAGE_INSTALLMENT_VALUE) options.push(count)
  }
  return options
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function PayCheckout({
  paymentId: initialPaymentId,
  appointmentId,
  packagePurchaseId,
  serviceId,
  cardOnly,
  isUpgrade,
}: {
  paymentId: string
  appointmentId: string | null
  packagePurchaseId: string | null
  serviceId: string | null
  cardOnly: boolean
  isUpgrade?: boolean
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [paymentId, setPaymentId] = useState(initialPaymentId)
  const [loading, setLoading] = useState(true)
  const [paid, setPaid] = useState(false)
  const [amount, setAmount] = useState(0)
  const [installmentCount, setInstallmentCount] = useState(1)
  const [changingInstallments, setChangingInstallments] = useState(false)
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)
  const [pixCopy, setPixCopy] = useState<string | null>(null)
  const [pixQr, setPixQr] = useState<string | null>(null)
  const [savedCards, setSavedCards] = useState<api.PaymentMethod[]>([])
  const [chargingSavedId, setChargingSavedId] = useState<string | null>(null)
  const [nicknameCard, setNicknameCard] = useState<api.PaymentMethod | null>(null)
  const [nicknameDraft, setNicknameDraft] = useState('')

  useEffect(() => {
    if (!user?.id) return
    api.getPaymentMethods(user.id).then((methods) => {
      setSavedCards(methods.filter((method) => method.last4 && (!cardOnly || method.kind !== 'debit')))
    }).catch(() => setSavedCards([]))
  }, [user?.id, cardOnly])

  useEffect(() => {
    if (paid) return
    let cancelled = false
    const poll = async () => {
      try {
        const status = await api.getPaymentStatus(paymentId)
        if (cancelled) return
        setAmount(status.value || 0)
        if (status.invoiceUrl) {
          setInvoiceUrl((current) => {
            if (current && /checkoutSession/i.test(current) && !/checkoutSession/i.test(status.invoiceUrl || '')) {
              return current
            }
            return status.invoiceUrl
          })
        }
        const cardBilling = status.billingType === 'credit_card' || status.billingType === 'debit_card'
        if (!cardOnly && !cardBilling) {
          if (status.pixCopyPaste) setPixCopy(status.pixCopyPaste)
          if (status.pixQrBase64) setPixQr(status.pixQrBase64)
        }
        setLoading(false)
        if (status.paid) {
          setPaid(true)
          if (user?.id) {
            api.getPaymentMethods(user.id).then((methods) => {
              const unnamed = methods
                .filter((method) => method.last4 && !method.nickname?.trim())
                .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
              if (unnamed) {
                setNicknameCard(unnamed)
                setNicknameDraft('')
                return
              }
              toast.success(isUpgrade ? 'Plano atualizado com sucesso!' : cardOnly ? 'Assinatura ativada!' : 'Pagamento confirmado')
              setTimeout(() => router.push(cardOnly ? '/cliente/plano' : '/cliente'), 1800)
            }).catch(() => {
              toast.success(isUpgrade ? 'Plano atualizado com sucesso!' : cardOnly ? 'Assinatura ativada!' : 'Pagamento confirmado')
              setTimeout(() => router.push(cardOnly ? '/cliente/plano' : '/cliente'), 1800)
            })
          } else {
            setTimeout(() => router.push(cardOnly ? '/cliente/plano' : '/cliente'), 1800)
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          setLoading(false)
          toast.error(error.message || 'Não foi possível carregar o pagamento')
        }
      }
    }
    void poll()
    const id = setInterval(() => void poll(), 4000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [cardOnly, isUpgrade, paymentId, router, paid, user?.id])

  const isPackage = Boolean(packagePurchaseId)
  const installmentChoices = packageInstallmentOptions(amount)

  const applyInstallment = async (count: number) => {
    if (!user || !isPackage || !serviceId || count === installmentCount || changingInstallments) return
    setChangingInstallments(true)
    try {
      const session = await api.createPaymentSession(
        user.id,
        serviceId,
        appointmentId || undefined,
        undefined,
        undefined,
        packagePurchaseId || undefined,
        undefined,
        count > 1 ? count : undefined,
      )
      if (!session.paymentId) throw new Error('Não foi possível atualizar o parcelamento')
      setPaymentId(session.paymentId)
      setInvoiceUrl(session.invoiceUrl || session.url || null)
      setAmount(session.amount || amount)
      setInstallmentCount(count)
      const next = new URLSearchParams(window.location.search)
      next.set('paymentId', session.paymentId)
      if (packagePurchaseId) next.set('packagePurchaseId', packagePurchaseId)
      if (serviceId) next.set('serviceId', serviceId)
      router.replace(`/cliente/checkout?${next.toString()}`)
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível alterar o parcelamento')
    } finally {
      setChangingInstallments(false)
    }
  }

  const visibleSavedCards = savedCards.filter((card) => installmentCount <= 1 || card.kind !== 'debit')

  const payWithSaved = async (card: api.PaymentMethod) => {
    if (!user || chargingSavedId) return
    setChargingSavedId(card.id)
    try {
      const result = await api.chargeSavedCard({
        userId: user.id,
        paymentId,
        appointmentId: appointmentId || undefined,
        packagePurchaseId: packagePurchaseId || undefined,
        savedCardId: card.id,
      })
      if (result.paid) {
        setPaid(true)
        toast.success(isUpgrade ? 'Plano atualizado com sucesso!' : 'Cartão cobrado')
        try {
          const methods = await api.getPaymentMethods(user.id)
          const unnamed = methods
            .filter((method) => method.last4 && !method.nickname?.trim())
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
          if (unnamed) {
            setNicknameCard(unnamed)
            setNicknameDraft('')
            return
          }
        } catch {
          // segue para a agenda
        }
        setTimeout(() => router.push(cardOnly ? '/cliente/plano' : '/cliente'), 1800)
        return
      }
      toast('Estamos confirmando a cobrança…')
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível cobrar o cartão salvo. Use o checkout seguro.')
    } finally {
      setChargingSavedId(null)
    }
  }

  const qrSrc = pixImageSrc(pixQr)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
        <Loader2 className="w-12 h-12 text-pink-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">{cardOnly ? 'Preparando o cartão…' : 'Carregando pagamento…'}</p>
      </div>
    )
  }

  if (paid) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Pagamento confirmado</h2>
        <p className="text-gray-600">
          {isUpgrade ? 'Seu plano foi atualizado. Redirecionando para Meu plano…' : cardOnly ? 'Sua assinatura está ativa.' : 'Seu horário está reservado.'}
        </p>
        {nicknameCard ? (
          <div className="text-left rounded-2xl border border-pink-100 bg-pink-50 p-4 space-y-3">
            <p className="font-semibold text-gray-900">Apelido do cartão</p>
            <p className="text-sm text-gray-600">
              Como você quer ver {cardBrandLabel(nicknameCard.brand)} •••• {nicknameCard.last4} na hora de pagar?
            </p>
            <input
              value={nicknameDraft}
              onChange={(event) => setNicknameDraft(event.target.value.slice(0, 40))}
              placeholder="Ex.: Nubank pessoal"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={async () => {
                  const nickname = nicknameDraft.trim()
                  if (!nickname || !user) return
                  try {
                    await api.updateSavedCard(nicknameCard.id, { userId: user.id, nickname })
                    toast.success('Apelido salvo')
                    router.push(cardOnly ? '/cliente/plano' : '/cliente')
                  } catch (error: any) {
                    toast.error(error.message || 'Não foi possível salvar o apelido')
                  }
                }}
              >
                Salvar apelido
              </Button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-gray-200 font-semibold text-gray-600"
                onClick={() => router.push(cardOnly ? '/cliente/plano' : '/cliente')}
              >
                Agora não
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-pink-500 to-pink-700 rounded-2xl p-6 text-white">
        <p className="text-sm font-medium text-pink-100">Valor a pagar</p>
        <p className="text-4xl font-extrabold mt-1">
          {formatMoney(amount)}
        </p>
        {isPackage && installmentCount > 1 ? (
          <p className="text-sm text-pink-100 mt-1">
            {installmentCount}x de {formatMoney(amount / installmentCount)} no crédito
          </p>
        ) : null}
        <p className="text-sm text-pink-100 mt-2">
          {isUpgrade
            ? 'Só a diferença do plano, no crédito. Pode usar o cartão salvo — o plano troca assim que o pagamento confirmar.'
            : cardOnly
            ? 'Assinatura no cartão de crédito. Débito não renova o plano.'
            : isPackage
            ? 'Pacote: parcele no crédito. Pix e débito continuam à vista.'
            : 'Pague com Pix nesta tela ou crédito/débito no checkout seguro.'}
        </p>
      </div>

      {isPackage && installmentChoices.length > 1 ? (
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Parcelar no crédito</h2>
          <p className="text-sm text-gray-500 mb-3">Só para pacotes. Pix e débito continuam à vista.</p>
          <div className="flex flex-wrap gap-2">
            {installmentChoices.map((count) => {
              const selected = installmentCount === count
              return (
                <button
                  key={count}
                  type="button"
                  disabled={changingInstallments}
                  onClick={() => void applyInstallment(count)}
                  className={`min-w-[4.5rem] rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-60 ${
                    selected
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 text-gray-700 hover:border-pink-200'
                  }`}
                >
                  <span className="block">{count === 1 ? 'À vista' : `${count}x`}</span>
                  <span className={`block text-xs font-medium ${selected ? 'text-pink-600' : 'text-gray-400'}`}>
                    {count === 1 ? formatMoney(amount) : formatMoney(amount / count)}
                  </span>
                </button>
              )
            })}
          </div>
          {changingInstallments ? (
            <p className="mt-3 text-xs text-gray-500 inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Atualizando cobrança…
            </p>
          ) : null}
        </div>
      ) : null}

      {!cardOnly && (pixCopy || qrSrc) ? (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Pix</h2>
        <p className="text-sm text-gray-500 mb-4">O pagamento cai na hora.</p>
        {qrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt="QR Code Pix" className="w-56 h-56 mx-auto rounded-xl bg-white" />
        ) : (
          <div className="h-56 flex items-center justify-center text-sm text-gray-500">
            Copie o código Pix abaixo
          </div>
        )}
        {pixCopy ? (
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-2 text-sm font-bold text-pink-700"
            onClick={async () => {
              await navigator.clipboard.writeText(pixCopy)
              toast.success('Código Pix copiado')
            }}
          >
            <Copy className="w-4 h-4" />
            Copiar código Pix
          </button>
        ) : null}
      </div>
      ) : null}

      {visibleSavedCards.map((card) => {
        const charging = chargingSavedId === card.id
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => void payWithSaved(card)}
            disabled={Boolean(chargingSavedId)}
            className="w-full flex items-center gap-3 rounded-2xl p-4 text-left text-white bg-gradient-to-r from-pink-500 to-pink-700 disabled:opacity-60"
          >
            {charging ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
            <div className="flex-1">
              <p className="font-bold">
                Pagar agora com {savedCardLabel(card)}
              </p>
              <p className="text-sm text-pink-100">
                {card.kind === 'debit'
                  ? 'Débito · só compras avulsas'
                  : card.nickname
                    ? `${cardBrandLabel(card.brand)} •••• ${card.last4}${card.isDefault ? ' · principal' : ''}`
                    : card.isDefault
                      ? 'Cartão principal · um clique'
                      : 'Um clique. Sem preencher de novo.'}
              </p>
            </div>
          </button>
        )
      })}

      {invoiceUrl ? (
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-4 rounded-2xl p-4 text-white bg-gradient-to-r from-[#3a1d2c] to-pink-800"
        >
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <CreditCard className="w-7 h-7" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold tracking-wide text-amber-200">
              {cardOnly ? 'SOMENTE CRÉDITO · VISA · MASTER · ELO · AMEX' : 'CRÉDITO OU DÉBITO · VISA · MASTER · ELO · AMEX'}
            </p>
            <p className="font-bold text-lg">
              {savedCards.length
                ? cardOnly
                  ? 'Usar outro cartão de crédito'
                  : 'Usar outro cartão'
                : cardOnly
                  ? 'Pagar com cartão de crédito'
                  : 'Pagar com crédito ou débito'}
            </p>
            <p className="text-sm text-pink-100">
              {isUpgrade
                ? 'Mesma tela da assinatura. A diferença entra no cartão e o plano novo vale na hora.'
                : cardOnly
                ? 'A assinatura renova no crédito. Depois você escolhe um apelido para o cartão.'
                : isPackage && installmentCount > 1
                ? `Checkout seguro em ${installmentCount}x no crédito. Pix e débito continuam à vista.`
                : 'Crédito ou débito no checkout seguro. Depois você escolhe um apelido para aparecer na hora de pagar.'}
            </p>
          </div>
        </a>
      ) : null}

      {appointmentId ? (
        <p className="text-xs text-center text-gray-400">Reserva {appointmentId.slice(0, 8)}…</p>
      ) : null}
    </div>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  
  const paymentId = searchParams.get('paymentId')
  const appointmentId = searchParams.get('appointmentId')
  const packagePurchaseId = searchParams.get('packagePurchaseId')
  const serviceId = searchParams.get('serviceId')
  const cardOnly = searchParams.get('plan') === '1'
  const isUpgrade = searchParams.get('upgrade') === '1'
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), paymentId ? 0 : 1500)
    return () => clearTimeout(timer)
  }, [paymentId])

  useEffect(() => {
    if (success === 'true' && !loading) {
      const timer = setTimeout(() => router.push('/cliente/plano'), 3000)
      return () => clearTimeout(timer)
    }
  }, [success, loading, router])

  if (paymentId) {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Pagamento">
          <div className="max-w-lg mx-auto px-4 py-6">
            <PayCheckout
              paymentId={paymentId}
              appointmentId={appointmentId}
              packagePurchaseId={packagePurchaseId}
              serviceId={serviceId}
              cardOnly={cardOnly}
              isUpgrade={isUpgrade}
            />
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Processando">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
              <Loader2 className="w-16 h-16 text-pink-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verificando pagamento...</h2>
              <p className="text-gray-600">Aguarde um momento</p>
            </div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  if (success === 'true') {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Sucesso">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Check className="w-10 h-10 text-green-600" />
              </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento confirmado</h2>
                  <p className="text-gray-600 mb-6">
                    {isUpgrade ? 'Seu plano foi atualizado.' : 'Agora você pode acompanhar seus agendamentos.'}
                  </p>
                  <Button variant="primary" className="w-full" onClick={() => router.push('/cliente/plano')}>
                    Ir para Meu plano
                  </Button>
            </div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  if (canceled === 'true') {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Cancelado">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XIcon className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Cancelado</h2>
              <p className="text-gray-600 mb-6">Nada foi cobrado.</p>
              <Button variant="primary" className="w-full" onClick={() => router.push('/cliente')}>
                Voltar ao início
              </Button>
            </div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Checkout">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhum pagamento em aberto</h2>
            <Button variant="outline" className="w-full" onClick={() => router.push('/cliente')}>
              Voltar
            </Button>
          </div>
        </div>
      </ClientLayout>
    </ProtectedRoute>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Checkout">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
