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

function PayCheckout({
  paymentId,
  appointmentId,
  cardOnly,
}: {
  paymentId: string
  appointmentId: string | null
  cardOnly: boolean
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [paid, setPaid] = useState(false)
  const [amount, setAmount] = useState(0)
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)
  const [pixCopy, setPixCopy] = useState<string | null>(null)
  const [pixQr, setPixQr] = useState<string | null>(null)
  const [savedCards, setSavedCards] = useState<api.PaymentMethod[]>([])
  const [chargingSavedId, setChargingSavedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    api.getPaymentMethods(user.id).then((methods) => {
      setSavedCards(methods.filter((method) => method.last4))
    }).catch(() => setSavedCards([]))
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const status = await api.getPaymentStatus(paymentId)
        if (cancelled) return
        setAmount(status.value || 0)
        if (status.invoiceUrl) setInvoiceUrl(status.invoiceUrl)
        const cardBilling = status.billingType === 'credit_card' || status.billingType === 'debit_card'
        if (!cardOnly && !cardBilling) {
          if (status.pixCopyPaste) setPixCopy(status.pixCopyPaste)
          if (status.pixQrBase64) setPixQr(status.pixQrBase64)
        }
        setLoading(false)
        if (status.paid) {
          setPaid(true)
          setTimeout(() => router.push(cardOnly ? '/cliente/plano' : '/cliente'), 1800)
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
  }, [cardOnly, paymentId, router])

  const payWithSaved = async (card: api.PaymentMethod) => {
    if (!user || chargingSavedId) return
    setChargingSavedId(card.id)
    try {
      const result = await api.chargeSavedCard({
        userId: user.id,
        paymentId,
        appointmentId: appointmentId || undefined,
        savedCardId: card.id,
      })
      if (result.paid) {
        setPaid(true)
        toast.success('Cartão cobrado')
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
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento confirmado</h2>
        <p className="text-gray-600">{cardOnly ? 'Sua assinatura está ativa.' : 'Seu horário está reservado.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-pink-500 to-pink-700 rounded-2xl p-6 text-white">
        <p className="text-sm font-medium text-pink-100">Valor a pagar</p>
        <p className="text-4xl font-extrabold mt-1">
          {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
        <p className="text-sm text-pink-100 mt-2">
          {cardOnly
            ? 'Assinatura no cartão de crédito. Débito não renova o plano.'
            : 'Pague com Pix nesta tela ou crédito/débito no checkout seguro.'}
        </p>
      </div>

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

      {savedCards.map((card) => {
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
                Pagar agora com {cardBrandLabel(card.brand)} •••• {card.last4}
              </p>
              <p className="text-sm text-pink-100">
                {card.isDefault ? 'Cartão principal · um clique' : 'Um clique. Sem preencher de novo.'}
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
              {cardOnly
                ? 'A assinatura renova no crédito. Cartões novos também ficam salvos.'
                : 'Crédito ou débito no checkout seguro. Cartão de crédito fica salvo para a próxima.'}
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
  const cardOnly = searchParams.get('plan') === '1'
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
            <PayCheckout paymentId={paymentId} appointmentId={appointmentId} cardOnly={cardOnly} />
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
              <p className="text-gray-600 mb-6">Agora você pode acompanhar seus agendamentos.</p>
              <Button variant="primary" className="w-full" onClick={() => router.push('/cliente')}>
                Ir para a área do cliente
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
