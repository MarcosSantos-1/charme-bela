'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '../Modal'
import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckFill } from 'react-icons/ri'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { AffectedClientsModal } from './AffectedClientsModal'
import { HorarioDiaCampos } from './HorarioDiaCampos'

interface AgendaSemanalModalProps {
  isOpen: boolean
  onClose: () => void
}

interface DayDraft {
  date: string
  dayOfWeek: number
  name: string
  isPast: boolean
  isCustom: boolean
  useDefault: boolean
  ativo: boolean
  inicio: string
  fim: string
  almoco: { inicio: string; fim: string }
  defaultAvailable: boolean
  defaultSlots: Array<{ start: string; end: string }>
}

function todayYmd() {
  return new Date()
    .toLocaleString('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .split(',')[0]
}

function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

function mondayOf(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  return addDaysYmd(ymd, offset)
}

function formatYmdBr(ymd: string) {
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

function slotsFromDraft(day: DayDraft): Array<{ start: string; end: string }> {
  if (!day.ativo) return []
  if (day.almoco.inicio && day.almoco.fim && day.almoco.inicio !== day.almoco.fim) {
    return [
      { start: day.inicio, end: day.almoco.inicio },
      { start: day.almoco.fim, end: day.fim },
    ]
  }
  return [{ start: day.inicio, end: day.fim }]
}

function draftFromSlots(
  isAvailable: boolean,
  slots: Array<{ start: string; end: string }>
) {
  if (!isAvailable || slots.length === 0) {
    return {
      ativo: false,
      inicio: '08:00',
      fim: '18:00',
      almoco: { inicio: '12:00', fim: '14:00' },
    }
  }
  if (slots.length === 1) {
    return {
      ativo: true,
      inicio: slots[0].start,
      fim: slots[0].end,
      almoco: { inicio: '', fim: '' },
    }
  }
  return {
    ativo: true,
    inicio: slots[0].start,
    fim: slots[slots.length - 1].end,
    almoco: { inicio: slots[0].end, fim: slots[1].start },
  }
}

function toDayDraft(day: api.ScheduleWeekDay): DayDraft {
  const fields = draftFromSlots(day.isAvailable, day.availableSlots)
  return {
    date: day.date,
    dayOfWeek: day.dayOfWeek,
    name: day.name,
    isPast: day.isPast,
    isCustom: day.isCustom,
    useDefault: !day.isCustom,
    defaultAvailable: day.defaultAvailable,
    defaultSlots: day.defaultSlots,
    ...fields,
  }
}

export function AgendaSemanalModal({ isOpen, onClose }: AgendaSemanalModalProps) {
  const { user } = useAuth()
  const currentMonday = useMemo(() => mondayOf(todayYmd()), [])
  const [weekStart, setWeekStart] = useState(currentMonday)
  const [days, setDays] = useState<DayDraft[]>([])
  const [weekEnd, setWeekEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<api.ScheduleImpactItem[] | null>(null)

  const loadWeek = useCallback(async (start: string) => {
    setLoading(true)
    try {
      const data = await api.getScheduleWeek(start)
      setWeekStart(data.weekStart)
      setWeekEnd(data.weekEnd)
      setDays(data.days.map(toDayDraft))
    } catch (error) {
      console.error('Erro ao carregar agenda da semana:', error)
      toast.error('Erro ao carregar a agenda da semana')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setPreview(null)
      loadWeek(currentMonday)
    }
  }, [isOpen, currentMonday, loadWeek])

  const payloadDays = (): api.WeekDayPayload[] =>
    days.map((day) => ({
      date: day.date,
      isAvailable: day.ativo,
      availableSlots: slotsFromDraft(day),
      useDefault: day.useDefault,
    }))

  const applySave = async () => {
    setSaving(true)
    try {
      const result = await api.saveScheduleWeek({
        weekStart,
        days: payloadDays(),
        confirm: true,
        adminUserId: user?.id,
      })
      toast.success(
        result.canceledCount > 0
          ? `Agenda salva. ${result.canceledCount} agendamento(s) cancelado(s).`
          : 'Agenda da semana salva!'
      )
      setPreview(null)
      onClose()
    } catch (error) {
      console.error('Erro ao salvar agenda da semana:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar agenda da semana')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const data = await api.previewScheduleWeek({
        weekStart,
        days: payloadDays(),
      })
      if (data.affectedCount === 0) {
        await applySave()
        return
      }
      setPreview(data.affected)
    } catch (error) {
      console.error('Erro ao revisar impacto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao revisar agendamentos afetados')
    } finally {
      setSaving(false)
    }
  }

  const updateDay = (index: number, patch: Partial<DayDraft>) => {
    setDays((prev) => {
      const next = [...prev]
      if (next[index].isPast) return prev
      next[index] = { ...next[index], ...patch, useDefault: patch.useDefault ?? false, isCustom: !(patch.useDefault ?? false) }
      return next
    })
  }

  const restoreDefault = (index: number) => {
    const day = days[index]
    if (day.isPast) return
    const fields = draftFromSlots(day.defaultAvailable, day.defaultSlots)
    updateDay(index, { ...fields, useDefault: true, isCustom: false })
  }

  const canGoBack = weekStart > currentMonday

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!preview) onClose() }} title="Agenda Semanal" size="lg">
      <div className="mb-4">
        <p className="text-xs sm:text-sm text-slate-600">
          Ajuste esta semana (folga, fechar mais cedo ou ficar até mais tarde). Se o dia não for personalizado, vale o horário padrão de Configurações.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-2">
        <button
          type="button"
          onClick={() => canGoBack && loadWeek(addDaysYmd(weekStart, -7))}
          disabled={!canGoBack || loading}
          className="p-2 rounded-xl text-slate-700 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Semana anterior"
        >
          <RiArrowLeftSLine className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-extrabold text-slate-900">
            {weekEnd ? `${formatYmdBr(weekStart)} — ${formatYmdBr(weekEnd)}` : 'Carregando...'}
          </p>
          <p className="text-[11px] font-semibold text-slate-500">Segunda a domingo</p>
        </div>
        <button
          type="button"
          onClick={() => loadWeek(addDaysYmd(weekStart, 7))}
          disabled={loading}
          className="p-2 rounded-xl text-slate-700 hover:bg-white disabled:opacity-40"
          aria-label="Próxima semana"
        >
          <RiArrowRightSLine className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-3 border-rose-600 border-t-transparent animate-spin mx-auto mb-2"></div>
            <p className="text-slate-600 text-xs font-semibold">Carregando semana...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {days.map((day, index) => (
            <div
              key={day.date}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all ${
                day.isPast
                  ? 'border-slate-200 bg-slate-50 opacity-70'
                  : day.ativo
                    ? 'border-indigo-200 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    disabled={day.isPast}
                    onClick={() => updateDay(index, { ativo: !day.ativo, useDefault: false, isCustom: true })}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      day.ativo ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-transparent'
                    } disabled:cursor-not-allowed`}
                  >
                    <RiCheckFill className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      {day.name} · {formatYmdBr(day.date).slice(0, 5)}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        day.useDefault ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white'
                      }`}>
                        {day.useDefault ? 'Padrão' : 'Personalizado'}
                      </span>
                      {day.isPast && (
                        <span className="text-[10px] font-bold text-slate-500">Passado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!day.useDefault && !day.isPast && (
                    <button
                      type="button"
                      onClick={() => restoreDefault(index)}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900"
                    >
                      Usar padrão
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={day.isPast}
                    onClick={() => updateDay(index, { ativo: !day.ativo, useDefault: false, isCustom: true })}
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold cursor-pointer transition-colors disabled:cursor-not-allowed ${
                      day.ativo
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {day.ativo ? 'Atendendo' : 'Folga'}
                  </button>
                </div>
              </div>

              {day.ativo && (
                <HorarioDiaCampos
                  inicio={day.inicio}
                  almocoInicio={day.almoco.inicio}
                  almocoFim={day.almoco.fim}
                  fim={day.fim}
                  disabled={day.isPast}
                  onChange={(field, value) => {
                    if (field === 'almocoInicio') {
                      updateDay(index, { almoco: { ...day.almoco, inicio: value }, useDefault: false, isCustom: true })
                    } else if (field === 'almocoFim') {
                      updateDay(index, { almoco: { ...day.almoco, fim: value }, useDefault: false, isCustom: true })
                    } else if (field === 'fechamento') {
                      updateDay(index, { fim: value, useDefault: false, isCustom: true })
                    } else {
                      updateDay(index, { inicio: value, useDefault: false, isCustom: true })
                    }
                  }}
                />
              )}
            </div>
          ))}

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 active:scale-95 transition-all"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-xs shadow-md shadow-rose-600/25 hover:from-rose-700 hover:to-pink-700 active:scale-95 transition-all disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar agenda da semana'}
            </button>
          </div>
        </div>
      )}

      {preview && (
        <AffectedClientsModal
          affected={preview}
          message={`Ao salvar esta semana, ${preview.length} agendamento(s) serão cancelados e receberão crédito para remarcar.`}
          confirming={saving}
          onBack={() => setPreview(null)}
          onConfirm={() => void applySave()}
        />
      )}
    </Modal>
  )
}
