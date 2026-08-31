'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { RiCalendarScheduleFill, RiCheckFill, RiCloseLine, RiTimeFill } from 'react-icons/ri'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'

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

export function DefinirHorariosModal({ isOpen, onClose }: DefinirHorariosModalProps) {
  const diasSemana = [
    { nome: 'Domingo', dayOfWeek: 0 },
    { nome: 'Segunda', dayOfWeek: 1 },
    { nome: 'Terça', dayOfWeek: 2 },
    { nome: 'Quarta', dayOfWeek: 3 },
    { nome: 'Quinta', dayOfWeek: 4 },
    { nome: 'Sexta', dayOfWeek: 5 },
    { nome: 'Sábado', dayOfWeek: 6 }
  ]
  
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

  const handleSubmit = async () => {
    setSaving(true)
    try {
      for (const horario of horarios) {
        const availableSlots: Array<{ start: string; end: string }> = []
        
        if (horario.ativo) {
          if (horario.almoco.inicio && horario.almoco.fim && 
              horario.almoco.inicio !== horario.almoco.fim) {
            availableSlots.push(
              { start: horario.inicio, end: horario.almoco.inicio },
              { start: horario.almoco.fim, end: horario.fim }
            )
          } else {
            availableSlots.push({ start: horario.inicio, end: horario.fim })
          }
        }
        
        await api.setManagerSchedule({
          dayOfWeek: horario.dayOfWeek,
          isAvailable: horario.ativo,
          availableSlots
        })
      }
      
      toast.success('Agenda semanal atualizada com sucesso! ✨')
      onClose()
    } catch (error) {
      console.error('Erro ao salvar horários:', error)
      toast.error('Erro ao salvar horários de funcionamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agenda Semanal & Disponibilidade" size="lg">
      <div className="mb-4">
        <p className="text-xs sm:text-sm text-slate-600">
          Ative ou desative os dias em que estará atendendo na clínica e personalize os horários de início, término e intervalo de almoço.
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-indigo-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Abertura</label>
                    <input
                      type="time"
                      value={horario.inicio}
                      onChange={(e) => updateHorario(index, 'inicio', e.target.value)}
                      className="w-full px-2.5 py-2 border-2 border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Fechamento</label>
                    <input
                      type="time"
                      value={horario.fim}
                      onChange={(e) => updateHorario(index, 'fim', e.target.value)}
                      className="w-full px-2.5 py-2 border-2 border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Almoço (início)</label>
                    <input
                      type="time"
                      value={horario.almoco.inicio}
                      onChange={(e) => updateHorario(index, 'almocoInicio', e.target.value)}
                      className="w-full px-2.5 py-2 border-2 border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Almoço (fim)</label>
                    <input
                      type="time"
                      value={horario.almoco.fim}
                      onChange={(e) => updateHorario(index, 'almocoFim', e.target.value)}
                      className="w-full px-2.5 py-2 border-2 border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white"
                      style={{ colorScheme: 'light' }}
                    />
                  </div>
                </div>
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
              {saving ? 'Salvando...' : 'Salvar Agenda Semanal'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}



