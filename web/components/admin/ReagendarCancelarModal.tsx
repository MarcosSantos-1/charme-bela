'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Calendar, Clock, AlertTriangle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import * as api from '@/lib/api'

interface ReagendarCancelarModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  agendamento?: {
    id: string
    cliente: string
    servico: string
    data: string
    hora: string
    status?: string
    origin?: 'SUBSCRIPTION' | 'SINGLE' | 'VOUCHER' | 'ADMIN_CREATED' | 'PACKAGE'
    paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
    paymentAmount?: number
    startTime?: Date | string
    machineKind?: 'LASER' | 'CRYO' | null
    cancelPolicy?: {
      kind: 'machine' | 'standard'
      minCancellationHours?: number
      lateCancelHours?: number
      lateCancelFeePercent?: number
      text: string
      onTimeText?: string
      latePaidText?: string
      latePlanText?: string
    }
  }
}

export function ReagendarCancelarModal({ isOpen, onClose, onSuccess, agendamento }: ReagendarCancelarModalProps) {
  const [acao, setAcao] = useState<'reagendar' | 'cancelar' | 'concluir'>('reagendar')
  const [novaData, setNovaData] = useState<Date | undefined>(undefined)
  const [novaHora, setNovaHora] = useState('')
  const [motivo, setMotivo] = useState('')
  const [settlement, setSettlement] = useState<'REFUND' | 'CREDIT'>('REFUND')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])

  useEffect(() => {
    if (novaData && acao === 'reagendar') {
      loadAvailableSlots()
    }
  }, [novaData, acao])

  const loadAvailableSlots = async () => {
    if (!novaData || !agendamento) return
    
    setLoadingSlots(true)
    try {
      const dateStr = novaData.toISOString().split('T')[0]
      // Admin usa endpoint especial com horários 6h-21h
      const result = await api.getAdminAvailableSlots(dateStr)
      
      let slots = result.slots || []
      
      // Se for hoje, filtrar horários que já passaram (igual na área do cliente)
      const now = new Date()
      const isToday = novaData.toDateString() === now.toDateString()
      
      if (isToday) {
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTimeInMinutes = currentHour * 60 + currentMinute
        
        slots = slots.filter(slot => {
          const [hour, minute] = slot.split(':').map(Number)
          const slotTimeInMinutes = hour * 60 + minute
          // Filtrar horários que já passaram + 30min de antecedência mínima
          return slotTimeInMinutes > currentTimeInMinutes + 30
        })
      }
      
      setAvailableSlots(slots)
      setBookedSlots(result.bookedSlots || [])
      
      console.log('Horários disponíveis (após filtro):', slots)
      console.log('Horários ocupados:', result.bookedSlots)
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
      toast.error('Erro ao carregar horários disponíveis')
      setAvailableSlots([])
      setBookedSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  // Combinar todos os horários (disponíveis + ocupados)
  const getAllSlots = () => {
    const combined = [...availableSlots, ...bookedSlots]
    const unique = Array.from(new Set(combined))
    return unique.sort()
  }

  const isSlotBooked = (slot: string) => bookedSlots.includes(slot)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agendamento) return
    
    setLoadingSlots(true)
    try {
      if (acao === 'reagendar') {
        if (!novaData || !novaHora) {
          toast.error('Selecione nova data e horário')
          return
        }
        
        // Criar novo startTime - IMPORTANTE: Força UTC para evitar problemas de timezone
        const dateStr = novaData.toISOString().split('T')[0]
        const newStartTime = new Date(`${dateStr}T${novaHora}:00.000Z`)
        
        console.log('🕐 Reagendando para:', {
          dateStr,
          hora: novaHora,
          startTime: newStartTime.toISOString(),
          local: newStartTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })
        
        // Calcular endTime (assumindo duração padrão de 60min - o backend vai calcular correto)
        const newEndTime = new Date(newStartTime)
        newEndTime.setMinutes(newEndTime.getMinutes() + 60)
        
        await api.rescheduleAppointment(
          agendamento.id, 
          newStartTime.toISOString(),
          newEndTime.toISOString()
        )
        
        toast.success('Agendamento reagendado com sucesso!')
      } else if (acao === 'cancelar') {
        await api.cancelAppointment(agendamento.id, {
          canceledBy: 'admin',
          cancelReason: motivo || 'Cancelado pelo admin',
          ...(needsSettlement ? { settlement } : {}),
        })
        
        toast.success('Agendamento cancelado')
      } else if (acao === 'concluir') {
        await api.completeAppointment(agendamento.id)
        
        toast.success('Tratamento marcado como concluído! ✅')
      }
      
      resetForm()
      if (onSuccess) onSuccess() // Notificar sucesso
      onClose()
    } catch (error: any) {
      console.error('Erro ao processar agendamento:', error)
      toast.error(error.message || 'Erro ao processar agendamento')
    } finally {
      setLoadingSlots(false)
    }
  }

  const resetForm = () => {
    setAcao('reagendar')
    setNovaData(undefined)
    setNovaHora('')
    setMotivo('')
    setSettlement('REFUND')
    setAvailableSlots([])
    setBookedSlots([])
  }

  const isCompletedOrCanceled = agendamento?.status === 'completed' || agendamento?.status === 'canceled'
  const isPaidAvulso = agendamento?.origin === 'SINGLE' && agendamento?.paymentStatus === 'PAID'
  const minHours =
    agendamento?.cancelPolicy?.kind === 'machine'
      ? agendamento.cancelPolicy.lateCancelHours || 24
      : agendamento?.cancelPolicy?.minCancellationHours || 4
  const feePercent =
    agendamento?.cancelPolicy?.kind === 'machine' ? agendamento.cancelPolicy.lateCancelFeePercent || 25 : 0
  const hoursUntil = (() => {
    if (!agendamento?.startTime) return null
    const start = agendamento.startTime
    if (start instanceof Date) return (start.getTime() - Date.now()) / 36e5
    const parts = String(start).match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (!parts) return (new Date(start).getTime() - Date.now()) / 36e5
    const local = new Date(
      Number(parts[1]),
      Number(parts[2]) - 1,
      Number(parts[3]),
      Number(parts[4]),
      Number(parts[5]),
    )
    return (local.getTime() - Date.now()) / 36e5
  })()
  const isLate = hoursUntil != null && hoursUntil < minHours
  const isMachine = agendamento?.cancelPolicy?.kind === 'machine' || Boolean(agendamento?.machineKind)
  const machineLateRefund = Boolean(isPaidAvulso && isMachine && isLate)
  const needsSettlement = Boolean(isPaidAvulso && !machineLateRefund && !isLate)
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Agendamento" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info do agendamento atual */}
        {agendamento && (
          <div className={`border rounded-xl p-4 mb-4 ${
            agendamento.status === 'completed' ? 'bg-green-50 border-green-200' :
            agendamento.status === 'canceled' ? 'bg-red-50 border-red-200' :
            'bg-pink-50 border-pink-200'
          }`}>
            <h3 className="font-semibold text-gray-900 mb-2">Agendamento Atual:</h3>
            <p className="text-sm text-gray-700">Cliente: <strong>{agendamento.cliente}</strong></p>
            <p className="text-sm text-gray-700">Serviço: {agendamento.servico}</p>
            <p className="text-sm text-gray-700">Data: {agendamento.data} às {agendamento.hora}</p>
            {agendamento.status === 'completed' && (
              <p className="text-sm text-green-700 font-semibold mt-2">✅ Tratamento Concluído</p>
            )}
            {agendamento.status === 'canceled' && (
              <p className="text-sm text-red-700 font-semibold mt-2">❌ Tratamento Cancelado</p>
            )}
          </div>
        )}
        
        {/* Aviso se concluído ou cancelado */}
        {isCompletedOrCanceled && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700 text-center">
              Este agendamento já foi {agendamento?.status === 'completed' ? 'concluído' : 'cancelado'} e não pode mais ser alterado.
            </p>
          </div>
        )}

        {/* Escolher ação - não mostra se concluído/cancelado */}
        {!isCompletedOrCanceled && (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setAcao('reagendar')}
            className={`py-2.5 px-3 rounded-lg border-2 font-medium transition-all text-xs ${
              acao === 'reagendar'
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-pink-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Reagendar
          </button>
          <button
            type="button"
            onClick={() => setAcao('concluir')}
            className={`py-2.5 px-3 rounded-lg border-2 font-medium transition-all text-xs ${
              acao === 'concluir'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 inline mr-1" />
            Concluir
          </button>
          <button
            type="button"
            onClick={() => setAcao('cancelar')}
            className={`py-2.5 px-3 rounded-lg border-2 font-medium transition-all text-xs ${
              acao === 'cancelar'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Cancelar
          </button>
        </div>
        )}

        {/* Se reagendar */}
        {!isCompletedOrCanceled && acao === 'reagendar' && (
          <div className="space-y-4">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Nova Data *
              </label>
              <div className="custom-datepicker-wrapper">
                <ReactDatePicker
                  selected={novaData}
                  onChange={(date) => {
                    setNovaData(date || undefined)
                    setNovaHora('') // Reset hora quando muda a data
                  }}
                  minDate={new Date()} // Bloqueia datas passadas
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecione a nova data"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 font-medium bg-white hover:border-pink-400 transition-colors cursor-pointer"
                  calendarClassName="custom-calendar"
                  inline={false}
                  showPopperArrow={false}
                />
              </div>
              <style jsx global>{`
                .custom-datepicker-wrapper .react-datepicker-wrapper {
                  width: 100%;
                }
                .custom-datepicker-wrapper input {
                  width: 100%;
                }
                .react-datepicker {
                  border: 2px solid #e5e7eb;
                  border-radius: 12px;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                  font-family: inherit;
                }
                .react-datepicker__header {
                  background-color: #ec4899;
                  border-bottom: none;
                  border-radius: 10px 10px 0 0;
                  padding-top: 12px;
                }
                .react-datepicker__current-month,
                .react-datepicker__day-name {
                  color: white;
                  font-weight: 600;
                }
                .react-datepicker__day {
                  color: #374151;
                  font-weight: 500;
                  border-radius: 8px;
                  margin: 2px;
                }
                .react-datepicker__day:hover {
                  background-color: #fce7f3;
                  color: #ec4899;
                }
                .react-datepicker__day--selected {
                  background-color: #ec4899 !important;
                  color: white !important;
                  font-weight: 700;
                }
                .react-datepicker__day--keyboard-selected {
                  background-color: #fbcfe8;
                  color: #be185d;
                }
                .react-datepicker__day--disabled {
                  color: #d1d5db !important;
                  background-color: #f9fafb !important;
                  cursor: not-allowed !important;
                  pointer-events: none;
                }
                .react-datepicker__day--disabled:hover {
                  background-color: #f9fafb !important;
                  color: #d1d5db !important;
                }
                .react-datepicker__navigation-icon::before {
                  border-color: white;
                }
                .react-datepicker__navigation:hover *::before {
                  border-color: #fce7f3;
                }
              `}</style>
            </div>

            {/* Horários Disponíveis */}
            {novaData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⏰ Novo Horário *
                </label>

                {loadingSlots ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Loader className="w-8 h-8 animate-spin text-pink-600 mx-auto" />
                    <p className="text-sm text-gray-600 mt-2">Buscando horários...</p>
                  </div>
                ) : getAllSlots().length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {getAllSlots().map((slot) => {
                        const isBooked = isSlotBooked(slot)
                        
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => !isBooked && setNovaHora(slot)}
                            disabled={isBooked}
                            className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${
                              isBooked
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
                                : novaHora === slot
                                ? 'bg-pink-600 text-white shadow-md'
                                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-pink-500'
                            }`}
                          >
                            {slot}
                            {isBooked && (
                              <span className="block text-xs mt-0.5">Ocupado</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    
                    {/* Legenda */}
                    <div className="flex items-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
                        <span className="text-gray-600">Disponível</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-pink-600 rounded"></div>
                        <span className="text-gray-600">Selecionado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded"></div>
                        <span className="text-gray-600">Ocupado</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <p className="text-gray-600">Nenhum horário disponível para esta data</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confirmação (para concluir) */}
        {!isCompletedOrCanceled && acao === 'concluir' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              ✅ Confirme que o tratamento foi <strong>concluído com sucesso</strong>. Esta ação marcará o agendamento como finalizado.
            </p>
          </div>
        )}
        
        {/* Motivo (para cancelamento) */}
        {!isCompletedOrCanceled && acao === 'cancelar' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo do Cancelamento
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo (opcional)"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
            />
            {machineLateRefund && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {agendamento?.cancelPolicy?.kind === 'machine'
                  ? agendamento.cancelPolicy.latePaidText
                  : `Tratamento especial: faltam menos de ${minHours}h. O estorno sai em dinheiro com multa de ${feePercent}%. Não há crédito neste caso.`}
              </div>
            )}
            {isPaidAvulso && isLate && !isMachine && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {agendamento?.cancelPolicy?.kind === 'standard'
                  ? agendamento.cancelPolicy.latePaidText
                  : `Faltam menos de ${minHours}h. Sem reembolso em dinheiro — o valor vira crédito.`}
              </div>
            )}
            {needsSettlement && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-800">
                  Avulso pago{agendamento?.paymentAmount != null ? ` (R$ ${agendamento.paymentAmount.toFixed(2).replace('.', ',')})` : ''}, com antecedência suficiente. Como devolver?
                </p>
                {agendamento?.cancelPolicy?.onTimeText ? (
                  <p className="text-xs text-gray-600">{agendamento.cancelPolicy.onTimeText}</p>
                ) : null}
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="settlement"
                    checked={settlement === 'REFUND'}
                    onChange={() => setSettlement('REFUND')}
                    className="mt-1"
                  />
                  <span>Reembolso em dinheiro (Asaas). Sem aprovação — se falhar, aparece flag para estorno manual.</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="settlement"
                    checked={settlement === 'CREDIT'}
                    onChange={() => setSettlement('CREDIT')}
                    className="mt-1"
                  />
                  <span>Crédito na clínica para outros procedimentos (até zerar o valor).</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {isCompletedOrCanceled ? 'Fechar' : 'Voltar'}
          </Button>
          {!isCompletedOrCanceled && (
            <Button
              type="submit"
              variant={acao === 'reagendar' ? 'primary' : 'outline'}
              className={`flex-1 ${
                acao === 'cancelar' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 
                acao === 'concluir' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''
              }`}
            >
              {acao === 'reagendar' ? 'Confirmar Reagendamento' : 
               acao === 'concluir' ? '✅ Marcar como Concluído' :
               'Confirmar Cancelamento'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}

