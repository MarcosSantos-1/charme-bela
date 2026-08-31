'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiCalendar2Fill,
  RiLoader4Line,
  RiUploadCloud2Fill,
  RiAlertFill,
  RiSettings4Fill,
  RiArrowDownSLine,
  RiCheckboxCircleFill,
  RiTimeFill,
  RiCloseLine,
} from 'react-icons/ri'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import DatePicker from '@/components/DatePicker'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'
import { fileToHomeBannerDataUrl } from '@/lib/homeBanner'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'

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
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [expandedMonths, setExpandedMonths] = useState<string[]>([])
  
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

  // Set default expanded months (expand upcoming/active months, collapse closed/done months)
  useEffect(() => {
    if (byMonth.length > 0 && expandedMonths.length === 0) {
      const now = new Date()
      const currentYearMonth = `${now.getFullYear()}-${now.getMonth() + 1}`
      const autoExpanded = byMonth
        .filter(([key, list]) => {
          const allDone = list.every(o => o.status === 'DONE' || o.status === 'CANCELED')
          return !allDone || key >= currentYearMonth
        })
        .map(([key]) => key)
      setExpandedMonths(autoExpanded.length > 0 ? autoExpanded : [byMonth[byMonth.length - 1][0]])
    }
  }, [byMonth, expandedMonths.length])

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const saveFee = async (kind: api.MachineKind, fee: number, hours: number) => {
    try {
      await api.updateMachineRentalSettings(kind, {
        lateCancelFeePercent: fee,
        lateCancelHours: hours,
      })
      toast.success(`Política de ${kindLabel(kind)} atualizada com sucesso`)
      await load()
      setShowSettingsModal(false)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar configurações')
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
        toast.success('Data da máquina atualizada!')
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
      toast.success(`${kindLabel(occ?.kind || 'LASER')} liberado para agendamento!`)
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
      <div className="flex items-center gap-2 text-slate-500 py-8">
        <RiLoader4Line className="w-5 h-5 animate-spin text-rose-600" />
        <span className="text-xs font-bold">Carregando máquinas alugadas…</span>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      {/* Header com botão de configurações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <RiCalendar2Fill className="w-5 h-5 text-rose-600" />
            Máquinas Alugadas (Laser & Crio)
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Datas reservadas no calendário. O agendamento abre aos clientes após lançar o banner.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-all active:scale-95 touch-manipulation cursor-pointer border border-slate-300 self-start sm:self-auto"
          title="Configurar multas e janelas de cancelamento"
        >
          <RiSettings4Fill className="w-4 h-4 text-slate-600" />
          <span>Políticas de Multa / Janela</span>
        </button>
      </div>

      {/* Meses em Accordion */}
      <div className="space-y-3">
        {byMonth.map(([key, list]) => {
          const [y, m] = key.split('-').map(Number)
          const isExpanded = expandedMonths.includes(key)
          const allDone = list.every(o => o.status === 'DONE' || o.status === 'CANCELED')
          const monthTitle = `${MONTH_NAMES[m - 1]} de ${y}`

          return (
            <div
              key={key}
              className={`bg-white rounded-2xl border-2 transition-all shadow-xs overflow-hidden ${
                allDone ? 'border-slate-200 opacity-90' : 'border-slate-200'
              }`}
            >
              {/* Month Header / Toggle */}
              <button
                type="button"
                onClick={() => toggleMonth(key)}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors text-left ${
                  allDone
                    ? 'bg-slate-50 hover:bg-slate-100'
                    : 'bg-gradient-to-r from-rose-50/70 via-pink-50/30 to-white hover:from-rose-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${allDone ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {monthTitle}
                  </span>
                  {allDone && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-md">
                      Encerrado
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {list.length} máquina(s)
                  </span>
                  <RiArrowDownSLine
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Month Occurrences */}
              {isExpanded && (
                <div className="p-3 sm:p-4 divide-y divide-slate-100 bg-white">
                  {list.map((occ) => {
                    const isLaser = occ.kind === 'LASER'
                    const canEdit = occ.status === 'HELD' || occ.status === 'RELEASED'
                    const occurrenceDate = (() => {
                      const [yr, mo, da] = occ.dateYmd.split('-').map(Number)
                      return new Date(yr, mo - 1, da)
                    })()

                    return (
                      <div
                        key={occ.id}
                        className="py-3.5 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                      >
                        {/* Info Machine */}
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs shadow-xs text-white shrink-0 ${
                              isLaser ? 'bg-purple-600' : 'bg-sky-600'
                            }`}
                          >
                            {isLaser ? 'LASER' : 'CRIO'}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{kindLabel(occ.kind)}</span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                  occ.status === 'RELEASED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : occ.status === 'HELD'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {statusLabel(occ.status)}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-0.5">
                              {occ.dateYmd ? format(occurrenceDate, 'dd/MM/yyyy') : 'Data não definida'}
                            </div>
                          </div>
                        </div>

                        {/* Datepicker do Sistema */}
                        <div className="w-full md:w-64">
                          <label className="text-[11px] font-bold text-slate-500 block mb-1">
                            Alterar data reservada:
                          </label>
                          {canEdit ? (
                            <DatePicker
                              value={occurrenceDate}
                              onChange={(d) => {
                                if (d) {
                                  const ymd = format(d, 'yyyy-MM-dd')
                                  void requestDateChange(occ, ymd)
                                }
                              }}
                              minDate={new Date(occ.year, occ.month - 1, 1)}
                              maxDate={new Date(occ.year, occ.month, 0)}
                              placeholder="Selecione a data"
                            />
                          ) : (
                            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500">
                              {format(occurrenceDate, 'dd/MM/yyyy')} (Fechado)
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {occ.status === 'HELD' && (
                            <button
                              type="button"
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
                              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all touch-manipulation cursor-pointer disabled:opacity-50"
                            >
                              Disponibilizar + banner
                            </button>
                          )}

                          {occ.status === 'RELEASED' && (
                            <button
                              type="button"
                              disabled={busyId === occ.id}
                              onClick={() => void doUnrelease(occ)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold active:scale-95 transition-all touch-manipulation cursor-pointer"
                            >
                              Pausar liberação
                            </button>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              disabled={busyId === occ.id}
                              onClick={() => void cancelMonth(occ)}
                              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors touch-manipulation cursor-pointer"
                            >
                              Cancelar mês
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de Políticas de Máquinas (Multa & Janela) */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Políticas de Máquinas (Multas & Janela)"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600">
            Defina o prazo de cancelamento e porcentagem de multa retida para tratamentos especiais de máquinas alugadas.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {settings.map((s) => (
              <div key={s.kind} className="rounded-2xl border-2 border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-base">
                    {kindLabel(s.kind)}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    {s.exclusiveDay ? 'Dia Exclusivo' : 'Dia Compartilhado'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Multa Tardia (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={s.lateCancelFeePercent}
                      id={`fee-${s.kind}`}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Janela Mínima (horas de antecedência)
                    </label>
                    <input
                      type="number"
                      min={1}
                      defaultValue={s.lateCancelHours}
                      id={`hours-${s.kind}`}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-base sm:text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full text-xs font-bold"
                    onClick={() => {
                      const fee = Number((document.getElementById(`fee-${s.kind}`) as HTMLInputElement)?.value)
                      const hours = Number((document.getElementById(`hours-${s.kind}`) as HTMLInputElement)?.value)
                      void saveFee(s.kind, fee, hours)
                    }}
                  >
                    Salvar {kindLabel(s.kind)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal Preview Date Change */}
      {preview && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-2 border-slate-200">
            <div className="flex items-start gap-3">
              <RiAlertFill className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-extrabold text-slate-900">Clientes afetados</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Ao mudar para {preview.newDate}, {preview.affected.length} agendamento(s) serão
                  cancelados e receberão crédito para remarcar.
                </p>
              </div>
            </div>
            <ul className="max-h-48 overflow-y-auto text-sm space-y-2 border border-slate-200 rounded-xl p-3">
              {preview.affected.map((a) => (
                <li key={a.appointmentId} className="border-b border-slate-100 pb-2 last:border-0">
                  <strong className="text-slate-900">{a.clientName}</strong> — <span className="text-slate-600">{a.serviceName}</span>
                  <div className="text-xs text-slate-400">{a.reason}</div>
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

      {/* Modal Release Draft */}
      {releaseDraft && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border-2 border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900">Lançar banner e liberar</h3>
              <button
                onClick={() => setReleaseDraft(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={releaseDraft.title}
              onChange={(e) => setReleaseDraft({ ...releaseDraft, title: e.target.value })}
              className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-900 bg-white"
              placeholder="Título do banner"
            />
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-6 cursor-pointer hover:border-rose-400 bg-slate-50 transition-colors">
              <RiUploadCloud2Fill className="w-8 h-8 text-rose-500 mb-2" />
              <span className="text-xs font-bold text-slate-700 text-center">
                {releaseDraft.imageUrl ? 'Imagem selecionada (clique para trocar)' : 'Selecionar Imagem 2:1 do banner'}
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
              <img src={releaseDraft.imageUrl} alt="Preview" className="w-full rounded-xl aspect-[2/1] object-cover border" />
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
