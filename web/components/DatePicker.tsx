'use client'

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import 'react-day-picker/dist/style.css'

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  minDate?: Date
  maxDate?: Date
  showYearPicker?: boolean
}

export default function DatePicker({ 
  value, 
  onChange, 
  placeholder = 'Selecione uma data',
  minDate,
  maxDate,
  showYearPicker = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value || new Date())
  const [displayMonth, setDisplayMonth] = useState<Date>(value || new Date())

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    onChange(date)
    setIsOpen(false)
  }

  const currentYear = displayMonth.getFullYear()
  const currentMonth = displayMonth.getMonth()

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 bg-white hover:border-gray-400 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span>
            {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
          </span>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-4">
            <style jsx global>{`
              .rdp {
                --rdp-cell-size: 40px;
                --rdp-accent-color: #ec4899;
                --rdp-background-color: #fce7f3;
                margin: 0;
              }
              .rdp-day {
                color: #1f2937;
                font-weight: 500;
              }
              .rdp-day_selected {
                background-color: #ec4899 !important;
                color: white !important;
                font-weight: bold;
              }
              .rdp-day_today {
                font-weight: bold;
                color: #ec4899;
              }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                background-color: #fce7f3;
              }
              .rdp-caption {
                display: none;
              }
              .rdp-head_cell {
                color: #111827 !important;
                font-weight: 700 !important;
                text-transform: uppercase;
                font-size: 13px;
                letter-spacing: 0.5px;
              }
              .rdp-caption_label {
                color: #1f2937;
                font-weight: 600;
              }
              .rdp-dropdown {
                color: #1f2937;
                font-weight: 500;
              }
              .rdp-dropdown option {
                color: #1f2937;
              }
            `}</style>
            
            {/* Month/Year Selectors (for birthdate) */}
            {showYearPicker && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                <select
                  value={currentMonth}
                  onChange={(e) => setDisplayMonth(new Date(currentYear, parseInt(e.target.value), 1))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
                
                <select
                  value={currentYear}
                  onChange={(e) => setDisplayMonth(new Date(parseInt(e.target.value), currentMonth, 1))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
            
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              locale={ptBR}
              fromDate={minDate}
              toDate={maxDate}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              captionLayout="dropdown"
            />
          </div>
        </>
      )}
    </div>
  )
}

