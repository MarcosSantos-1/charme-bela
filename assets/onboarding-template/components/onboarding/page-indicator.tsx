import { cn } from '@/lib/utils'

export function PageIndicator({
  total,
  current,
  onSelect,
  variant = 'dark',
}: {
  total: number
  current: number
  onSelect?: (index: number) => void
  variant?: 'dark' | 'light'
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current
        return (
          <button
            key={i}
            type="button"
            aria-label={`Ir para a tela ${i + 1}`}
            aria-current={active}
            onClick={() => onSelect?.(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              active ? 'w-7' : 'w-1.5',
              variant === 'light'
                ? active
                  ? 'bg-white'
                  : 'bg-white/40'
                : active
                  ? 'bg-rose'
                  : 'bg-rose/25',
            )}
          />
        )
      })}
    </div>
  )
}
