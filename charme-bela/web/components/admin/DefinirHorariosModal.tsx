'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Loader2 } from 'lucide-react'
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
            
            // Se há 1 período, é das início ao fim (sem almoço configurado)
            // Se há 2 períodos, o primeiro é manhã e o segundo tarde (com intervalo de almoço)
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

  // Carregar horários ao abrir o modal
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
      // Salvar cada dia da semana
      for (const horario of horarios) {
        const availableSlots: Array<{ start: string; end: string }> = []
        
        if (horario.ativo) {
          // Se tem horário de almoço configurado, cria 2 períodos
          if (horario.almoco.inicio && horario.almoco.fim && 
              horario.almoco.inicio !== horario.almoco.fim) {
            availableSlots.push(
              { start: horario.inicio, end: horario.almoco.inicio },
              { start: horario.almoco.fim, end: horario.fim }
            )
          } else {
            // Sem intervalo de almoço, cria 1 período contínuo
            availableSlots.push({ start: horario.inicio, end: horario.fim })
          }
        }
        
        await api.setManagerSchedule({
          dayOfWeek: horario.dayOfWeek,
          isAvailable: horario.ativo,
          availableSlots
        })
      }
      
      toast.success('Horários de funcionamento atualizados com sucesso! 🎉')
      onClose()
    } catch (error) {
      console.error('Erro ao salvar horários:', error)
      toast.error('Erro ao salvar horários de funcionamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Definir Horários de Funcionamento" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">Carregando horários...</p>
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        {horarios.map((horario, index) => (
          <div 
            key={horario.dia}
            className={`p-4 rounded-xl border-2 ${
              horario.ativo ? 'border-pink-200 bg-pink-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={horario.ativo}
                  onChange={() => toggleDia(index)}
                  className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                />
                <span className="font-semibold text-gray-900">{horario.dia}</span>
              </label>
            </div>

            {horario.ativo && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Abertura</label>
                  <input
                    type="time"
                    value={horario.inicio}
                    onChange={(e) => updateHorario(index, 'inicio', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 font-semibold focus:ring-2 focus:ring-pink-500 focus:border-pink-400 bg-white"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fechamento</label>
                  <input
                    type="time"
                    value={horario.fim}
                    onChange={(e) => updateHorario(index, 'fim', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 font-semibold focus:ring-2 focus:ring-pink-500 focus:border-pink-400 bg-white"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Almoço (início)</label>
                  <input
                    type="time"
                    value={horario.almoco.inicio}
                    onChange={(e) => updateHorario(index, 'almocoInicio', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 font-semibold focus:ring-2 focus:ring-pink-500 focus:border-pink-400 bg-white"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Almoço (fim)</label>
                  <input
                    type="time"
                    value={horario.almoco.fim}
                    onChange={(e) => updateHorario(index, 'almocoFim', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-900 font-semibold focus:ring-2 focus:ring-pink-500 focus:border-pink-400 bg-white"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} className="flex-1" isLoading={saving}>
            {saving ? 'Salvando...' : 'Salvar Horários'}
          </Button>
        </div>
      </div>
      )}
    </Modal>
  )
}


