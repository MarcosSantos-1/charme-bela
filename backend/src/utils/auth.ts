import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from './logger'

export type AuthUser = {
  id: string
  firebaseUid: string
  email: string
  role: 'CLIENT' | 'MANAGER'
  name: string
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser
    firebaseUid?: string
  }
}

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'charme-bela-33906'

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

/** Em produção (Fly / NODE_ENV=production) a auth é obrigatória, salvo AUTH_ENFORCE=false. */
export function isAuthEnforced(): boolean {
  if (process.env.AUTH_ENFORCE === 'false') return false
  if (process.env.AUTH_ENFORCE === 'true') return true
  return process.env.NODE_ENV === 'production' || !!process.env.FLY_APP_NAME
}

export async function verifyFirebaseIdToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  })
  return payload
}

export function extractBearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

/**
 * Valida só o JWT Firebase (sem exigir usuário no banco).
 * Usado no bootstrap de cadastro: GET /users/firebase/:uid e POST /users.
 */
export async function requireFirebaseToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<string | null> {
  const token = extractBearer(request)
  if (!token) {
    if (isAuthEnforced()) {
      reply.status(401).send({
        success: false,
        error: 'Não autenticado. Envie Authorization: Bearer <token>.',
      })
      return null
    }
    return null
  }

  try {
    const payload = await verifyFirebaseIdToken(token)
    const firebaseUid = payload.sub
    if (!firebaseUid) throw new Error('Token sem sub')
    request.firebaseUid = firebaseUid
    return firebaseUid
  } catch (error: any) {
    logger.warning(`Auth token inválido (bootstrap): ${error.message}`)
    if (isAuthEnforced()) {
      reply.status(401).send({ success: false, error: 'Token inválido ou expirado' })
      return null
    }
    return null
  }
}

/**
 * Resolve o usuário autenticado a partir do Bearer token Firebase.
 * Anexa `request.authUser` quando válido.
 * Se AUTH_ENFORCE=false (dev), falha silenciosa (segue sem usuário).
 * Se AUTH_ENFORCE=true, responde 401.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  const token = extractBearer(request)

  if (!token) {
    if (isAuthEnforced()) {
      reply.status(401).send({ success: false, error: 'Não autenticado. Envie Authorization: Bearer <token>.' })
      return null
    }
    return null
  }

  try {
    const payload = await verifyFirebaseIdToken(token)
    const firebaseUid = payload.sub
    if (!firebaseUid) {
      throw new Error('Token sem sub')
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, firebaseUid: true, email: true, role: true, name: true, isActive: true }
    })

    if (!user || !user.isActive) {
      if (isAuthEnforced()) {
        reply.status(401).send({ success: false, error: 'Usuário não encontrado ou inativo' })
        return null
      }
      return null
    }

    const authUser: AuthUser = {
      id: user.id,
      firebaseUid: user.firebaseUid!,
      email: user.email,
      role: user.role as 'CLIENT' | 'MANAGER',
      name: user.name
    }

    request.authUser = authUser
    request.firebaseUid = firebaseUid
    return authUser
  } catch (error: any) {
    logger.warning(`Auth token inválido: ${error.message}`)
    if (isAuthEnforced()) {
      reply.status(401).send({ success: false, error: 'Token inválido ou expirado' })
      return null
    }
    return null
  }
}

/** Exige autenticação + role MANAGER. */
export async function requireManager(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  const user = await requireAuth(request, reply)
  if (reply.sent) return null

  if (!user) {
    // Dev sem token: não bloqueia manager (AUTH_ENFORCE=false)
    if (!isAuthEnforced()) return null
    return null
  }

  if (user.role !== 'MANAGER') {
    reply.status(403).send({ success: false, error: 'Acesso restrito à administração' })
    return null
  }

  return user
}

/**
 * Garante que o `userId` do body/query/params é o próprio usuário autenticado,
 * ou que quem chama é MANAGER. Quando AUTH_ENFORCE=false e não há token, passa.
 */
export async function requireSelfOrManager(
  request: FastifyRequest,
  reply: FastifyReply,
  targetUserId: string | undefined
): Promise<AuthUser | null> {
  const user = await requireAuth(request, reply)
  if (reply.sent) return null

  if (!user) {
    if (!isAuthEnforced()) return null
    return null
  }

  if (user.role === 'MANAGER') return user

  if (!targetUserId || targetUserId !== user.id) {
    reply.status(403).send({ success: false, error: 'Você só pode acessar seus próprios dados' })
    return null
  }

  return user
}

/** Paths públicos (sem Bearer). Prefix match. */
export const PUBLIC_ROUTE_PREFIXES = [
  '/health',
  '/asaas/webhook',
]

export const PUBLIC_ROUTE_EXACT = new Set([
  'GET /services',
  'GET /plans',
  'GET /testimonials',
  'GET /banners',
  'GET /config',
  'GET /schedule/available',
  'GET /schedule/available-days',
  'GET /schedule/day-markers',
])

/** Rotas internas chamadas pelo cron via localhost — exigem header X-Cron-Secret se CRON_SECRET estiver setado. */
export const CRON_ROUTES = new Set([
  'POST /appointments/cancel-expired',
  'POST /appointments/auto-complete-previous-day',
])

export function isPublicRoute(method: string, url: string): boolean {
  const path = url.split('?')[0]
  if (PUBLIC_ROUTE_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) {
    return true
  }
  // GET /services/:id, GET /plans/:id, GET /plans/tier/:tier
  if (method === 'GET' && /^\/services\/[^/]+$/.test(path)) return true
  if (method === 'GET' && /^\/plans\/[^/]+$/.test(path)) return true
  if (method === 'GET' && /^\/plans\/tier\/[^/]+$/.test(path)) return true
  if (method === 'GET' && path === '/testimonials') return true
  if (method === 'GET' && path === '/banners') return true

  const key = `${method} ${path}`
  return PUBLIC_ROUTE_EXACT.has(key)
}
