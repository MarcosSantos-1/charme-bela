'use client'

import { createPortal } from 'react-dom'
import { RiAlertFill } from 'react-icons/ri'
import { Button } from '@/components/Button'
import type { ScheduleImpactItem } from '@/lib/api'

export function AffectedClientsModal({
  affected,
  message,
  confirming,
  onBack,
  onConfirm,
}: {
  affected: ScheduleImpactItem[]
  message: string
  confirming?: boolean
  onBack: () => void
  onConfirm: () => void
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-2 border-slate-200">
        <div className="flex items-start gap-3">
          <RiAlertFill className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="font-extrabold text-slate-900">Clientes afetados</h3>
            <p className="text-xs sm:text-sm text-slate-600">{message}</p>
          </div>
        </div>
        <ul className="max-h-48 overflow-y-auto text-sm space-y-2 border border-slate-200 rounded-xl p-3">
          {affected.map((item) => (
            <li key={item.appointmentId} className="border-b border-slate-100 pb-2 last:border-0">
              <strong className="text-slate-900">{item.clientName}</strong>
              {' — '}
              <span className="text-slate-600">{item.serviceName}</span>
              <div className="text-xs text-slate-400">
                {item.date.split('-').reverse().join('/')} {item.time} · {item.reason}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onBack} disabled={confirming}>
            Voltar
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Confirmando...' : 'Confirmar e cancelar'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
