import { prisma } from '../lib/prisma'
import { logger } from './logger'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type ExpoPushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  priority?: 'default' | 'normal' | 'high'
  channelId?: string
}

type ExpoPushTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string; fault?: string }
}

function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[')
  )
}

/**
 * Envia push via Expo Push API.
 * Em caso de token inválido/desregistrado, limpa `User.expoPushToken`.
 */
export async function sendExpoPush(message: ExpoPushMessage): Promise<boolean> {
  if (!isExpoPushToken(message.to)) {
    logger.warning(`Token push inválido (ignorado): ${message.to.slice(0, 24)}…`)
    return false
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: message.to,
        title: message.title,
        body: message.body,
        data: message.data ?? {},
        sound: message.sound ?? 'default',
        priority: message.priority ?? 'high',
        channelId: message.channelId ?? 'default',
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.error(`Expo Push HTTP ${response.status}: ${text}`)
      return false
    }

    const json = (await response.json()) as { data?: ExpoPushTicket | ExpoPushTicket[] }
    const ticket = Array.isArray(json.data) ? json.data[0] : json.data

    if (!ticket) {
      logger.warning('Expo Push: resposta sem ticket')
      return false
    }

    if (ticket.status === 'error') {
      const errCode = ticket.details?.error
      logger.warning(`Expo Push erro: ${ticket.message || errCode || 'unknown'}`)
      if (errCode === 'DeviceNotRegistered' || errCode === 'InvalidCredentials') {
        await clearPushToken(message.to)
      }
      return false
    }

    return true
  } catch (error) {
    logger.error('Falha ao enviar Expo Push:', error)
    return false
  }
}

async function clearPushToken(token: string) {
  try {
    await prisma.user.updateMany({
      where: { expoPushToken: token },
      data: { expoPushToken: null },
    })
    logger.info('expoPushToken limpo (DeviceNotRegistered)')
  } catch (error) {
    logger.error('Erro ao limpar expoPushToken:', error)
  }
}

const APPOINTMENT_REMINDER_TYPES = new Set([
  'APPOINTMENT_REMINDER',
])

/**
 * Dispara push para o usuário da notificação in-app, respeitando prefs.
 * Fire-and-forget seguro — nunca lança.
 */
export async function sendPushForUserNotification(params: {
  userId: string
  notificationId: string
  type: string
  title: string
  message: string
  actionUrl?: string | null
}): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        expoPushToken: true,
        pushAllEnabled: true,
        appointmentRemindersEnabled: true,
        isActive: true,
      },
    })

    if (!user?.isActive || !user.expoPushToken) return
    if (!user.pushAllEnabled) return
    if (
      APPOINTMENT_REMINDER_TYPES.has(params.type) &&
      !user.appointmentRemindersEnabled
    ) {
      return
    }

    await sendExpoPush({
      to: user.expoPushToken,
      title: params.title,
      body: params.message,
      data: {
        notificationId: params.notificationId,
        type: params.type,
        actionUrl: params.actionUrl ?? null,
      },
    })
  } catch (error) {
    logger.error('sendPushForUserNotification falhou:', error)
  }
}
