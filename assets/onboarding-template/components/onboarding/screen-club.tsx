'use client'

import Image from 'next/image'
import { ArrowRight, Crown, Check, Percent } from 'lucide-react'
import { PageIndicator } from './page-indicator'

const benefits = [
  'Tratamentos garantidos todo mês',
  'Até 60% de desconto em serviços',
  'Atendimento prioritário e mimos exclusivos',
]

export function ScreenClub({
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
    <section className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-champagne via-background to-blush">
      <div
        aria-hidden
        className="absolute -right-16 top-10 h-56 w-56 rounded-full bg-gold-soft/30 blur-3xl"
      />

      <div className="relative z-10 flex flex-1 flex-col px-8 pt-16">
        <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-[#8a5a2d]">
          <Crown className="h-3.5 w-3.5" />
          Clube Charme & Bela
        </span>

        {/* Cartão VIP flutuante */}
        <div className="relative mx-auto w-full max-w-[19rem]">
          <div
            aria-hidden
            className="absolute inset-x-6 -bottom-3 h-full rounded-3xl bg-ink/10 blur-xl"
          />
          <div className="relative overflow-hidden rounded-3xl border border-gold-soft/40 bg-gradient-to-br from-[#3a2230] via-[#2b1721] to-[#1c0f16] p-6 shadow-2xl shadow-rose/20">
            {/* brilho dourado */}
            <div
              aria-hidden
              className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-2xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/images/logo.png"
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
                <span className="font-serif text-lg font-semibold text-champagne">
                  VIP
                </span>
              </div>
              <span className="rounded-full border border-gold-soft/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-gold-soft">
                Membro
              </span>
            </div>

            <p className="relative mt-8 text-xs uppercase tracking-[0.3em] text-champagne/50">
              Assinatura
            </p>
            <p className="relative mt-1 bg-gradient-to-r from-gold-soft to-gold bg-clip-text font-serif text-2xl font-semibold text-transparent">
              Plano Diamante
            </p>

            <div className="relative mt-6 flex items-end justify-between">
              <div>
                <p className="text-[11px] text-champagne/50">Beatriz Almeida</p>
                <p className="text-sm font-medium text-champagne">
                  •••• 2048
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-rose px-3 py-1 text-xs font-semibold text-white">
                <Percent className="h-3 w-3" />
                60% OFF
              </span>
            </div>
          </div>
        </div>

        {/* Título + benefícios */}
        <div className="mt-8">
          <h2 className="text-balance font-serif text-3xl font-semibold leading-tight text-ink">
            Seu plano de beleza recorrente.
          </h2>
          <ul className="mt-4 space-y-2.5">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[#8a5a2d]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

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
