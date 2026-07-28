'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScreenWelcome } from './screen-welcome'
import { ScreenExperience } from './screen-experience'
import { ScreenClub } from './screen-club'
import { ScreenSchedule } from './screen-schedule'

const TOTAL = 4

export function OnboardingFlow() {
  const router = useRouter()
  const [index, setIndex] = useState(0)

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(TOTAL - 1, i)))
  const next = () => goTo(index + 1)
  const back = () => goTo(index - 1)

  const handleAuth = (mode: 'signup' | 'login') => {
    // Ambos entram pelo login; novo usuário segue para a anamnese depois de autenticar.
    router.push('/login')
    console.log('[v0] Onboarding concluído:', mode)
  }

  return (
    <div className="relative h-full w-full">
      {/* Faixa deslizante com as 4 telas */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        <div className="h-full w-full shrink-0">
          <ScreenWelcome
            total={TOTAL}
            current={index}
            onNext={next}
            onSelect={goTo}
          />
        </div>
        <div className="h-full w-full shrink-0">
          <ScreenExperience
            total={TOTAL}
            current={index}
            onNext={next}
            onBack={back}
            onSelect={goTo}
          />
        </div>
        <div className="h-full w-full shrink-0">
          <ScreenClub
            total={TOTAL}
            current={index}
            onNext={next}
            onBack={back}
            onSelect={goTo}
          />
        </div>
        <div className="h-full w-full shrink-0">
          <ScreenSchedule
            total={TOTAL}
            current={index}
            onBack={back}
            onSelect={goTo}
            onCreateAccount={() => handleAuth('signup')}
            onLogin={() => handleAuth('login')}
          />
        </div>
      </div>
    </div>
  )
}
