'use client'

import Image from 'next/image'
import { Bell, BellRing, CalendarCheck, MessageCircleOff } from 'lucide-react'
import { PageIndicator } from './page-indicator'

export function ScreenSchedule({
  total,
  current,
  onBack,
  onSelect,
  onCreateAccount,
  onLogin,
}: {
  total: number
  current: number
  onBack: () => void
  onSelect: (i: number) => void
  onCreateAccount: () => void
  onLogin: () => void
}) {
  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-blush via-background to-background">
      <div
        aria-hidden
        className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-rose/15 blur-3xl"
      />

      <div className="relative z-10 flex flex-1 flex-col px-8 pt-16">
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Bell className="h-3.5 w-3.5" />A praticidade
        </span>

        {/* Mockup de notificações */}
        <div className="relative mt-2 space-y-3">
          {/* Notificação principal */}
          <div className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-xl shadow-rose/15 backdrop-blur-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose text-white shadow-md shadow-rose/40">
              <Image
                src="/images/logo.png"
                alt=""
                width={26}
                height={26}
                className="h-[26px] w-[26px] object-contain brightness-0 invert"
              />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Charme & Bela</p>
                <span className="text-[11px] text-muted-foreground">agora</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                Seu atendimento é hoje às{' '}
                <span className="font-medium text-ink">14h</span>. Lembramos
                você! ✨
              </p>
            </div>
          </div>

          {/* Notificações secundárias */}
          <div className="ml-4 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/60 p-3.5 shadow-md shadow-rose/10 backdrop-blur-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-[#8a5a2d]">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <p className="text-[13px] text-ink">
              Remarcação confirmada para quinta, 16h
            </p>
          </div>

          <div className="ml-8 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/50 p-3.5 shadow-md shadow-rose/10 backdrop-blur-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose/15 text-rose">
              <BellRing className="h-5 w-5" />
            </span>
            <p className="text-[13px] text-ink">Seu plano VIP renova em 3 dias</p>
          </div>
        </div>

        {/* Texto */}
        <div className="mt-8">
          <h2 className="text-balance font-serif text-3xl font-semibold leading-tight text-ink">
            Sem preocupações na agenda.
          </h2>
          <p className="mt-3 flex items-start gap-2 text-pretty text-[15px] leading-relaxed text-muted-foreground">
            <MessageCircleOff className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
            Receba lembretes automáticos e gerencie remarcações sem precisar
            mandar mensagem no WhatsApp.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-auto flex flex-col items-center gap-5 pb-10">
          <PageIndicator total={total} current={current} onSelect={onSelect} />
          <button
            type="button"
            onClick={onCreateAccount}
            className="w-full rounded-full bg-rose py-4 text-base font-medium text-primary-foreground shadow-lg shadow-rose/30 transition-transform active:scale-[0.98]"
          >
            Criar minha conta
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="text-sm text-muted-foreground"
          >
            Já tenho conta?{' '}
            <span className="font-medium text-rose">Entrar</span>
          </button>
        </div>
      </div>
    </section>
  )
}
