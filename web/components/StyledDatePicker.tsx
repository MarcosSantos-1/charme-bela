'use client'

import ReactDatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ptBR } from 'date-fns/locale'

// Registrar locale português
registerLocale('pt-BR', ptBR)

interface StyledDatePickerProps {
  selected?: Date | null
  onChange: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  placeholderText?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export function StyledDatePicker({
  selected,
  onChange,
  minDate,
  maxDate,
  placeholderText = "Selecione uma data",
  className = "",
  disabled = false,
  required = false
}: StyledDatePickerProps) {
  return (
    <>
      <ReactDatePicker
        selected={selected}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholderText}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 font-medium ${className}`}
        locale="pt-BR"
        showPopperArrow={false}
        popperPlacement="bottom-start"
        disabled={disabled}
        required={required}
      />
      
      <style jsx global>{`
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
        .react-datepicker {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          font-family: inherit;
        }
        .react-datepicker__header {
          background: linear-gradient(135deg, #db2777 0%, #ec4899 100%);
          border-bottom: none;
          border-radius: 10px 10px 0 0;
          padding-top: 16px;
          padding-bottom: 12px;
        }
        .react-datepicker__current-month {
          color: white;
          font-weight: 800;
          font-size: 17px;
          margin-bottom: 12px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        .react-datepicker__day-names {
          margin-top: 8px;
          background-color: rgba(255,255,255,0.2);
          padding: 6px 0;
          border-radius: 6px;
        }
        .react-datepicker__day-name {
          color: #111827 !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          text-transform: uppercase !important;
          width: 2rem !important;
          line-height: 2rem !important;
          margin: 0.166rem !important;
        }
        .react-datepicker__day {
          color: #374151;
          font-weight: 500;
          border-radius: 8px;
          width: 2rem !important;
          line-height: 2rem !important;
          margin: 0.166rem !important;
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
        .react-datepicker__month-container {
          width: 100%;
        }
      `}</style>
    </>
  )
}

