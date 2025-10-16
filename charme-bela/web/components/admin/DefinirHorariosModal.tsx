'use client'

import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface DefinirHorariosModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DefinirHorariosModal({ isOpen, onClose }: DefinirHorariosModalProps) {
  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  
  const [horarios, setHorarios] = useState(
    diasSemana.map(dia => ({
      dia,
      ativo: dia !== 'Domingo',
      inicio: '08:00',
      fim: '18:00',
      almoco: { inicio: '12:00', fim: '14:00' }
    }))
  )

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

  const handleSubmit = () => {
    toast.success('Horários atualizados com sucesso!')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Definir Horários de Funcionamento" size="lg">
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
                  <label className="block text-xs text-gray-600 mb-1">Abertura</label>
                  <input
                    type="time"
                    value={horario.inicio}
                    onChange={(e) => updateHorario(index, 'inicio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fechamento</label>
                  <input
                    type="time"
                    value={horario.fim}
                    onChange={(e) => updateHorario(index, 'fim', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Almoço (início)</label>
                  <input
                    type="time"
                    value={horario.almoco.inicio}
                    onChange={(e) => updateHorario(index, 'almocoInicio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Almoço (fim)</label>
                  <input
                    type="time"
                    value={horario.almoco.fim}
                    onChange={(e) => updateHorario(index, 'almocoFim', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} className="flex-1">
            Salvar Horários
          </Button>
        </div>
      </div>
    </Modal>
  )
}


