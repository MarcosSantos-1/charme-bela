'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, ShieldCheck, Smartphone } from 'lucide-react'
import { AppleIcon, GoogleIcon } from './brand-icons'

type Provider = 'apple' | 'google' | 'phone'
type Step = 'methods' | 'phone' | 'otp'

/** Máscara de telefone BR: (11) 99999-9999 */
function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const p = digits
  if (p.length <= 2) return p.replace(/(\d{0,2})/, '($1')
  if (p.length <= 7) return p.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  return p.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

export function LoginFlow({
  onAuthenticated,
  onBackToOnboarding,
}: {
  onAuthenticated: (provider: Provider, isNewUser: boolean) => void
  onBackToOnboarding: () => void
}) {
  const [step, setStep] = useState<Step>('methods')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState(['', '', '', ''])
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const phoneComplete = phone.replace(/\D/g, '').length === 11
  const codeComplete = code.every((d) => d !== '')

  const handleSocial = (provider: 'apple' | 'google') => {
    // Ponto de integração: dispare o SDK do provedor (expo-apple-authentication / expo-auth-session).
    // Aqui simulamos um usuário novo que segue para a anamnese.
    onAuthenticated(provider, true)
  }

  const handleCodeChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    setCode((prev) => {
      const next = [...prev]
      next[i] = digit
      return next
    })
    if (digit && i < 3) inputsRef.current[i + 1]?.focus()
  }

  const handleCodeKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-blush via-background to-champagne">
      <div
        aria-hidden
        className="absolute -right-20 -top-10 h-56 w-56 rounded-full bg-rose/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -left-16 bottom-24 h-60 w-60 rounded-full bg-gold-soft/25 blur-3xl"
      />

      {/* Topo */}
      <div className="relative z-10 flex items-center px-6 pt-14">
        <button
          type="button"
          onClick={step === 'methods' ? onBackToOnboarding : () => setStep(step === 'otp' ? 'phone' : 'methods')}
          aria-label="Voltar"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/60 text-ink shadow-sm backdrop-blur-md transition-transform active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {step === 'methods' && (
        <div className="relative z-10 flex flex-1 flex-col px-8">
          <div className="mt-2 flex flex-col items-center text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/60 bg-white/60 shadow-xl shadow-rose/20 backdrop-blur-md">
              <Image
                src="/images/logo.png"
                alt="Logo Charme & Bela"
                width={68}
                height={68}
                className="h-[68px] w-[68px] object-contain"
              />
            </div>
            <h1 className="text-balance font-serif text-3xl font-semibold leading-tight text-ink">
              Acesse sua conta
            </h1>
            <p className="mt-2 max-w-[17rem] text-pretty text-[15px] leading-relaxed text-muted-foreground">
              Entre para agendar, acompanhar sua ficha e aproveitar o Clube VIP.
            </p>
          </div>

          <div className="mt-9 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleSocial('apple')}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-ink py-4 text-base font-medium text-white shadow-lg shadow-ink/20 transition-transform active:scale-[0.98]"
            >
              <AppleIcon className="h-5 w-5" />
              Continuar com Apple
            </button>
            <button
              type="button"
              onClick={() => handleSocial('google')}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-black/10 bg-white py-4 text-base font-medium text-ink shadow-md shadow-rose/10 transition-transform active:scale-[0.98]"
            >
              <GoogleIcon className="h-5 w-5" />
              Continuar com Google
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-rose py-4 text-base font-medium text-primary-foreground shadow-lg shadow-rose/30 transition-transform active:scale-[0.98]"
            >
              <Smartphone className="h-5 w-5" />
              Continuar com celular
            </button>
          </div>

          <div className="mt-auto pb-10 pt-8">
            <p className="flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-rose" />
              Seus dados são protegidos e usados apenas para seu atendimento.
            </p>
          </div>
        </div>
      )}

      {step === 'phone' && (
        <div className="relative z-10 flex flex-1 flex-col px-8">
          <div className="mt-4">
            <h1 className="text-balance font-serif text-3xl font-semibold leading-tight text-ink">
              Qual seu celular?
            </h1>
            <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted-foreground">
              Enviaremos um código de verificação por SMS.
            </p>
          </div>

          <div className="mt-8">
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-ink"
            >
              Número de telefone
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-4 shadow-sm backdrop-blur-md focus-within:border-rose focus-within:ring-2 focus-within:ring-rose/20">
              <span className="text-[15px] font-medium text-muted-foreground">
                +55
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoFocus
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                className="w-full bg-transparent py-4 text-[15px] text-ink outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <div className="mt-auto pb-10">
            <button
              type="button"
              disabled={!phoneComplete}
              onClick={() => setStep('otp')}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-rose py-4 text-base font-medium text-primary-foreground shadow-lg shadow-rose/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar código
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}

      {step === 'otp' && (
        <div className="relative z-10 flex flex-1 flex-col px-8">
          <div className="mt-4">
            <h1 className="text-balance font-serif text-3xl font-semibold leading-tight text-ink">
              Digite o código
            </h1>
            <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted-foreground">
              Enviamos um SMS para{' '}
              <span className="font-medium text-ink">+55 {phone}</span>
            </p>
          </div>

          <div className="mt-8 flex justify-between gap-3">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el
                }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                autoFocus={i === 0}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleCodeKey(i, e)}
                className="h-16 w-full rounded-2xl border border-black/10 bg-white/80 text-center font-serif text-2xl font-semibold text-ink shadow-sm outline-none backdrop-blur-md focus:border-rose focus:ring-2 focus:ring-rose/20"
              />
            ))}
          </div>

          <button
            type="button"
            className="mt-5 text-sm text-muted-foreground"
          >
            Não recebeu?{' '}
            <span className="font-medium text-rose">Reenviar código</span>
          </button>

          <div className="mt-auto pb-10">
            <button
              type="button"
              disabled={!codeComplete}
              onClick={() => onAuthenticated('phone', true)}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-rose py-4 text-base font-medium text-primary-foreground shadow-lg shadow-rose/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Verificar e continuar
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
