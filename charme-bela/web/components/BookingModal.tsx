'use client'

import { useState, useEffect } from 'react'
import { Button } from './Button'
import { X, Calendar as CalendarIcon, Check, Loader } from 'lucide-react'
import { Service } from '@/types'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { AnamneseRequiredModal } from './AnamneseRequiredModal'

interface BookingModalProps {
  service: Service | null
  isOpen: boolean
  onClose: () => void
  hasSubscription: boolean
  remainingTreatments: number
  isIncludedInPlan: boolean
  userId: string
  onSuccess: (type: 'SUBSCRIPTION' | 'SINGLE') => void
}

export function BookingModal({
  service,
  isOpen,
  onClose,
  hasSubscription,
  remainingTreatments,
  isIncludedInPlan,
  userId,
  onSuccess
}: BookingModalProps) {
  const [step, setStep] = useState<'details' | 'booking' | 'confirming' | 'success'>('details')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [bookingType, setBookingType] = useState<'SUBSCRIPTION' | 'SINGLE'>('SUBSCRIPTION')
  const [showAnamneseModal, setShowAnamneseModal] = useState(false)

  // Reset quando abrir o modal
  useEffect(() => {
    if (isOpen) {
      setStep('details')
      setSelectedDate(null)
      setSelectedSlot('')
      setAvailableSlots([])
      setBookedSlots([])
      setBookingType(hasSubscription && isIncludedInPlan ? 'SUBSCRIPTION' : 'SINGLE')
    }
  }, [isOpen, hasSubscription, isIncludedInPlan])

  if (!isOpen || !service) return null

  // Calcular data máxima: último dia do próximo mês
  const getMaxDate = () => {
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0) // Último dia do próximo mês
    return nextMonth
  }

  // Buscar horários disponíveis
  const handleDateSelect = async (date: Date | null) => {
    if (!date) {
      setSelectedDate(null)
      setSelectedSlot('')
      setAvailableSlots([])
      setBookedSlots([])
      return
    }

    setSelectedDate(date)
    setSelectedSlot('')
    setLoadingSlots(true)

    try {
      const dateStr = date.toISOString().split('T')[0]
      const response = await api.getAvailableSlots(dateStr, service.id)
      let slots = response.slots || []
      
      // Se for hoje, filtrar horários que já passaram
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      
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
      setBookedSlots(response.bookedSlots || [])
      
      console.log('API Response:', response)
      console.log('Available (após filtro):', slots)
      console.log('Booked:', response.bookedSlots)
    } catch (error) {
      console.error('Erro ao buscar horários:', error)
      toast.error('Erro ao buscar horários disponíveis')
      setAvailableSlots([])
      setBookedSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }
  
  // Gerar lista combinada de todos os slots (disponíveis + ocupados)
  const getAllSlots = () => {
    // Combina slots disponíveis e ocupados, remove duplicatas, ordena
    const combined = [...availableSlots, ...bookedSlots]
    const unique = Array.from(new Set(combined))
    return unique.sort()
  }
  
  // Verificar se um horário está ocupado
  const isSlotBooked = (slot: string) => {
    return bookedSlots.includes(slot)
  }
  
  // Verificar se um horário está disponível
  const isSlotAvailable = (slot: string) => {
    return availableSlots.includes(slot)
  }
  
  // Handle click em horário
  const handleSlotClick = (slot: string) => {
    if (isSlotBooked(slot)) {
      toast.error('Este horário já está agendado. Escolha outro horário disponível.')
      return
    }
    setSelectedSlot(slot)
  }

  // Confirmar agendamento
  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot) {
      toast.error('Selecione data e horário')
      return
    }

    setStep('confirming')

    try {
      // IMPORTANTE: Força UTC adicionando .000Z no final!
      // Sem isso, o navegador interpreta como timezone local e converte errado
      const dateStr = selectedDate.toISOString().split('T')[0]
      const startTime = new Date(`${dateStr}T${selectedSlot}:00.000Z`)
      
      console.log('🕐 Agendando para:', {
        selectedDate: dateStr,
        selectedSlot,
        startTimeISO: startTime.toISOString(),
        service: service.name,
        bookingType
      })

      // PONTO 3: Lógica de reserva de horário
      // Cliente agendando:
      // - SINGLE: vai para checkout (não marca como PENDING, vai pagar no Stripe)
      // - SUBSCRIPTION: consome sessão do plano (sem paymentStatus)
      // 
      // TODO (futuro com Stripe):
      // - Redirecionar para checkout do Stripe
      // - Criar "reserva temporária" com timeout de 15min
      // - Se não pagar em 15min, liberar horário automaticamente
      // - Implementar webhook do Stripe para confirmar pagamento
      
      await api.createAppointment({
        userId,
        serviceId: service.id,
        startTime: startTime.toISOString(),
        origin: bookingType,
        // Cliente SINGLE não envia paymentStatus (vai pagar no checkout)
        // Apenas ADMIN_CREATED envia PENDING (pagar na clínica)
        notes: ''
      })

      setStep('success')

      // Chamar callback após 2 segundos
      setTimeout(() => {
        onSuccess(bookingType)
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error)
      
      // Se o erro for sobre anamnese, mostrar modal especial
      if (error.message && error.message.includes('anamnese')) {
        setShowAnamneseModal(true)
        setStep('details') // Volta para o início
      } else {
        toast.error(error.message || 'Erro ao agendar tratamento')
        setStep('booking')
      }
    }
  }


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 'details' && service.name}
            {step === 'booking' && 'Escolha Data e Horário'}
            {step === 'confirming' && 'Processando...'}
            {step === 'success' && 'Agendado com Sucesso!'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={step === 'confirming'}
          >
            <X className="w-5 h-5 text-gray-900" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP 1: Detalhes do Serviço */}
          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    service.category === 'COMBO' ? 'bg-yellow-100 text-orange-700' :
                    service.category === 'FACIAL' ? 'bg-pink-100 text-pink-700' :
                    service.category === 'MASSAGEM' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {service.category}
                  </span>
                  {isIncludedInPlan && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                      ✓ Incluso no seu plano
                    </span>
                  )}
                </div>

                <p className="text-gray-700 leading-relaxed mb-4">{service.description}</p>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Duração</div>
                    <div className="font-semibold text-gray-900">{service.duration} minutos</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Valor</div>
                    <div className="font-semibold text-gray-900">
                      {isIncludedInPlan ? (
                        <span className="text-green-600">Incluso</span>
                      ) : (
                        `R$ ${service.price.toFixed(2)}`
                      )}
                    </div>
                  </div>
                </div>

                {hasSubscription && (
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                    <div className="text-sm font-medium text-purple-900">Sessões Disponíveis</div>
                    <div className="text-2xl font-bold text-purple-700 mt-1">{remainingTreatments}</div>
                    <div className="text-xs text-purple-600 mt-1">tratamentos restantes este mês</div>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => setStep('booking')}
              >
                <CalendarIcon className="w-5 h-5 mr-2" />
                Agendar Agora
              </Button>
            </div>
          )}

          {/* STEP 2: Seleção de Data e Horário */}
          {step === 'booking' && (
            <div className="space-y-6">
              {/* Seletor de Data - React DatePicker */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  📅 Escolha a Data
                </label>
                <div className="custom-datepicker-wrapper">
                  <ReactDatePicker
                    selected={selectedDate}
                    onChange={handleDateSelect}
                    minDate={new Date()}
                    maxDate={getMaxDate()}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Selecione uma data"
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
                    cursor: not-allowed;
                  }
                  .react-datepicker__navigation-icon::before {
                    border-color: white;
                  }
                  .react-datepicker__navigation:hover *::before {
                    border-color: #fce7f3;
                  }
                `}</style>
              </div>

              {/* Contador de Sessões - PONTO 4 */}
              {selectedDate && hasSubscription && (
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-xl mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-purple-900">Sessões Disponíveis</div>
                      <div className="text-xs text-purple-600 mt-0.5">Use seu plano ou pague avulso</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-700">{remainingTreatments}</div>
                  </div>
                </div>
              )}

              {/* Horários Disponíveis */}
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    ⏰ Horários Disponíveis
                  </label>

                  {loadingSlots ? (
                    <div className="text-center py-8">
                      <Loader className="w-8 h-8 animate-spin text-pink-600 mx-auto" />
                      <p className="text-sm text-gray-600 mt-2">Buscando horários...</p>
                    </div>
                  ) : availableSlots.length > 0 || bookedSlots.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {getAllSlots().map((slot) => {
                          const isBooked = isSlotBooked(slot)
                          const isAvailable = isSlotAvailable(slot)
                          
                          return (
                            <button
                              key={slot}
                              onClick={() => handleSlotClick(slot)}
                              disabled={isBooked}
                              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                                isBooked
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
                                  : selectedSlot === slot
                                  ? 'bg-pink-600 text-white'
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

              {/* Tipo de Agendamento - PONTO 2: Validação obrigatória */}
              {selectedSlot && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    💳 Forma de Pagamento *
                  </label>

                  {hasSubscription && isIncludedInPlan && remainingTreatments > 0 ? (
                    <>
                      <button
                        onClick={() => setBookingType('SUBSCRIPTION')}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          bookingType === 'SUBSCRIPTION'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">✨ Usar Plano</div>
                            <div className="text-sm text-gray-600">Consumir 1 sessão ({remainingTreatments} disponíveis)</div>
                          </div>
                          {bookingType === 'SUBSCRIPTION' && (
                            <Check className="w-6 h-6 text-purple-600" />
                          )}
                        </div>
                      </button>

                      <button
                        onClick={() => setBookingType('SINGLE')}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          bookingType === 'SINGLE'
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">💰 Pagamento Avulso</div>
                            <div className="text-sm text-gray-600">R$ {service.price.toFixed(2)} - Não consome sessão do plano</div>
                          </div>
                          {bookingType === 'SINGLE' && (
                            <Check className="w-6 h-6 text-pink-600" />
                          )}
                        </div>
                      </button>
                    </>
                  ) : (
                    // Sem plano ou limite atingido - apenas avulso
                    <div className="w-full p-4 rounded-xl border-2 border-pink-500 bg-pink-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">💰 Pagamento Avulso</div>
                          <div className="text-sm text-gray-600">R$ {service.price.toFixed(2)}</div>
                          {hasSubscription && remainingTreatments === 0 && (
                            <div className="text-xs text-orange-600 mt-1">⚠️ Limite mensal do plano atingido</div>
                          )}
                        </div>
                        <Check className="w-6 h-6 text-pink-600" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('details')}
                >
                  Voltar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleConfirmBooking}
                  disabled={!selectedDate || !selectedSlot}
                >
                  Confirmar Agendamento
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Processando */}
          {step === 'confirming' && (
            <div className="text-center py-12">
              <Loader className="w-16 h-16 animate-spin text-pink-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processando Agendamento...</h3>
              <p className="text-gray-600">Aguarde um momento</p>
            </div>
          )}

          {/* STEP 4: Sucesso */}
          {step === 'success' && selectedDate && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h3>
              <p className="text-gray-600 mb-1">
                {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} às {selectedSlot}
              </p>
              <p className="text-sm text-gray-500">
                {bookingType === 'SUBSCRIPTION' 
                  ? '✓ Sessão consumida do seu plano' 
                  : 'Redirecionando para pagamento...'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Anamnese Requerida */}
      <AnamneseRequiredModal 
        isOpen={showAnamneseModal}
        onClose={() => {
          setShowAnamneseModal(false)
          onClose() // Fecha o booking modal também
        }}
      />
    </div>
  )
}

