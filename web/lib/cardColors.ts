/** Cartão principal = rosa do app; os demais ganham cores distintas e estáveis. */
export const CARD_PRIMARY_GRADIENT = 'bg-gradient-to-br from-[#ec4998] via-[#d63d86] to-[#b7276e]'

const SECONDARY_GRADIENTS = [
  'bg-gradient-to-br from-[#c9a24b] via-[#b8923f] to-[#8a6d28]',
  'bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-900',
  'bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900',
  'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900',
  'bg-gradient-to-br from-amber-700 via-orange-800 to-stone-900',
]

export function cardFaceClassName(card: { isDefault?: boolean }, index: number) {
  if (card.isDefault) return CARD_PRIMARY_GRADIENT
  return SECONDARY_GRADIENTS[index % SECONDARY_GRADIENTS.length]
}
