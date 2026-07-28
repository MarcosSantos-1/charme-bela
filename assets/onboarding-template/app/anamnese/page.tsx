'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PhoneFrame } from '@/components/onboarding/phone-frame'
import { AnamneseFlow } from '@/components/anamnese/anamnese-flow'

export default function AnamnesePage() {
  const router = useRouter()

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-champagne via-background to-blush">
      <div
        aria-hidden
        className="absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-rose/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-gold-soft/20 blur-3xl"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center gap-12 px-6 py-12 lg:flex-row lg:justify-between lg:py-20">
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
            App Mobile · Primeiro acesso
          </p>
          <h1 className="text-balance font-serif text-4xl font-semibold leading-tight text-ink lg:text-5xl">
            Anamnese em etapas, sem sustos.
          </h1>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">
            Dez passos com lógica dinâmica: campos condicionais aparecem
            conforme as respostas e a etapa de gravidez só surge quando o sexo
            é feminino. Barra de progresso e assinatura no final.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 lg:justify-start">
            <Link
              href="/login"
              className="rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-medium text-ink backdrop-blur transition-colors hover:bg-white"
            >
              Voltar ao login
            </Link>
            <Link
              href="/"
              className="rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-medium text-ink backdrop-blur transition-colors hover:bg-white"
            >
              Ver onboarding
            </Link>
          </div>
        </header>

        <div className="shrink-0">
          <PhoneFrame>
            <AnamneseFlow onFinish={() => router.push('/')} />
          </PhoneFrame>
        </div>
      </div>
    </main>
  )
}
