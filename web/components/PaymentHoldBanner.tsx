'use client'

import { useEffect, useState } from 'react'
import { Clock, CreditCard, Loader } from 'lucide-react'
import { Button } from './Button'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'

/** Hold ativo: PENDING + payment PENDING + paymentExpiresAt no futuro. */
export function isOnlinePaymentHold(apt: {
  status: string
  paymentStatus?: string | null
  paymentExpiresAt?: string | null
  origin?: string
}): boolean {
  if (apt.origin === 'ADMIN_CREATED') return false
  if (apt.status !== 'PENDING' || apt.paymentStatus !== 'PENDING' || !apt.paymentExpiresAt) return false
  return new Date(apt.paymentExpiresAt).getTime() > Date.now()
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface PaymentHoldBannerProps {
  appointment: {
    id: string
    userId: string
    serviceId: string
    paymentAmount?: number | null
    paymentExpiresAt?: string | null
    service?: { id?: string; name?: string; price?: number } | null
  }
  onExpired?: () => void
  onPaidRedirect?: () => void
  compact?: boolean
}

export function PaymentHoldBanner({
  appointment,
  onExpired,
  compact = false
}: PaymentHoldBannerProps) {
  const expiresAt = appointment.paymentExpiresAt
    ? new Date(appointment.paymentExpiresAt).getTime()
    : 0
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAt - Date.now()))
  const [paying, setPaying] = useState(false)
  const [expired, setExpired] = useState(remainingMs <= 0)

  useEffect(() => {
    if (!expiresAt) return

    const tick = () => {
      const left = Math.max(0, expiresAt - Date.now())
      setRemainingMs(left)
      if (left <= 0) {
        setExpired(true)
        onExpired?.()
      }
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [expiresAt, onExpired])

  const handlePay = async () => {
    if (paying || expired) return
    setPaying(true)
    try {
      const amount = appointment.paymentAmount ?? appointment.service?.price
      const session = await api.createPaymentSession(
        appointment.userId,
        appointment.serviceId,
        appointment.id,
        amount ?? undefined
      )
      if (session?.paymentId) {
        window.location.href = `/cliente/checkout?paymentId=${encodeURIComponent(session.paymentId)}&appointmentId=${encodeURIComponent(appointment.id)}`
        return
      }
      throw new Error('Não foi possível abrir o checkout')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao retomar o pagamento')
      setPaying(false)
    }
  }

  if (expired) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 ${compact ? 'p-2' : 'p-3'} mb-3`}>
        <p className="text-xs text-red-800 font-medium">
          Tempo esgotado — esta reserva será cancelada automaticamente. Escolha outro horário.
        </p>
      </div>
    )
  }

  const urgent = remainingMs < 60_000

  return (
    <div
      className={`rounded-lg border-2 mb-3 ${
        urgent ? 'border-red-400 bg-red-50' : 'border-orange-400 bg-orange-50'
      } ${compact ? 'p-2.5' : 'p-3'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-orange-900 uppercase tracking-wide">
              Pagamento pendente
            </span>
            <span
              className={`inline-flex items-center gap-1 text-sm font-mono font-bold tabular-nums ${
                urgent ? 'text-red-700' : 'text-orange-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {formatCountdown(remainingMs)}
            </span>
          </div>
          <p className="text-xs text-orange-900/80 mt-1">
            Conclua o pagamento ou o horário será liberado automaticamente.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            void handlePay()
          }}
          disabled={paying}
          className="shrink-0"
        >
          {paying ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-1" />
              Pagar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
