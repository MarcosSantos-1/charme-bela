import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { logger } from './utils/logger'
import { healthRoutes } from './routes/health'
import { servicesRoutes } from './routes/services'
import { anamnesisRoutes } from './routes/anamnesis'

const PORT = Number(process.env.PORT) || 3333
const HOST = '0.0.0.0'

// Criando a instância do Fastify
const app = Fastify({
  logger: false // Desabilitamos o logger padrão para usar nosso custom logger
})

// Função principal para iniciar o servidor
async function start() {
  try {
    logger.info('🚀 Iniciando servidor Charme & Bela API...')
    
    // Configurando CORS
    await app.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    })
    logger.success('CORS configurado')
    
    // Registrando rotas
    logger.info('📝 Registrando rotas...')
    await app.register(healthRoutes)
    await app.register(servicesRoutes)
    await app.register(anamnesisRoutes)
    logger.success('Rotas registradas com sucesso')
    
    // Iniciando servidor
    await app.listen({ port: PORT, host: HOST })
    
    console.log('\n' + '='.repeat(50))
    logger.success(`Servidor rodando em http://localhost:${PORT}`)
    logger.info(`Ambiente: ${process.env.NODE_ENV}`)
    logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`)
    console.log('='.repeat(50) + '\n')
    
    logger.info('📋 Rotas disponíveis:')
    console.log('  - GET    /health              - Health check')
    console.log('  - GET    /services            - Listar serviços')
    console.log('  - GET    /services/:id        - Buscar serviço')
    console.log('  - POST   /services            - Criar serviço')
    console.log('  - GET    /anamnesis           - Listar anamneses')
    console.log('  - GET    /anamnesis/user/:id  - Buscar anamnese de usuário')
    console.log('  - POST   /anamnesis           - Criar anamnese')
    console.log('  - PUT    /anamnesis/:id       - Atualizar anamnese')
    console.log('  - DELETE /anamnesis/:id       - Deletar anamnese')
    console.log('')
    
  } catch (error) {
    logger.error('Erro ao iniciar o servidor:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.warning('Recebido sinal de interrupção, encerrando servidor...')
  await app.close()
  logger.success('Servidor encerrado com sucesso')
  process.exit(0)
})

// Iniciando o servidor
start()

