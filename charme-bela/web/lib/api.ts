// Cliente da API - centraliza todas as chamadas ao backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  isActive: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Função para buscar todos os serviços
export async function getServices(): Promise<Service[]> {
  try {
    const response = await fetch(`${API_URL}/services`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Service[]> = await response.json()
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erro ao buscar serviços')
    }

    return result.data
  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
    throw error
  }
}

// Função para buscar um serviço específico
export async function getService(id: string): Promise<Service> {
  try {
    const response = await fetch(`${API_URL}/services/${id}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Service> = await response.json()
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erro ao buscar serviço')
    }

    return result.data
  } catch (error) {
    console.error('Erro ao buscar serviço:', error)
    throw error
  }
}

// Função para verificar health check
export async function healthCheck() {
  try {
    const response = await fetch(`${API_URL}/health`)
    return await response.json()
  } catch (error) {
    console.error('Erro no health check:', error)
    throw error
  }
}

