import Image from 'next/image'
import { PhoneFrame } from '@/components/onboarding/phone-frame'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export default function Page() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-champagne via-background to-blush">
      {/* Ambiente de apresentação */}
      <div
        aria-hidden
        className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-rose/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-gold-soft/20 blur-3xl"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center gap-12 px-6 py-12 lg:flex-row lg:justify-between lg:py-20">
        {/* Cabeçalho da apresentação */}
        <header className="max-w-md text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-md shadow-rose/20 backdrop-blur">
              <Image
                src="/images/logo.png"
                alt="Logo Charme & Bela"
                width={34}
                height={34}
                className="h-[34px] w-[34px] object-contain"
              />
            </span>
            <span className="font-serif text-xl font-semibold text-ink">
              Charme <span className="text-rose">&</span> Bela
            </span>
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-rose-deep/70">
            App Mobile · Onboarding
          </p>
          <h1 className="text-balance font-serif text-4xl font-semibold leading-tight text-ink lg:text-5xl">
            Um onboarding premium para clínicas de estética.
          </h1>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">
            Quatro telas em alta fidelidade com gradientes suaves,
            glassmorphism e detalhes em champagne. Use as setas dos botões ou
            toque nos indicadores para navegar entre as telas.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-4 text-left">
            <div className="rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur">
              <dt className="text-xs text-muted-foreground">Cor principal</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-ink">
                <span className="h-4 w-4 rounded-full bg-rose" />
                #EC4998
              </dd>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur">
              <dt className="text-xs text-muted-foreground">Feito para</dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                React Native / Expo
              </dd>
            </div>
          </dl>
        </header>

        {/* Mockup interativo */}
        <div className="shrink-0">
          <PhoneFrame>
            <OnboardingFlow />
          </PhoneFrame>
        </div>
      </div>
    </main>
  )
}
