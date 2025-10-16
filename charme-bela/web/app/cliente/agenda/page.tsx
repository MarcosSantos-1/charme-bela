'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, User, Phone, Home, Sparkles, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/Button'
import { useConfirm } from '@/hooks/useConfirm'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function AgendaPage() {
  const router = useRouter()
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Mock appointments
  const appointments = [
    { id: 1, date: '2025-10-16', time: '14:00', service: 'Drenagem Linfática', professional: 'Sônia Santana', status: 'confirmed', duration: 60 },
    { id: 2, date: '2025-10-23', time: '15:30', service: 'Massagem Modeladora', professional: 'Sônia Santana', status: 'confirmed', duration: 60 },
    { id: 3, date: '2025-10-30', time: '10:00', service: 'Limpeza de Pele', professional: 'Sônia Santana', status: 'pending', duration: 60 },
  ]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const hasAppointment = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return appointments.some(apt => apt.date === dateStr)
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return appointments.filter(apt => apt.date === dateStr)
  }

  const todayAppointments = getAppointmentsForDate(selectedDate)

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      {ConfirmDialogComponent}
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 z-30">
          <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200">
            <Image
              src="/images/logo.png"
              alt="Charme & Bela"
              width={40}
              height={40}
              className="object-contain"
            />
            <div>
              <h2 className="font-bold text-gray-900">Charme & Bela</h2>
              <p className="text-xs text-gray-500">Área do Cliente</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => router.push('/cliente')}
              className="w-full flex items-center px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
            >
              <Home className="w-5 h-5 mr-3" />
              Início
            </button>
            <button
              className="w-full flex items-center px-4 py-3 rounded-lg transition-colors bg-pink-50 text-pink-600"
            >
              <CalendarIcon className="w-5 h-5 mr-3" />
              Agenda
            </button>
            <button
              onClick={() => router.push('/cliente/servicos')}
              className="w-full flex items-center px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
            >
              <Sparkles className="w-5 h-5 mr-3" />
              Serviços
            </button>
            <button
              onClick={() => router.push('/cliente')}
              className="w-full flex items-center px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
            >
              <FileText className="w-5 h-5 mr-3" />
              Histórico
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:ml-64">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
            <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full md:hidden"
              >
                <ArrowLeft className="w-5 h-5 text-gray-900" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Minha Agenda</h1>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-20">
          {/* Calendar */}
          <div className="bg-white rounded-2xl p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {monthNames[month]} {year}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ‹
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
                const hasApt = hasAppointment(day)

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-pink-600 text-white scale-105'
                        : isToday
                        ? 'bg-pink-100 text-pink-700'
                        : hasApt
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{day}</span>
                    {hasApt && !isSelected && (
                      <span className="w-1 h-1 bg-purple-600 rounded-full mt-1" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-6 text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-pink-100 rounded" />
                <span>Hoje</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-50 rounded flex items-center justify-center">
                  <span className="w-1 h-1 bg-purple-600 rounded-full" />
                </div>
                <span>Com agendamento</span>
              </div>
            </div>
          </div>

          {/* Appointments for Selected Date */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Agendamentos - {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
            </h3>

            {todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{apt.service}</h4>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          {apt.time} ({apt.duration} min)
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apt.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        {apt.professional}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        Av. Paranaguá, 1672 - Sala 02, Ermelino Matarazzo
                      </div>
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        (11) 91312-9669
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Reagendar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-300 hover:bg-red-50">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Nenhum agendamento para este dia</p>
                {selectedDate >= new Date(new Date().setHours(0, 0, 0, 0)) && (
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={async () => {
                      const hasAnamnese = localStorage.getItem('hasCompletedAnamnese')
                      if (!hasAnamnese) {
                        const confirmed = await confirm({
                          title: 'Ficha de Anamnese Necessária',
                          message: 'Para agendar tratamentos, você precisa preencher a ficha de anamnese. Deseja preencher agora?',
                          confirmText: 'Sim, preencher',
                          cancelText: 'Agora não',
                          type: 'info'
                        })
                        if (confirmed) {
                          router.push('/cliente/anamnese')
                        }
                      } else {
                        router.push('/cliente/servicos')
                      }
                    }}
                  >
                    Agendar Tratamento
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* All Upcoming Appointments */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Próximos Agendamentos</h3>
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-pink-600">
                          {new Date(apt.date).getDate()}
                        </div>
                        <div className="text-xs text-gray-600">
                          {monthNames[new Date(apt.date).getMonth()].substring(0, 3)}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{apt.service}</h4>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          {apt.time}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      apt.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {apt.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* Bottom Navigation - Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
          <div className="grid grid-cols-4 h-16">
            <button
              onClick={() => router.push('/cliente')}
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-gray-400 hover:text-gray-600"
            >
              <Home className="w-6 h-6" />
              <span className="text-xs font-medium">Início</span>
            </button>

            <button
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-pink-600"
            >
              <CalendarIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Agenda</span>
            </button>

            <button
              onClick={() => router.push('/cliente/servicos')}
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-gray-400 hover:text-gray-600"
            >
              <Sparkles className="w-6 h-6" />
              <span className="text-xs font-medium">Serviços</span>
            </button>

            <button
              onClick={() => router.push('/cliente')}
              className="flex flex-col items-center justify-center space-y-1 transition-colors text-gray-400 hover:text-gray-600"
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs font-medium">Histórico</span>
            </button>
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  )
}

