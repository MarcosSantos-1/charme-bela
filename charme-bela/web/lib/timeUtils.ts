// Utilidades para manipulação de tempo e timezone

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


