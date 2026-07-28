'use client'

import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

/* ---------- Rótulo de pergunta ---------- */
export function Question({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[15px] font-medium leading-snug text-ink">{label}</p>
      {children}
    </div>
  )
}

/* ---------- Input de texto ---------- */
export function TextField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-ink">{label}</span>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 text-[15px] text-ink shadow-sm outline-none backdrop-blur-md transition-colors placeholder:text-muted-foreground/60 focus:border-rose focus:ring-2 focus:ring-rose/20"
      />
    </label>
  )
}

/* ---------- Radio (opções verticais em pílula) ---------- */
export function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-[15px] transition-all active:scale-[0.99] ${
              active
                ? 'border-rose bg-rose/10 text-ink shadow-sm'
                : 'border-black/10 bg-white/70 text-ink/80'
            }`}
          >
            {opt}
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                active ? 'border-rose bg-rose' : 'border-black/20'
              }`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Segmented control ---------- */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-white/60 p-1.5 backdrop-blur-md sm:grid-cols-4">
      {options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-xl px-2 py-2.5 text-[13px] font-medium transition-all ${
              active
                ? 'bg-rose text-primary-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Switch (linha com rótulo) ---------- */
export function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3.5">
      <span className="pr-4 text-[15px] leading-snug text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-rose' : 'bg-black/15'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

/* ---------- Cards de seleção única ---------- */
export function CardSelect({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-2xl border px-4 py-4 text-center text-[15px] font-medium transition-all active:scale-[0.98] ${
              active
                ? 'border-rose bg-rose/10 text-ink shadow-sm'
                : 'border-black/10 bg-white/70 text-ink/80'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Multi select / checklist (chips) ---------- */
export function MultiSelect({
  options,
  values,
  onToggle,
}: {
  options: string[]
  values: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${
              active
                ? 'border-rose bg-rose text-primary-foreground shadow-sm'
                : 'border-black/10 bg-white/70 text-ink/80'
            }`}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Checklist vertical ---------- */
export function CheckList({
  options,
  values,
  onToggle,
}: {
  options: string[]
  values: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const active = values.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] transition-all active:scale-[0.99] ${
              active
                ? 'border-rose bg-rose/10 text-ink'
                : 'border-black/10 bg-white/70 text-ink/80'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                active ? 'border-rose bg-rose text-white' : 'border-black/20'
              }`}
            >
              {active && <Check className="h-3.5 w-3.5" />}
            </span>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Slider com marcadores ---------- */
export function LabeledSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  marks,
  suffix,
}: {
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  marks?: string[]
  suffix?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {marks ? marks[value] ?? '' : `${value}${suffix ?? ''}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose [&::-webkit-slider-thumb]:shadow-md"
        style={{
          background: `linear-gradient(to right, var(--rose) ${pct}%, rgba(0,0,0,0.12) ${pct}%)`,
        }}
      />
      {marks && (
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          {marks.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
    </div>
  )
}
