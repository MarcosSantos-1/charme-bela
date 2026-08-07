/**
 * Spec compartilhada do banner da home (carrossel plan/promo/notícia).
 * Usar ao validar uploads admin e ao pedir geração de imagem por IA.
 */
export const HOME_BANNER = {
  width: 1200,
  height: 600,
  aspectRatio: 2,
  aspectLabel: '2:1' as const,
  /** Safe inset no master (px) — sujeito longe das bordas arredondadas. */
  safeInsetPx: 40,
  sizeHint: '1200x600',
} as const

/** Retorna true se width/height batem no master (tolerância 2%). */
export function isValidHomeBannerSize(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false
  const ratio = width / height
  const target = HOME_BANNER.aspectRatio
  return Math.abs(ratio - target) / target <= 0.02
}
