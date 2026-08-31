'use client'

const TIME_INPUT =
  'w-full px-2.5 py-2 border-2 border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white disabled:bg-slate-100 disabled:text-slate-500'

const SLOTS = [
  { n: 1, key: 'inicio' as const, label: 'Abertura' },
  { n: 2, key: 'almocoInicio' as const, label: 'Almoço início' },
  { n: 3, key: 'almocoFim' as const, label: 'Almoço fim' },
  { n: 4, key: 'fechamento' as const, label: 'Fechamento' },
]

export function HorarioDiaCampos({
  inicio,
  almocoInicio,
  almocoFim,
  fim,
  disabled,
  onChange,
}: {
  inicio: string
  almocoInicio: string
  almocoFim: string
  fim: string
  disabled?: boolean
  onChange: (field: 'inicio' | 'almocoInicio' | 'almocoFim' | 'fechamento', value: string) => void
}) {
  const values = { inicio, almocoInicio, almocoFim, fechamento: fim }

  return (
    <div className="pt-3 border-t border-indigo-100">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {SLOTS.map((slot) => {
          const isLunch = slot.key === 'almocoInicio' || slot.key === 'almocoFim'
          return (
            <div key={slot.key}>
              <label className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                  isLunch ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {slot.n}
                </span>
                <span className="text-[11px] font-bold text-slate-700 leading-none">{slot.label}</span>
              </label>
              <input
                type="time"
                value={values[slot.key]}
                disabled={disabled}
                onChange={(e) => onChange(slot.key, e.target.value)}
                className={`${TIME_INPUT} ${isLunch ? 'border-amber-200' : ''}`}
                style={{ colorScheme: 'light' }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
