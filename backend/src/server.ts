import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { logger } from './utils/logger'
import { healthRoutes } from './routes/health'
import { servicesRoutes } from './routes/services'
import { anamnesisRoutes } from './routes/anamnesis'
import { plansRoutes } from './routes/plans'
import { configRoutes } from './routes/config'
import { usersRoutes } from './routes/users'
import { appointmentsRoutes } from './routes/appointments'
import { vouchersRoutes } from './routes/vouchers'
import { scheduleRoutes } from './routes/schedule'
import { subscriptionsRoutes } from './routes/subscriptions'
import { testimonialRoutes } from './routes/testimonials'
import { stripeRoutes } from './routes/stripe'
import { notificationRoutes } from './routes/notifications'
import { setupCronJobs } from './utils/cron'

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
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    })
    logger.success('CORS configurado com métodos: GET, POST, PUT, DELETE, PATCH')
    
    // Registrando rotas
    logger.info('📝 Registrando rotas...')
    await app.register(healthRoutes)
    await app.register(servicesRoutes)
    await app.register(anamnesisRoutes)
    await app.register(plansRoutes)
    await app.register(configRoutes)
    await app.register(usersRoutes)
    await app.register(appointmentsRoutes)
    await app.register(vouchersRoutes)
    await app.register(scheduleRoutes)
    await app.register(subscriptionsRoutes)
    await app.register(testimonialRoutes)
    await app.register(stripeRoutes)
    await app.register(notificationRoutes)
    logger.success('Rotas registradas com sucesso')
    
    // Iniciando servidor
    await app.listen({ port: PORT, host: HOST })
    
    // Inicia cron jobs
    setupCronJobs()
    
    console.log('\n' + '='.repeat(50))
    logger.success(`Servidor rodando em http://localhost:${PORT}`)
    logger.info(`Ambiente: ${process.env.NODE_ENV}`)
    logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`)
    console.log('='.repeat(50) + '\n')
    
    logger.info('📋 Rotas disponíveis:')
    console.log('\n  🏥 Health & Config:')
    console.log('  - GET    /health                - Health check')
    console.log('  - GET    /config                - Buscar configurações')
    console.log('  - PUT    /config                - Atualizar configurações')
    
    console.log('\n  💎 Planos:')
    console.log('  - GET    /plans                     - Listar planos')
    console.log('  - GET    /plans/:id                 - Buscar plano por ID')
    console.log('  - GET    /plans/tier/:tier          - Buscar plano por tier')
    console.log('  - POST   /plans                     - Criar plano')
    console.log('  - PUT    /plans/:id                 - Atualizar plano')
    console.log('  - PUT    /plans/:id/services/add    - Adicionar serviços ao plano')
    console.log('  - PUT    /plans/:id/services/remove - Remover serviços do plano')
    console.log('  - PUT    /plans/:id/services/set    - Substituir serviços do plano')
    
    console.log('\n  💆 Serviços:')
    console.log('  - GET    /services              - Listar serviços')
    console.log('  - GET    /services/:id          - Buscar serviço')
    console.log('  - POST   /services              - Criar serviço')
    
    console.log('\n  👥 Usuários:')
    console.log('  - GET    /users                     - Listar usuários')
    console.log('  - GET    /users/birthdays           - Aniversariantes do mês')
    console.log('  - GET    /users/firebase/:uid       - Buscar por Firebase UID')
    console.log('  - GET    /users/:id                 - Buscar usuário')
    console.log('  - POST   /users                     - Criar usuário')
    console.log('  - PUT    /users/:id                 - Atualizar usuário')
    console.log('  - DELETE /users/:id                 - Desativar usuário')
    
    console.log('\n  📋 Anamneses:')
    console.log('  - GET    /anamnesis                - Listar anamneses')
    console.log('  - GET    /anamnesis/user/:userId   - Buscar anamnese de usuário')
    console.log('  - POST   /anamnesis                - Criar anamnese')
    console.log('  - PUT    /anamnesis/user/:userId   - Atualizar anamnese')
    console.log('  - DELETE /anamnesis/user/:userId   - Deletar anamnese')
    
    console.log('\n  📅 Agendamentos:')
    console.log('  - GET    /appointments                - Listar agendamentos')
    console.log('  - GET    /appointments/:id            - Buscar agendamento')
    console.log('  - POST   /appointments                - Criar agendamento')
    console.log('  - PUT    /appointments/:id/confirm    - Confirmar agendamento')
    console.log('  - PUT    /appointments/:id/cancel     - Cancelar agendamento')
    console.log('  - PUT    /appointments/:id/reschedule - Reagendar')
    
    console.log('\n  🎁 Vouchers:')
    console.log('  - GET    /vouchers                        - Listar vouchers')
    console.log('  - GET    /vouchers/user/:userId           - Vouchers do usuário')
    console.log('  - GET    /vouchers/:id                    - Buscar voucher')
    console.log('  - POST   /vouchers                        - Criar voucher')
    console.log('  - POST   /vouchers/validate               - Validar e calcular desconto')
    console.log('  - POST   /vouchers/:id/activate-free-month - Ativar mês grátis')
    console.log('  - PUT    /vouchers/:id/use                - Usar voucher')
    console.log('  - DELETE /vouchers/:id                    - Remover voucher')
    
    console.log('\n  ⏰ Horários:')
    console.log('  - GET    /schedule/available       - Horários disponíveis')
    console.log('  - GET    /schedule/manager         - Horários de funcionamento')
    console.log('  - POST   /schedule/manager         - Definir horários')
    console.log('  - GET    /schedule/overrides       - Listar exceções')
    console.log('  - POST   /schedule/overrides       - Criar exceção')
    console.log('  - DELETE /schedule/overrides/:date - Remover exceção')
    
    console.log('\n  💳 Assinaturas:')
    console.log('  - GET    /subscriptions                - Listar assinaturas')
    console.log('  - GET    /subscriptions/user/:userId   - Assinatura do usuário')
    console.log('  - POST   /subscriptions                - Criar assinatura')
    console.log('  - PUT    /subscriptions/:userId/cancel - Cancelar assinatura')
    console.log('  - PUT    /subscriptions/:userId/pause  - Pausar assinatura')
    console.log('  - PUT    /subscriptions/:userId/reactivate - Reativar')
    
    console.log('\n  💰 Stripe (Pagamentos):')
    console.log('  - POST   /stripe/create-checkout-session  - Checkout assinatura')
    console.log('  - POST   /stripe/create-payment-session   - Pagamento avulso (cartão)')
    console.log('  - POST   /stripe/create-portal-session    - Portal do cliente')
    console.log('  - GET    /stripe/payment-methods/:userId  - Métodos de pagamento')
    console.log('  - GET    /stripe/payment-history/:userId  - Histórico')
    console.log('  - GET    /stripe/monthly-revenue          - Receita do mês (Admin)')
    console.log('  - POST   /stripe/webhook                  - Webhook Stripe')
    
    console.log('\n  🔔 Notificações:')
    console.log('  - GET    /notifications                    - Listar notificações')
    console.log('  - GET    /notifications/unread-count       - Contar não lidas')
    console.log('  - GET    /notifications/:id                - Buscar notificação')
    console.log('  - POST   /notifications                    - Criar notificação')
    console.log('  - PUT    /notifications/:id/read           - Marcar como lida')
    console.log('  - PUT    /notifications/mark-all-read      - Marcar todas como lidas')
    console.log('  - DELETE /notifications/:id                - Deletar notificação')
    console.log('  - DELETE /notifications/clear-all          - Limpar todas')
    console.log('  - DELETE /notifications/clear-expired      - Limpar expiradas')
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

