/**
 * Convenção do projeto: slots são persistidos como "hora de parede" no campo UTC.
 * Ex.: 19:00 BRT → `2026-07-09T19:00:00.000Z` (não é instante UTC real).
 *
 * Para comparar "agora" com startTime gravado assim, montamos o instante atual
 * de São Paulo no mesmo formato fake-UTC.
 */

/** Agora em America/Sao_Paulo, no mesmo referencial fake-UTC dos agendamentos. */
export function wallClockNowAsStoredUtc(now: Date = new Date()): Date {
  const dateStr = now.toLocaleString('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split(',')[0] // YYYY-MM-DD

  const timeStr = now.toLocaleString('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }) // HH:MM:SS

  return new Date(`${dateStr}T${timeStr}.000Z`)
}

/** Diferença em horas entre o startTime armazenado e o "agora" de parede. */
export function hoursUntilStoredStart(startTime: Date, now: Date = new Date()): number {
  return (startTime.getTime() - wallClockNowAsStoredUtc(now).getTime()) / (1000 * 60 * 60)
}

/** Mês/ano da data de parede gravada em fake-UTC (`YYYY-MM-DDTHH:mm:00.000Z`). */
export function wallClockYearMonth(start: Date): { year: number; month: number; key: string } {
  const year = start.getUTCFullYear()
  const month = start.getUTCMonth() + 1
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` }
}

/** YYYY-MM-DD de parede a partir do startTime fake-UTC. */
export function wallClockYmd(start: Date): string {
  const y = start.getUTCFullYear()
  const m = String(start.getUTCMonth() + 1).padStart(2, '0')
  const d = String(start.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
