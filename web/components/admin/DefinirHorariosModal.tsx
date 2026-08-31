'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '../Modal'
import { RiCheckFill } from 'react-icons/ri'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { AffectedClientsModal } from './AffectedClientsModal'
import { HorarioDiaCampos } from './HorarioDiaCampos'

interface DefinirHorariosModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Horario {
  dia: string
  dayOfWeek: number
  ativo: boolean
  inicio: string
  fim: string
  almoco: { inicio: string; fim: string }
}

const diasSemana = [
  { nome: 'Domingo', dayOfWeek: 0 },
  { nome: 'Segunda', dayOfWeek: 1 },
  { nome: 'Terça', dayOfWeek: 2 },
  { nome: 'Quarta', dayOfWeek: 3 },
  { nome: 'Quinta', dayOfWeek: 4 },
  { nome: 'Sexta', dayOfWeek: 5 },
  { nome: 'Sábado', dayOfWeek: 6 }
]

function slotsFromHorario(horario: Horario): Array<{ start: string; end: string }> {
  if (!horario.ativo) return []
  if (horario.almoco.inicio && horario.almoco.fim && horario.almoco.inicio !== horario.almoco.fim) {
    return [
      { start: horario.inicio, end: horario.almoco.inicio },
      { start: horario.almoco.fim, end: horario.fim },
    ]
  }
  return [{ start: horario.inicio, end: horario.fim }]
}

export function DefinirHorariosModal({ isOpen, onClose }: DefinirHorariosModalProps) {
  const { user } = useAuth()
  const [horarios, setHorarios] = useState<Horario[]>(
    diasSemana.map(dia => ({
      dia: dia.nome,
      dayOfWeek: dia.dayOfWeek,
      ativo: dia.nome !== 'Domingo',
      inicio: '08:00',
      fim: '18:00',
      almoco: { inicio: '12:00', fim: '14:00' }
    }))
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<api.ScheduleImpactItem[] | null>(null)

  const loadHorarios = useCallback(async () => {
    setLoading(true)
    try {
      interface ManagerSchedule {
        id: string
        dayOfWeek: number
        isAvailable: boolean
        availableSlots: Array<{ start: string; end: string }>
      }
      const schedules = await api.getManagerSchedule() as ManagerSchedule[]
      
      if (schedules && schedules.length > 0) {
        const horariosCarregados = diasSemana.map(dia => {
          const schedule = schedules.find(s => s.dayOfWeek === dia.dayOfWeek)
          
          if (schedule && schedule.isAvailable) {
            const slots = schedule.availableSlots as Array<{ start: string; end: string }>
            
            if (slots.length === 1) {
              return {
                dia: dia.nome,
                dayOfWeek: dia.dayOfWeek,
                ativo: true,
                inicio: slots[0].start,
                fim: slots[0].end,
                almoco: { inicio: '', fim: '' }
              }
            } else if (slots.length === 2) {
              return {
                dia: dia.nome,
                dayOfWeek: dia.dayOfWeek,
                ativo: true,
                inicio: slots[0].start,
                fim: slots[1].end,
                almoco: { inicio: slots[0].end, fim: slots[1].start }
              }
            }
          }
          
          return {
            dia: dia.nome,
            dayOfWeek: dia.dayOfWeek,
            ativo: schedule?.isAvailable || false,
            inicio: '08:00',
            fim: '18:00',
            almoco: { inicio: '12:00', fim: '14:00' }
          }
        })
        
        setHorarios(horariosCarregados)
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setPreview(null)
      loadHorarios()
    }
  }, [isOpen, loadHorarios])

  const toggleDia = (index: number) => {
    const novosHorarios = [...horarios]
    novosHorarios[index].ativo = !novosHorarios[index].ativo
    setHorarios(novosHorarios)
  }

  const updateHorario = (index: number, field: string, value: string) => {
    const novosHorarios = [...horarios]
    if (field === 'almocoInicio') {
      novosHorarios[index].almoco.inicio = value
    } else if (field === 'almocoFim') {
      novosHorarios[index].almoco.fim = value
    } else {
      novosHorarios[index][field as 'inicio' | 'fim'] = value
    }
    setHorarios(novosHorarios)
  }

  const payloadDays = () =>
    horarios.map((horario) => ({
      dayOfWeek: horario.dayOfWeek,
      isAvailable: horario.ativo,
      availableSlots: slotsFromHorario(horario),
    }))

  const applySave = async () => {
    setSaving(true)
    try {
      const result = await api.saveManagerScheduleBatch({
        days: payloadDays(),
        confirm: true,
        adminUserId: user?.id,
      })
      toast.success(
        result.canceledCount > 0
          ? `Horário salvo. ${result.canceledCount} agendamento(s) cancelado(s).`
          : 'Horário de funcionamento atualizado!'
      )
      setPreview(null)
      onClose()
    } catch (error) {
      console.error('Erro ao salvar horários:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar horários de funcionamento')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const data = await api.previewManagerSchedule(payloadDays())
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

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!preview) onClose() }} title="Horário de funcionamento" size="lg">
      <div className="mb-4">
        <p className="text-xs sm:text-sm text-slate-600">
          Este é o horário padrão da clínica. Semanas ou dias específicos podem ser ajustados na Agenda Semanal, no Home.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-3 border-rose-600 border-t-transparent animate-spin mx-auto mb-2"></div>
            <p className="text-slate-600 text-xs font-semibold">Carregando horários...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {horarios.map((horario, index) => (
            <div 
              key={horario.dia}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all ${
                horario.ativo 
                  ? 'border-indigo-200 bg-indigo-50/40 shadow-xs' 
                  : 'border-slate-200 bg-slate-50 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDia(index)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      horario.ativo ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-transparent'
                    }`}
                  >
                    <RiCheckFill className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-900 text-sm sm:text-base">{horario.dia}</span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleDia(index)}
                  className={`px-2.5 py-1 rounded-full text-xs font-extrabold cursor-pointer transition-colors ${
                    horario.ativo 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {horario.ativo ? 'Atendendo' : 'Folga'}
                </button>
              </div>

              {horario.ativo && (
                <HorarioDiaCampos
                  inicio={horario.inicio}
                  almocoInicio={horario.almoco.inicio}
                  almocoFim={horario.almoco.fim}
                  fim={horario.fim}
                  onChange={(field, value) => {
                    if (field === 'fechamento') {
                      updateHorario(index, 'fim', value)
                    } else {
                      updateHorario(index, field, value)
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
              {saving ? 'Salvando...' : 'Salvar horário de funcionamento'}
            </button>
          </div>
        </div>
      )}

      {preview && (
        <AffectedClientsModal
          affected={preview}
          message={`Ao mudar o horário padrão, ${preview.length} agendamento(s) futuros (sem personalização na Agenda Semanal) serão cancelados e receberão crédito para remarcar.`}
          confirming={saving}
          onBack={() => setPreview(null)}
          onConfirm={() => void applySave()}
        />
      )}
    </Modal>
  )
}
