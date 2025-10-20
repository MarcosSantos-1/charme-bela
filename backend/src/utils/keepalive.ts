import { logger } from './logger'

/**
 * Keep-alive para evitar cold start do Render
 * Faz ping no próprio servidor a cada 14 minutos
 */
export function setupKeepAlive() {
  const PING_INTERVAL = 14 * 60 * 1000 // 14 minutos (antes dos 15min do Render)
  
  // Só ativar em produção
  if (process.env.NODE_ENV !== 'production') {
    logger.info('ℹ️ Keep-alive desabilitado (modo desenvolvimento)')
    return
  }
  
  setInterval(async () => {
    try {
      const startTime = Date.now()
      
      // Ping no próprio health endpoint
      const response = await fetch('http://localhost:3333/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // timeout 5s
      })
      
      const responseTime = Date.now() - startTime
      
      if (response.ok) {
        logger.info(`💓 Keep-alive ping OK (${responseTime}ms)`)
      } else {
        logger.warning(`⚠️ Keep-alive ping failed: ${response.status}`)
      }
    } catch (error: any) {
      logger.error('❌ Keep-alive ping error:', error.message)
    }
  }, PING_INTERVAL)
  
  logger.success('✅ Keep-alive ativado (ping a cada 14 minutos)')
}

