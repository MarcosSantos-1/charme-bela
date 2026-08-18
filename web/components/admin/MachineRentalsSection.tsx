'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Loader2, Upload, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/Button'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'
import { fileToHomeBannerDataUrl } from '@/lib/homeBanner'
import { useAuth } from '@/contexts/AuthContext'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function statusLabel(status: api.MachineRentalStatus) {
  switch (status) {
    case 'HELD': return 'Reservado'
    case 'RELEASED': return 'Liberado'
    case 'CANCELED': return 'Cancelado'
    case 'DONE': return 'Encerrado'
    default: return status
  }
}

function kindLabel(kind: api.MachineKind) {
  return kind === 'LASER' ? 'Laser' : 'Crio'
}

export function MachineRentalsSection() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<api.MachineRentalSettings[]>([])
  const [occurrences, setOccurrences] = useState<api.MachineRentalOccurrence[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    occId: string
    newDate: string
    affected: Awaited<ReturnType<typeof api.previewMachineDateChange>>['affected']
  } | null>(null)
  const [releaseDraft, setReleaseDraft] = useState<{
    occId: string
    title: string
    imageUrl: string | null
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getMachineRentals()
      setSettings(data.settings || [])
      setOccurrences(data.occurrences || [])
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar máquinas alugadas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const byMonth = useMemo(() => {
    const map = new Map<string, api.MachineRentalOccurrence[]>()
    for (const o of occurrences) {
      const key = `${o.year}-${o.month}`
      const list = map.get(key) || []
      list.push(o)
      map.set(key, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [occurrences])

  const saveFee = async (kind: api.MachineKind, fee: number, hours: number) => {
    try {
      await api.updateMachineRentalSettings(kind, {
        lateCancelFeePercent: fee,
        lateCancelHours: hours,
      })
      toast.success(`Política de ${kindLabel(kind)} atualizada`)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar')
    }
  }

  const requestDateChange = async (occ: api.MachineRentalOccurrence, newDate: string) => {
    if (!newDate || newDate === occ.dateYmd) return
    setBusyId(occ.id)
    try {
      const data = await api.previewMachineDateChange(occ.id, newDate)
      if (data.affectedCount === 0) {
        await api.changeMachineRentalDate(occ.id, {
          newDate,
          confirm: true,
          compensation: 'credit',
          adminUserId: user?.id,
        })
        toast.success('Data atualizada')
        await load()
      } else {
        setPreview({ occId: occ.id, newDate, affected: data.affected })
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar data')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDateChange = async () => {
    if (!preview) return
    setBusyId(preview.occId)
    try {
      await api.changeMachineRentalDate(preview.occId, {
        newDate: preview.newDate,
        confirm: true,
        compensation: 'credit',
        adminUserId: user?.id,
      })
      toast.success(`Data alterada. ${preview.affected.length} agendamento(s) cancelado(s).`)
      setPreview(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao confirmar')
    } finally {
      setBusyId(null)
    }
  }

  const cancelMonth = async (occ: api.MachineRentalOccurrence) => {
    if (!window.confirm(`Cancelar a locação de ${kindLabel(occ.kind)} em ${MONTH_NAMES[occ.month - 1]}?`)) {
      return
    }
    setBusyId(occ.id)
    try {
      await api.cancelMachineRentalMonth(occ.id, {
        compensation: 'credit',
        adminUserId: user?.id,
      })
      toast.success('Mês cancelado')
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao cancelar')
    } finally {
      setBusyId(null)
    }
  }

  const doRelease = async () => {
    if (!releaseDraft) return
    setBusyId(releaseDraft.occId)
    try {
      const occ = occurrences.find((o) => o.id === releaseDraft.occId)
      await api.releaseMachineRental(releaseDraft.occId, {
        title: releaseDraft.title,
        imageUrl: releaseDraft.imageUrl || undefined,
      })
      toast.success(`${kindLabel(occ?.kind || 'LASER')} liberado para agendamento`)
      setReleaseDraft(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao liberar')
    } finally {
      setBusyId(null)
    }
  }

  const doUnrelease = async (occ: api.MachineRentalOccurrence) => {
    setBusyId(occ.id)
    try {
      await api.unreleaseMachineRental(occ.id)
      toast.success('Liberação desfeita — serviços ocultos novamente')
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Erro')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-8">
        <Loader2 className="w-5 h-5 animate-spin" />
        Carregando máquinas alugadas…
      </div>
    )
  }

  return (
    <section className="space-y-6 mb-10">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pink-600" />
          Máquinas alugadas
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Datas reservadas no calendário desde o dia 1. O agendamento só abre quando você lança o banner.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {settings.map((s) => (
          <div key={s.kind} className="rounded-xl border border-gray-200 p-4 bg-white space-y-3">
            <div className="font-semibold text-gray-900">
              {kindLabel(s.kind)}
              <span className="ml-2 text-xs font-normal text-gray-500">
                {s.exclusiveDay ? 'dia exclusivo' : 'dia compartilhado'} · default{' '}
                {s.defaultRule === 'LAST_THURSDAY' ? 'última quinta' : '2º sábado'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="text-xs text-gray-600">
                Multa tardia (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={s.lateCancelFeePercent}
                  id={`fee-${s.kind}`}
                  className="mt-1 block w-24 px-2 py-1.5 border rounded-lg text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Janela (horas)
                <input
                  type="number"
                  min={1}
                  defaultValue={s.lateCancelHours}
                  id={`hours-${s.kind}`}
                  className="mt-1 block w-24 px-2 py-1.5 border rounded-lg text-sm"
                />
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const fee = Number((document.getElementById(`fee-${s.kind}`) as HTMLInputElement)?.value)
                  const hours = Number((document.getElementById(`hours-${s.kind}`) as HTMLInputElement)?.value)
                  void saveFee(s.kind, fee, hours)
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        A janela e a multa de máquina aparecem no app ao cancelar esses serviços. No prazo, a cliente ainda escolhe reembolso ou crédito; fora do prazo o estorno é parcial com a multa.
      </p>

      {byMonth.map(([key, list]) => {
        const [y, m] = key.split('-').map(Number)
        return (
          <div key={key} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-800">
              {MONTH_NAMES[m - 1]} {y}
            </div>
            <div className="divide-y">
              {list.map((occ) => {
                const color =
                  occ.kind === 'LASER' ? 'bg-purple-500' : 'bg-sky-500'
                const canEdit = occ.status === 'HELD' || occ.status === 'RELEASED'
                return (
                  <div key={occ.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <span className={`w-3 h-3 rounded-full ${color}`} />
                      <div>
                        <div className="font-medium text-gray-900">{kindLabel(occ.kind)}</div>
                        <div className="text-xs text-gray-500">{statusLabel(occ.status)}</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Data reservada</label>
                      <input
                        type="date"
                        value={occ.dateYmd}
                        disabled={!canEdit || busyId === occ.id}
                        min={`${occ.year}-${String(occ.month).padStart(2, '0')}-01`}
                        max={`${occ.year}-${String(occ.month).padStart(2, '0')}-${String(new Date(occ.year, occ.month, 0).getDate()).padStart(2, '0')}`}
                        onChange={(e) => void requestDateChange(occ, e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Use o seletor; ao mudar, avisamos clientes afetados.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {occ.status === 'HELD' && (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busyId === occ.id}
                          onClick={() =>
                            setReleaseDraft({
                              occId: occ.id,
                              title:
                                occ.kind === 'LASER'
                                  ? 'Depilação a Laser — agende agora'
                                  : 'Criolipólise — agende agora',
                              imageUrl: occ.banner?.imageUrl || null,
                            })
                          }
                        >
                          Disponibilizar + banner
                        </Button>
                      )}
                      {occ.status === 'RELEASED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === occ.id}
                            onClick={() => void doUnrelease(occ)}
                          >
                            Pausar liberação
                          </Button>
                        </>
                      )}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === occ.id}
                          onClick={() => void cancelMonth(occ)}
                        >
                          Cancelar mês
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Laser
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Crio
        </span>
        <span className="text-gray-400">Fechado = horário da clínica (ex.: domingo)</span>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900">Clientes afetados</h3>
                <p className="text-sm text-gray-600">
                  Ao mudar para {preview.newDate}, {preview.affected.length} agendamento(s) serão
                  cancelados e receberão crédito para remarcar.
                </p>
              </div>
            </div>
            <ul className="max-h-48 overflow-y-auto text-sm space-y-2 border rounded-lg p-3">
              {preview.affected.map((a) => (
                <li key={a.appointmentId} className="border-b border-gray-100 pb-2 last:border-0">
                  <strong>{a.clientName}</strong> — {a.serviceName}
                  <div className="text-xs text-gray-500">{a.reason}</div>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Voltar
              </Button>
              <Button variant="primary" onClick={() => void confirmDateChange()}>
                Confirmar e cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {releaseDraft && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-gray-900">Lançar banner e liberar</h3>
            <input
              type="text"
              value={releaseDraft.title}
              onChange={(e) => setReleaseDraft({ ...releaseDraft, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Título do banner"
            />
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-pink-400">
              <Upload className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">
                {releaseDraft.imageUrl ? 'Imagem selecionada (trocar)' : 'Imagem 2:1 do banner'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const { dataUrl } = await fileToHomeBannerDataUrl(file)
                    setReleaseDraft({ ...releaseDraft, imageUrl: dataUrl })
                  } catch (err: any) {
                    toast.error(err.message || 'Imagem inválida')
                  }
                }}
              />
            </label>
            {releaseDraft.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={releaseDraft.imageUrl} alt="Preview" className="w-full rounded-lg aspect-[2/1] object-cover" />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReleaseDraft(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                disabled={busyId === releaseDraft.occId}
                onClick={() => void doRelease()}
              >
                Liberar
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
