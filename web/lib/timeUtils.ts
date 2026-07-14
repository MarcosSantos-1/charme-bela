// Utilidades para manipulação de tempo e timezone
//
// Convenção do projeto: horários de agendamento são gravados como "hora de parede"
// no campo UTC. Ex.: slot 19:00 vira `2026-07-09T19:00:00.000Z` (não é UTC real).
// Exibição e filtros devem usar getUTC* / parseAppointmentWallClock — nunca
// comparar o ISO bruto com `new Date()` real, senão o horário some ~3h cedo (BRT).

/**
 * Interpreta o ISO do agendamento como hora de parede local (mesmo critério do admin).
 * "2026-07-09T19:00:00.000Z" → Date local com 19:00.
 */
export function parseAppointmentWallClock(iso: string): Date {
  const parts = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!parts) return new Date(iso)

  const [, year, month, day, hours, minutes, seconds] = parts
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hours, 10),
    parseInt(minutes, 10),
    parseInt(seconds || '0', 10)
  )
}

/** Agendamento ainda à frente (data+hora de parede > agora local). */
export function isAppointmentUpcoming(iso: string, now: Date = new Date()): boolean {
  return parseAppointmentWallClock(iso).getTime() > now.getTime()
}

/** Horas até o agendamento, na convenção de hora de parede. */
export function hoursUntilAppointment(iso: string, now: Date = new Date()): number {
  return (parseAppointmentWallClock(iso).getTime() - now.getTime()) / (1000 * 60 * 60)
}

/**
 * Calcula o tempo relativo de uma data em relação a agora
 * Garante conversão correta de UTC para timezone local (São Paulo: UTC-3)
 */
export function formatTimeAgo(dateString: string): string {
  // Parse da data UTC do backend
  const date = new Date(dateString)
  const now = new Date()
  
  // Calcula diferença em milissegundos
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInMinutes < 1) {
    return 'Agora'
  } else if (diffInMinutes < 60) {
    return `Há ${diffInMinutes} min`
  } else if (diffInHours < 24) {
    return `Há ${diffInHours}h`
  } else if (diffInDays === 1) {
    return 'Ontem'
  } else if (diffInDays < 7) {
    return `Há ${diffInDays} dias`
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
}

/**
 * Formata data completa (usado em listas de atividades)
 */
export function formatFullDate(dateString: string): string {
  const date = new Date(dateString)
  
  const dateStr = date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  })
  
  const timeStr = date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  
  return `${dateStr} ${timeStr}`
}

/**
 * Debug: Mostra informações de timezone
 */
export function debugTimezone(dateString: string) {
  const date = new Date(dateString)
  console.log('=== DEBUG TIMEZONE ===')
  console.log('String original:', dateString)
  console.log('Date parsed:', date.toISOString())
  console.log('Local string:', date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
  console.log('Timezone offset (min):', date.getTimezoneOffset())
  console.log('======================')
}


