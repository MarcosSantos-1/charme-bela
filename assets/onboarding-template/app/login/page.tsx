'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PhoneFrame } from '@/components/onboarding/phone-frame'
import { LoginFlow } from '@/components/auth/login-flow'

export default function LoginPage() {
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
            App Mobile · Acesso
          </p>
          <h1 className="text-balance font-serif text-4xl font-semibold leading-tight text-ink lg:text-5xl">
            Login simplificado, do jeito da cliente.
          </h1>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">
            Três formas de acesso — Apple, Google ou celular com código SMS.
            Se ainda não houver cadastro, a cliente segue direto para a
            anamnese após autenticar.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 lg:justify-start">
            <Link
              href="/"
              className="rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-medium text-ink backdrop-blur transition-colors hover:bg-white"
            >
              Ver onboarding
            </Link>
            <Link
              href="/anamnese"
              className="rounded-full border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-medium text-ink backdrop-blur transition-colors hover:bg-white"
            >
              Ver anamnese
            </Link>
          </div>
        </header>

        <div className="shrink-0">
          <PhoneFrame>
            <LoginFlow
              onAuthenticated={(_provider, isNewUser) => {
                // Usuário novo → anamnese. Existente → home do app.
                if (isNewUser) router.push('/anamnese')
                else router.push('/')
              }}
              onBackToOnboarding={() => router.push('/')}
            />
          </PhoneFrame>
        </div>
      </div>
    </main>
  )
}
