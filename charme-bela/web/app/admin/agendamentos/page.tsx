'use client'

import { useState } from 'react'
import { Calendar, Clock, Plus, Search, Filter, ChevronLeft, ChevronRight, Grid3x3, List } from 'lucide-react'
import { Button } from '@/components/Button'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { NovoAgendamentoModal } from '@/components/admin/NovoAgendamentoModal'
import { ReagendarCancelarModal } from '@/components/admin/ReagendarCancelarModal'
import { isFeriado, getFeriadosDoMes } from '@/lib/feriados'

interface Appointment {
  id: string
  clientName: string
  service: string
  startTime: Date
  endTime: Date
  status: 'scheduled' | 'completed' | 'canceled'
  notes?: string
}

export default function AgendamentosPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false)
  const [isReagendarOpen, setIsReagendarOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<{
    id: string
    cliente: string
    servico: string
    data: string
    hora: string
  } | undefined>()

  // Mock data - substituir por dados reais da API
  const appointments: Appointment[] = [
    {
      id: '1',
      clientName: 'Maria Silva',
      service: 'Limpeza de Pele',
      startTime: new Date(2025, 9, 14, 9, 0),
      endTime: new Date(2025, 9, 14, 10, 0),
      status: 'scheduled'
    },
    {
      id: '2',
      clientName: 'Ana Santos',
      service: 'Massagem Modeladora',
      startTime: new Date(2025, 9, 14, 10, 30),
      endTime: new Date(2025, 9, 14, 11, 30),
      status: 'scheduled'
    },
    {
      id: '3',
      clientName: 'Julia Oliveira',
      service: 'Drenagem Linfática',
      startTime: new Date(2025, 9, 14, 14, 0),
      endTime: new Date(2025, 9, 14, 15, 0),
      status: 'scheduled'
    }
  ]

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8h às 18h

  const getAppointmentsForDateTime = (date: Date, hour: number) => {
    return appointments.filter(apt => {
      const aptHour = apt.startTime.getHours()
      return isSameDay(apt.startTime, date) && aptHour === hour
    })
  }

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => isSameDay(apt.startTime, date))
  }

  const feriadosDoMes = getFeriadosDoMes(currentMonth.getFullYear(), currentMonth.getMonth())

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 inline mr-1" />
              Semana
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3x3 className="w-4 h-4 inline mr-1" />
              Mês
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => {
                if (viewMode === 'week') {
                  setCurrentWeek(subWeeks(currentWeek, 1))
                } else {
                  setCurrentMonth(subMonths(currentMonth, 1))
                }
              }}
              className="p-2 hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
              {viewMode === 'week' 
                ? `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(addDays(weekStart, 6), "d 'de' MMM", { locale: ptBR })}`
                : format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })
              }
            </span>
            <button
              onClick={() => {
                if (viewMode === 'week') {
                  setCurrentWeek(addWeeks(currentWeek, 1))
                } else {
                  setCurrentMonth(addMonths(currentMonth, 1))
                }
              }}
              className="p-2 hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentWeek(new Date())
              setCurrentMonth(new Date())
            }}
          >
            Hoje
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar agendamento..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>

          {/* New appointment */}
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setIsNovoAgendamentoOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Feriados do Mês */}
      {feriadosDoMes.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            Feriados {viewMode === 'month' && `- ${format(currentMonth, "MMMM", { locale: ptBR })}`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {feriadosDoMes.map((feriado, idx) => (
              <div
                key={idx}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  feriado.tipo === 'nacional'
                    ? 'bg-red-600 text-white'
                    : 'bg-orange-600 text-white'
                }`}
              >
                {format(new Date(feriado.data + 'T00:00:00'), "d 'de' MMM", { locale: ptBR })} - {feriado.nome}
                {feriado.tipo === 'estadual' && ' (SP)'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid - Mobile Optimized */}
      {viewMode === 'week' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Week header */}
        <div className="hidden md:grid md:grid-cols-8 border-b border-gray-200 bg-gray-50">
          <div className="p-4 text-sm font-medium text-gray-500">
            Horário
          </div>
          {weekDays.map((day, index) => {
            const isCurrentDay = isToday(day)
            return (
              <div
                key={index}
                className={`p-4 text-center ${isCurrentDay ? 'bg-pink-50' : ''}`}
              >
                <div className={`text-xs font-medium ${isCurrentDay ? 'text-pink-600' : 'text-gray-500'}`}>
                  {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                </div>
                <div className={`text-lg font-bold mt-1 ${isCurrentDay ? 'text-pink-600' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Calendar body - Desktop */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide">
          <div className="grid grid-cols-8 divide-y divide-gray-200">
            {hours.map((hour) => (
              <>
                {/* Hour label */}
                <div
                  key={`hour-${hour}`}
                  className="p-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200"
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>

                {/* Day cells */}
                {weekDays.map((day, dayIndex) => {
                  const dayAppointments = getAppointmentsForDateTime(day, hour)
                  const isCurrentDay = isToday(day)

                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className={`relative min-h-[80px] p-2 border-r border-gray-200 hover:bg-gray-50 cursor-pointer ${
                        isCurrentDay ? 'bg-pink-50/30' : ''
                      }`}
                    >
                      {dayAppointments.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => {
                            setSelectedAppointment({
                              id: apt.id,
                              cliente: apt.clientName,
                              servico: apt.service,
                              data: format(apt.startTime, 'dd/MM/yyyy'),
                              hora: format(apt.startTime, 'HH:mm')
                            })
                            setIsReagendarOpen(true)
                          }}
                          className="w-full mb-1 p-2 bg-pink-100 border-l-2 border-pink-600 rounded text-xs hover:bg-pink-200 transition-colors text-left"
                        >
                          <div className="font-medium text-pink-900">
                            {format(apt.startTime, 'HH:mm')} - {apt.clientName}
                          </div>
                          <div className="text-pink-700 mt-0.5">
                            {apt.service}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>

        {/* Calendar Mobile - Horizontal Swipe */}
        <div className="md:hidden">
          <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
            {weekDays.map((day, dayIndex) => {
              const isCurrentDay = isToday(day)
              const dayAppointmentsAll = appointments.filter(apt => isSameDay(apt.startTime, day))
              const feriadoInfo = isFeriado(day)
              
              return (
                <div
                  key={dayIndex}
                  className="min-w-[85vw] sm:min-w-[400px] snap-center px-2 first:pl-4 last:pr-4"
                >
                  {/* Day Header */}
                  <div className={`mb-3 p-4 rounded-xl ${
                    isCurrentDay ? 'bg-pink-600' : feriadoInfo.isFeriado ? 'bg-red-600' : 'bg-gray-100'
                  }`}>
                    <div className={`text-xs font-bold uppercase ${
                      isCurrentDay || feriadoInfo.isFeriado ? 'text-white opacity-90' : 'text-gray-500'
                    }`}>
                      {format(day, 'EEEE', { locale: ptBR })}
                    </div>
                    <div className={`text-2xl font-bold ${
                      isCurrentDay || feriadoInfo.isFeriado ? 'text-white' : 'text-gray-900'
                    }`}>
                      {format(day, "d 'de' MMMM", { locale: ptBR })}
                    </div>
                    {feriadoInfo.isFeriado && (
                      <div className="mt-2 text-xs text-white bg-white/20 px-2 py-1 rounded-md inline-block">
                        🎉 {feriadoInfo.nome}
                      </div>
                    )}
                  </div>

                  {/* Agendamentos do dia */}
                  <div className="space-y-3 pb-4">
                    {dayAppointmentsAll.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum agendamento</p>
                      </div>
                    ) : (
                      dayAppointmentsAll.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => {
                            setSelectedAppointment({
                              id: apt.id,
                              cliente: apt.clientName,
                              servico: apt.service,
                              data: format(apt.startTime, 'dd/MM/yyyy'),
                              hora: format(apt.startTime, 'HH:mm')
                            })
                            setIsReagendarOpen(true)
                          }}
                          className="w-full bg-white border-2 border-pink-200 rounded-xl p-4 hover:border-pink-400 hover:shadow-md transition-all text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-pink-600 text-white">
                              <span className="text-xl font-bold">
                                {format(apt.startTime, 'HH')}
                              </span>
                              <span className="text-xs">
                                {format(apt.startTime, 'mm')}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-base">
                                {apt.clientName}
                              </h4>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {apt.service}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                              apt.status === 'completed'
                                ? 'bg-gray-200 text-gray-700'
                                : apt.status === 'scheduled'
                                ? 'bg-pink-500 text-white'
                                : 'bg-green-500 text-white'
                            }`}>
                              {apt.status === 'completed' ? 'Concluído' : 
                               apt.status === 'scheduled' ? 'Agendado' : 'Confirmado'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Toque para gerenciar →
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Indicador de scroll */}
          <div className="flex justify-center gap-1.5 py-3">
            {weekDays.map((_, idx) => (
              <div key={idx} className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
            ))}
          </div>
        </div>
      </div>
      ) : (
        // Visualização Mensal
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Calendar header - dias da semana */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((dia) => (
              <div key={dia} className="p-3 text-center text-xs font-bold text-gray-600">
                {dia}
              </div>
            ))}
          </div>

          {/* Calendar body */}
          <div className="grid grid-cols-7 divide-x divide-gray-100">
            {/* Preencher dias vazios do início */}
            {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="min-h-[100px] bg-gray-50 border-b border-gray-100"></div>
            ))}

            {/* Dias do mês */}
            {monthDays.map((day) => {
              const dayAppointments = getAppointmentsForDate(day)
              const isCurrentDay = isToday(day)
              const feriadoInfo = isFeriado(day)
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-2 border-b border-gray-100 ${
                    isCurrentDay ? 'bg-pink-50' : feriadoInfo.isFeriado ? 'bg-red-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${
                      isCurrentDay ? 'text-pink-600' : feriadoInfo.isFeriado ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="bg-pink-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  {feriadoInfo.isFeriado && (
                    <div className={`text-[10px] font-medium mb-1 ${
                      feriadoInfo.tipo === 'nacional' ? 'text-red-700' : 'text-orange-700'
                    }`}>
                      {feriadoInfo.nome}
                    </div>
                  )}

                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <button
                        key={apt.id}
                        onClick={() => {
                          setSelectedAppointment({
                            id: apt.id,
                            cliente: apt.clientName,
                            servico: apt.service,
                            data: format(apt.startTime, 'dd/MM/yyyy'),
                            hora: format(apt.startTime, 'HH:mm')
                          })
                          setIsReagendarOpen(true)
                        }}
                        className="w-full p-1.5 bg-pink-100 border-l-2 border-pink-600 rounded text-[10px] hover:bg-pink-200 transition-colors text-left"
                      >
                        <div className="font-medium text-pink-900 truncate">
                          {format(apt.startTime, 'HH:mm')} {apt.clientName}
                        </div>
                      </button>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-[10px] text-center text-pink-600 font-medium">
                        +{dayAppointments.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-pink-100 border-l-2 border-pink-600 rounded"></div>
          <span className="text-gray-600">Agendado</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 border-l-2 border-green-600 rounded"></div>
          <span className="text-gray-600">Concluído</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 border-l-2 border-gray-600 rounded"></div>
          <span className="text-gray-600">Cancelado</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
          <span className="text-gray-600">Feriado Nacional</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-50 border border-orange-300 rounded"></div>
          <span className="text-gray-600">Feriado SP</span>
        </div>
      </div>

      {/* Modais */}
      <NovoAgendamentoModal 
        isOpen={isNovoAgendamentoOpen}
        onClose={() => setIsNovoAgendamentoOpen(false)}
      />
      
      <ReagendarCancelarModal 
        isOpen={isReagendarOpen}
        onClose={() => setIsReagendarOpen(false)}
        agendamento={selectedAppointment}
      />
    </div>
  )
}

