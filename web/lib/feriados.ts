// Feriados Nacionais e de São Paulo 2025
export const feriados2025 = [
  // Nacionais
  { data: '2025-01-01', nome: 'Ano Novo', tipo: 'nacional' },
  { data: '2025-02-24', nome: 'Carnaval', tipo: 'nacional' },
  { data: '2025-02-25', nome: 'Carnaval', tipo: 'nacional' },
  { data: '2025-04-18', nome: 'Sexta-feira Santa', tipo: 'nacional' },
  { data: '2025-04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { data: '2025-05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { data: '2025-06-19', nome: 'Corpus Christi', tipo: 'nacional' },
  { data: '2025-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { data: '2025-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { data: '2025-11-02', nome: 'Finados', tipo: 'nacional' },
  { data: '2025-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { data: '2025-11-20', nome: 'Consciência Negra', tipo: 'nacional' },
  { data: '2025-12-25', nome: 'Natal', tipo: 'nacional' },
  
  // São Paulo
  { data: '2025-01-25', nome: 'Aniversário de São Paulo', tipo: 'estadual' },
  { data: '2025-07-09', nome: 'Revolução Constitucionalista', tipo: 'estadual' },
]

export function isFeriado(date: Date): { isFeriado: boolean; nome?: string; tipo?: string } {
  const dateStr = date.toISOString().split('T')[0]
  const feriado = feriados2025.find(f => f.data === dateStr)
  
  if (feriado) {
    return {
      isFeriado: true,
      nome: feriado.nome,
      tipo: feriado.tipo
    }
  }
  
  return { isFeriado: false }
}

export function getFeriadosDoMes(year: number, month: number) {
  return feriados2025.filter(f => {
    const [y, m] = f.data.split('-')
    return parseInt(y) === year && parseInt(m) === month + 1
  })
}

