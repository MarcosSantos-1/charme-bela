'use client'

import { InputHTMLAttributes, ChangeEvent } from 'react'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  value: string
  onChange: (value: string) => void
}

export function PhoneInput({ label, error, value, onChange, className, ...props }: PhoneInputProps) {
  const formatPhoneNumber = (input: string) => {
    // Remove tudo que não é dígito
    const digits = input.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    const limited = digits.slice(0, 11)
    
    // Aplica a máscara
    if (limited.length <= 2) {
      return limited
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    onChange(formatted)
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        {...props}
        type="tel"
        value={value}
        onChange={handleChange}
        className={`w-full px-4 py-3 border-2 ${
          error ? 'border-red-500' : 'border-gray-300'
        } rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400 transition-colors text-gray-900 placeholder:text-gray-400 font-medium ${className || ''}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

