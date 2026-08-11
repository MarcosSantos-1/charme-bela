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
import { bannerRoutes } from './routes/banners'
import { stripeRoutes } from './routes/stripe'
import { notificationRoutes } from './routes/notifications'
import { machineRentalsRoutes } from './routes/machineRentals'
import { setupCronJobs } from './utils/cron'
import {
  isAuthEnforced,
  isPublicRoute,
  requireAuth,
  requireFirebaseToken,
  CRON_ROUTES
} from './utils/auth'

// Fly injeta PORT=8080; local usa 3333. Se PORT=3333 vazou do .env nos secrets, corrige.
const rawPort = Number(process.env.PORT)
const PORT =
  process.env.FLY_APP_NAME && (!rawPort || rawPort === 3333)
    ? 8080
    : rawPort || 3333
const HOST = '0.0.0.0'

function getAllowedOrigins(): string[] {
  const origins = new Set<string>()

  for (const value of [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS]) {
    if (!value) continue

    for (const origin of value.split(',')) {
      const trimmed = origin.trim().replace(/\/$/, '')
      if (trimmed) origins.add(trimmed)
    }
  }

  if (origins.size === 0) {
    origins.add('http://localhost:3000')
  }

  return [...origins]
}

const app = Fastify({
  logger: false
})

async function start() {
  try {
    logger.info('🚀 Iniciando servidor Charme & Bela API...')

    // Raw body para validação de assinatura do webhook Stripe (bytes originais)
    app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
      try {
        ;(req as any).rawBody = body
        const json = JSON.parse((body as Buffer).toString('utf8') || 'null')
        done(null, json)
      } catch (err: any) {
        err.statusCode = 400
        done(err, undefined)
      }
    })

    const allowedOrigins = getAllowedOrigins()
    await app.register(cors, {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
          callback(null, true)
          return
        }

        logger.warning(`CORS bloqueou origem: ${origin}`)
        callback(null, false)
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    })
    logger.success(`CORS configurado para: ${allowedOrigins.join(', ')}`)

    // Auth global: rotas públicas passam; demais exigem Bearer Firebase quando AUTH_ENFORCE
    app.addHook('preHandler', async (request, reply) => {
      const method = request.method.toUpperCase()
      const path = request.url.split('?')[0]
      const routeKey = `${method} ${path}`

      if (method === 'OPTIONS') return
      if (isPublicRoute(method, path)) return

      if (CRON_ROUTES.has(routeKey)) {
        const cronSecret = process.env.CRON_SECRET
        if (cronSecret && request.headers['x-cron-secret'] !== cronSecret) {
          return reply.status(401).send({ success: false, error: 'Cron não autorizado' })
        }
        return
      }

      // Bootstrap de conta: o JWT Firebase existe antes do user no banco.
      // Não usar requireAuth aqui — ele 401 quando o firebaseUid ainda não tem User.
      const isUserBootstrap =
        (method === 'POST' && path === '/users') ||
        (method === 'GET' && path.startsWith('/users/firebase/'))

      if (isUserBootstrap) {
        const uid = await requireFirebaseToken(request, reply)
        if (reply.sent) return

        if (method === 'GET' && uid) {
          const requestedUid = path.slice('/users/firebase/'.length)
          if (requestedUid && requestedUid !== uid) {
            return reply.status(403).send({
              success: false,
              error: 'Você só pode consultar o próprio usuário',
            })
          }
        }
        return
      }

      await requireAuth(request, reply)
      if (reply.sent) return
    })

    if (isAuthEnforced()) {
      logger.success('🔒 Auth Firebase ENFORCED (Bearer obrigatório nas rotas privadas)')
    } else {
      logger.warning('⚠️ Auth Firebase em modo permissivo (dev). Em produção/Fly fica enforced automaticamente.')
    }

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
    await app.register(bannerRoutes)
    await app.register(stripeRoutes)
    await app.register(notificationRoutes)
    await app.register(machineRentalsRoutes)
    logger.success('Rotas registradas com sucesso')

    await app.listen({ port: PORT, host: HOST })

    setupCronJobs()

    console.log('\n' + '='.repeat(50))
    logger.success(`Servidor rodando em http://${HOST}:${PORT}`)
    logger.info(`Ambiente: ${process.env.NODE_ENV}`)
    logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`)
    console.log('='.repeat(50) + '\n')
  } catch (error) {
    logger.error('Erro ao iniciar o servidor:', error)
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  logger.warning('Recebido sinal de interrupção, encerrando servidor...')
  await app.close()
  logger.success('Servidor encerrado com sucesso')
  process.exit(0)
})

start()
