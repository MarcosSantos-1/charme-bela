// Utilitário simples de logging com cores para debug
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`ℹ️  [INFO] ${message}`, ...args)
  },
  
  success: (message: string, ...args: any[]) => {
    console.log(`✅ [SUCCESS] ${message}`, ...args)
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`❌ [ERROR] ${message}`, ...args)
  },
  
  warning: (message: string, ...args: any[]) => {
    console.warn(`⚠️  [WARNING] ${message}`, ...args)
  },
  
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 [DEBUG] ${message}`, ...args)
    }
  },
  
  route: (method: string, path: string) => {
    console.log(`🛣️  [ROUTE] ${method.toUpperCase()} ${path}`)
  }
}

