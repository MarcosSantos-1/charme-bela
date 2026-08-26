/** Apple/Firebase OAuth sometimes sends names as "Marcos+Vinicius+Silva". */
export function normalizePersonName(value?: string | null): string {
  if (!value) return ''
  let name = String(value).trim()
  if (!name) return ''

  if (/%[0-9A-Fa-f]{2}/.test(name)) {
    try {
      name = decodeURIComponent(name)
    } catch {
      // keep current value
    }
  }

  name = name.replace(/\+/g, ' ')
  return name.replace(/\s+/g, ' ').trim()
}

/** Corrige '+' de nome Apple/Firebase em títulos e mensagens já gravados. */
export function normalizePlusInText(value?: string | null): string {
  if (!value) return ''
  return String(value).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim()
}
