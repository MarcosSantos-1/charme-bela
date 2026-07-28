'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { PageIndicator } from './page-indicator'

export function ScreenWelcome({
  total,
  current,
  onNext,
  onSelect,
}: {
  total: number
  current: number
  onNext: () => void
  onSelect: (i: number) => void
}) {
  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-blush via-background to-champagne">
      {/* Círculos opacos decorativos */}
      <div
        aria-hidden
        className="absolute -left-16 -top-10 h-56 w-56 rounded-full bg-rose/20 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -right-20 top-40 h-64 w-64 rounded-full bg-gold-soft/30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-rose/10 blur-3xl"
      />

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/60 bg-white/60 shadow-xl shadow-rose/20 backdrop-blur-md">
          <Image
            src="/images/logo.png"
            alt="Logo Charme & Bela"
            width={92}
            height={92}
            className="h-[92px] w-[92px] object-contain"
            priority
          />
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-rose-deep/70">
          Bem-vinda
        </p>
        <h1 className="text-balance font-serif text-4xl font-semibold leading-tight text-ink">
          Charme <span className="text-rose">&</span> Bela
        </h1>
        <p className="mt-4 max-w-[16rem] text-pretty text-[15px] leading-relaxed text-muted-foreground">
          Sua beleza, nosso cuidado. Agende tratamentos, gerencie sua assinatura
          e muito mais — tudo em um só lugar.
        </p>
      </div>

      {/* Rodapé */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 pb-12">
        <PageIndicator total={total} current={current} onSelect={onSelect} />
        <button
          type="button"
          onClick={onNext}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-rose py-4 text-base font-medium text-primary-foreground shadow-lg shadow-rose/30 transition-transform active:scale-[0.98]"
        >
          Começar
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  )
}
