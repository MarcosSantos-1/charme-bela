'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Banner } from '@/lib/api'

type BannerSliderProps = {
  banners: Banner[]
  className?: string
  roundedClassName?: string
  /**
   * Slide de configuração pendente (ex.: método de login extra pós-anamnese).
   * Quando presente: vira o 1º slide e desliga o autoplay (só rolagem manual).
   */
  configSlide?: ReactNode
  /** Slide do plano / sem plano — fica depois dos banners de promoção */
  planSlide?: ReactNode
  /** Permanência por slide no autoplay (ms). Ignorado se houver configSlide. */
  autoplayMs?: number
  /** Clique em banner com linkPath / machineKind */
  onBannerClick?: (banner: Banner) => void
}

/**
 * Carrossel do card principal (2:1).
 * Ordem: config (se houver) → banners promo → plano.
 * Autoplay só quando NÃO há slide de configuração.
 */
export function BannerSlider({
  banners,
  className = '',
  roundedClassName = 'rounded-2xl',
  configSlide,
  planSlide,
  autoplayMs = 6000,
  onBannerClick,
}: BannerSliderProps) {
  const activeBanners = banners.filter((b) => b.isActive !== false)
  const hasConfig = Boolean(configSlide)
  const hasPlan = Boolean(planSlide)
  const autoplayEnabled = !hasConfig
  const total = (hasConfig ? 1 : 0) + activeBanners.length + (hasPlan ? 1 : 0)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const pauseUntilRef = useRef(0)
  const dragRef = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    setIndex(0)
    scrollerRef.current?.scrollTo({ left: 0, behavior: 'auto' })
  }, [total, hasConfig, hasPlan, activeBanners.length])

  const goTo = useCallback((next: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollerRef.current
    if (!el || total <= 0) return
    const clamped = ((next % total) + total) % total
    const width = el.clientWidth
    el.scrollTo({ left: clamped * width, behavior })
    setIndex(clamped)
  }, [total])

  useEffect(() => {
    if (!autoplayEnabled || total <= 1) return
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return
      goTo(indexRef.current + 1)
    }, autoplayMs)
    return () => window.clearInterval(id)
  }, [autoplayEnabled, total, autoplayMs, goTo])

  const pauseAutoplay = () => {
    if (!autoplayEnabled) return
    pauseUntilRef.current = Date.now() + autoplayMs + 1500
  }

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el || el.clientWidth <= 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    if (next !== indexRef.current) setIndex(Math.max(0, Math.min(next, total - 1)))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollerRef.current
    if (!el) return
    pauseAutoplay()
    dragRef.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false }
    el.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollerRef.current
    const drag = dragRef.current
    if (!el || !drag) return
    const dx = e.clientX - drag.startX
    if (Math.abs(dx) > 4) drag.moved = true
    el.scrollLeft = drag.scrollLeft - dx
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const el = scrollerRef.current
    const drag = dragRef.current
    if (!el || !drag) return
    dragRef.current = null
    const width = el.clientWidth || 1
    const dx = e.clientX - drag.startX
    let next = Math.round(el.scrollLeft / width)
    if (drag.moved && Math.abs(dx) > width * 0.18) {
      next = dx < 0 ? indexRef.current + 1 : indexRef.current - 1
      suppressClickRef.current = true
    } else if (drag.moved) {
      suppressClickRef.current = true
    }
    goTo(next)
  }

  if (total === 0) return null

  return (
    <div className={`relative w-full aspect-[2/1] overflow-hidden bg-gray-100 ${roundedClassName} ${className}`}>
      <div
        ref={scrollerRef}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-none select-none cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x' }}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            e.preventDefault()
            e.stopPropagation()
            suppressClickRef.current = false
          }
        }}
      >
        {hasConfig ? (
          <div className="relative min-w-full h-full snap-center shrink-0">{configSlide}</div>
        ) : null}
        {activeBanners.map((banner) => (
          <div
            key={banner.id}
            className="relative min-w-full h-full snap-center shrink-0"
            role={banner.linkPath || banner.machineKind ? 'button' : undefined}
            onClick={() => {
              if (suppressClickRef.current) return
              if (banner.linkPath || banner.machineKind) onBannerClick?.(banner)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          </div>
        ))}
        {hasPlan ? (
          <div className="relative min-w-full h-full snap-center shrink-0">{planSlide}</div>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para slide ${i + 1}`}
              onClick={() => {
                pauseAutoplay()
                goTo(i)
              }}
              className={`h-1.5 rounded-full transition-all pointer-events-auto ${
                i === index ? 'w-5 bg-white shadow' : 'w-1.5 bg-white/70'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
