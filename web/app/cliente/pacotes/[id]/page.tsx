'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { Button } from '@/components/Button'
import { BookingModal } from '@/components/BookingModal'
import * as api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

function formatWhen(startTime: string) {
  const date = startTime.slice(0, 10)
  const time = startTime.slice(11, 16)
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
  return `${label} · ${time}`
}

export default function PacoteTimelinePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [purchase, setPurchase] = useState<api.PackagePurchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)

  const load = async () => {
    try {
      setPurchase(await api.getPackagePurchase(params.id))
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível carregar o pacote')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [params.id])

  const items = purchase?.items || purchase?.itemsSnapshot || []
  const appointments = (purchase?.appointments || []).filter((item) => item.status !== 'CANCELED')
  const nodes = purchase
    ? Array.from({ length: purchase.sessionCount }, (_, index) => {
        const sessionIndex = index + 1
        return {
          sessionIndex,
          appointment: appointments.find((item) => item.packageSessionIndex === sessionIndex),
        }
      })
    : []

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-pink-600">
            ← Voltar
          </button>
          {loading ? (
            <p className="text-gray-500">Carregando pacote…</p>
          ) : purchase ? (
            <>
              <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-pink-600 text-white p-6">
                <p className="text-sm text-white/80">Seu pacote</p>
                <h1 className="text-3xl font-bold mt-1">{purchase.packageService?.name}</h1>
                <p className="mt-3 text-lg font-semibold">
                  {purchase.sessionCount - purchase.remainingSessions}/{purchase.sessionCount} sessões
                </p>
                <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white"
                    style={{ width: `${((purchase.sessionCount - purchase.remainingSessions) / purchase.sessionCount) * 100}%` }}
                  />
                </div>
              </div>

              {items.length > 0 && (
                <div className="bg-white rounded-2xl border border-orange-100 p-5 space-y-2">
                  {items
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => (
                      <div key={`${item.serviceId}-${item.sortOrder}`} className="flex justify-between text-sm">
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="text-orange-700">{item.durationMinutes} min</span>
                      </div>
                    ))}
                  <p className="text-sm font-bold text-orange-800 pt-2">
                    {purchase.packageService?.duration} min por visita
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {nodes.map((node, index) => (
                  <div key={node.sessionIndex} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${node.appointment ? 'bg-pink-500' : 'bg-gray-300'}`} />
                      {index < nodes.length - 1 && <div className="flex-1 w-0.5 bg-pink-100 my-1" />}
                    </div>
                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 mb-2">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900">Sessão {node.sessionIndex}</p>
                        <span className="text-xs font-semibold text-gray-500">
                          {node.appointment?.status === 'COMPLETED'
                            ? 'Concluída'
                            : node.appointment
                              ? 'Agendada'
                              : 'Em aberto'}
                        </span>
                      </div>
                      {node.appointment ? (
                        <p className="text-sm text-gray-600 mt-1">{formatWhen(node.appointment.startTime)}</p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1">Escolha uma data disponível</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {purchase.remainingSessions > 0 && (
                <Button variant="primary" className="w-full" onClick={() => setBookingOpen(true)}>
                  Agendar próxima sessão
                </Button>
              )}
            </>
          ) : (
            <p className="text-gray-500">Pacote não encontrado.</p>
          )}
        </div>

        {purchase?.packageService && user?.id && (
          <BookingModal
            service={purchase.packageService}
            isOpen={bookingOpen}
            onClose={() => setBookingOpen(false)}
            hasSubscription={false}
            remainingTreatments={0}
            isIncludedInPlan={false}
            userId={user.id}
            onSuccess={() => {
              setBookingOpen(false)
              void load()
            }}
          />
        )}
      </ClientLayout>
    </ProtectedRoute>
  )
}
