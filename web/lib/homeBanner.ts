/** Spec compartilhada do banner da home (carrossel plan/promo/notícia). */
export const HOME_BANNER = {
  width: 1200,
  height: 600,
  aspectRatio: 2,
  aspectLabel: '2:1' as const,
  sizeHint: '1200x600',
  maxBytes: 1_000_000,
} as const

export function isValidHomeBannerSize(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false
  const ratio = width / height
  const target = HOME_BANNER.aspectRatio
  return Math.abs(ratio - target) / target <= 0.02
}

/** Lê arquivo, valida proporção ~2:1 e comprime para JPEG data URL. */
export async function fileToHomeBannerDataUrl(file: File): Promise<{
  dataUrl: string
  width: number
  height: number
}> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Envie uma imagem (JPG, PNG ou WebP)')
  }

  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  if (!isValidHomeBannerSize(width, height)) {
    bitmap.close()
    throw new Error(`Proporção inválida (${width}×${height}). Use ${HOME_BANNER.sizeHint} (${HOME_BANNER.aspectLabel})`)
  }

  const canvas = document.createElement('canvas')
  canvas.width = HOME_BANNER.width
  canvas.height = HOME_BANNER.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Não foi possível processar a imagem')
  }
  ctx.drawImage(bitmap, 0, 0, HOME_BANNER.width, HOME_BANNER.height)
  bitmap.close()

  let quality = 0.88
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > HOME_BANNER.maxBytes * 1.37 && quality > 0.45) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length > 1_400_000) {
    throw new Error('Imagem ainda grande demais após compressão. Tente um JPEG mais leve.')
  }

  return { dataUrl, width: HOME_BANNER.width, height: HOME_BANNER.height }
}
