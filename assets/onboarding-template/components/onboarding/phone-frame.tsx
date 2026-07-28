import type { ReactNode } from 'react'

/**
 * PhoneFrame — moldura de dispositivo para o preview em alta fidelidade.
 * No React Native/Expo este wrapper não é necessário: o conteúdo interno
 * (children) equivale ao <SafeAreaView> da tela.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {/* Brilho ambiente */}
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-[4rem] bg-rose/20 blur-3xl"
      />
      <div className="relative h-[812px] w-[375px] rounded-[3.2rem] border-[6px] border-ink/85 bg-ink p-2 shadow-2xl shadow-rose/30">
        {/* Ilha dinâmica */}
        <div className="absolute left-1/2 top-4 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-ink" />
        <div className="relative h-full w-full overflow-hidden rounded-[2.7rem] bg-background">
          {children}
        </div>
      </div>
    </div>
  )
}
