'use client'

import { useState } from 'react'
import { Calendar, Clock, Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/Button'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')

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

  const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8h às 18h

  const getAppointmentsForDateTime = (date: Date, hour: number) => {
    return appointments.filter(apt => {
      const aptHour = apt.startTime.getHours()
      return isSameDay(apt.startTime, date) && aptHour === hour
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Week navigation */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="p-2 hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-900">
              {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="p-2 hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(new Date())}
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
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Week header */}
        <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
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

        {/* Calendar body */}
        <div className="overflow-x-auto">
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
                        <div
                          key={apt.id}
                          className="mb-1 p-2 bg-pink-100 border-l-2 border-pink-600 rounded text-xs hover:bg-pink-200 transition-colors"
                        >
                          <div className="font-medium text-pink-900">
                            {format(apt.startTime, 'HH:mm')} - {apt.clientName}
                          </div>
                          <div className="text-pink-700 mt-0.5">
                            {apt.service}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-6 text-sm">
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
      </div>
    </div>
  )
}

