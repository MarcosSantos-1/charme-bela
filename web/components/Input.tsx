import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, value, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          value={value === null ? '' : value}
          className={`
            w-full px-3.5 py-2.5 sm:py-3 border-2 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-400
            disabled:bg-slate-100 disabled:cursor-not-allowed
            text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white touch-manipulation
            ${error ? 'border-rose-500' : 'border-slate-200'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

