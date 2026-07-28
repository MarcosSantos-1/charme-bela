'use client'

import Image from 'next/image'
import { ArrowRight, CalendarHeart, Sparkles, Clock } from 'lucide-react'
import { PageIndicator } from './page-indicator'

export function ScreenExperience({
  total,
  current,
  onNext,
  onBack,
  onSelect,
}: {
  total: number
  current: number
  onNext: () => void
  onBack: () => void
  onSelect: (i: number) => void
}) {
  return (
    <section className="relative flex h-full flex-col bg-background">
      {/* Hero */}
      <div className="relative h-[56%] w-full overflow-hidden rounded-b-[2.5rem]">
        <Image
          src="/images/hero-autocuidado.png"
          alt="Mulher relaxando durante um tratamento de estética"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />

        {/* Card flutuante — próximo horário */}
        <div className="absolute left-5 top-24 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 shadow-lg shadow-rose/15 backdrop-blur-md">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose/15 text-rose">
            <Clock className="h-5 w-5" />
          </span>
          <div className="text-left">
            <p className="text-[11px] font-medium text-muted-foreground">Hoje</p>
            <p className="text-sm font-semibold text-ink">Limpeza de pele</p>
          </div>
        </div>

        {/* Card flutuante — selo */}
        <div className="absolute bottom-8 right-5 flex items-center gap-2 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 shadow-lg shadow-rose/15 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-gold" />
          <p className="text-xs font-medium text-ink">Autocuidado diário</p>
        </div>
      </div>

      {/* Texto */}
      <div className="flex flex-1 flex-col px-8 pt-6">
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <CalendarHeart className="h-3.5 w-3.5" />A experiência
        </span>
        <h2 className="text-balance font-serif text-3xl font-semibold leading-tight text-ink">
          Seu momento de autocuidado, simplificado.
        </h2>
        <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted-foreground">
          Agende procedimentos e acompanhe seus horários em poucos toques, com
          uma experiência pensada para você.
        </p>

        <div className="mt-auto flex flex-col items-center gap-5 pb-10">
          <PageIndicator total={total} current={current} onSelect={onSelect} />
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-border px-6 py-4 text-sm font-medium text-muted-foreground transition-colors active:bg-muted"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={onNext}
              className="group flex flex-1 items-center justify-center gap-2 rounded-full bg-rose py-4 text-base font-medium text-primary-foreground shadow-lg shadow-rose/30 transition-transform active:scale-[0.98]"
            >
              Continuar
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
