import { prisma } from '../lib/prisma'
import { logger } from './logger'

// ============================================
// TIPOS E INTERFACES
// ============================================

type NotificationType = 
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_COMPLETED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_EXPIRING'
  | 'NEW_CLIENT_REGISTERED'
  | 'NEW_APPOINTMENT_REQUEST'
  | 'CLIENT_CANCELED'
  | 'VOUCHER_RECEIVED'
  | 'VOUCHER_EXPIRING'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_CANCELED'
  | 'PLAN_LIMIT_REACHED'
  | 'SYSTEM_MESSAGE'
  | 'PROMOTION'
  | 'WELCOME'

type NotificationIcon = 
  | 'BELL'
  | 'CALENDAR'
  | 'CARD'
  | 'SPARKLES'
  | 'ALERT'
  | 'CHECK'
  | 'INFO'
  | 'GIFT'
  | 'STAR'
  | 'USER'

type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

interface CreateNotificationParams {
  userId?: string | null  // null = notificação para admin
  type: NotificationType
  title: string
  message: string
  icon?: NotificationIcon
  priority?: NotificationPriority
  metadata?: any
  actionUrl?: string
  actionLabel?: string
  expiresAt?: Date
}

// ============================================
// HELPER FUNCTION PRINCIPAL
// ============================================

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId === 'admin' ? null : (params.userId || null),
        type: params.type,
        title: params.title,
        message: params.message,
        icon: params.icon || 'BELL',
        priority: params.priority || 'NORMAL',
        metadata: params.metadata || undefined,
        actionUrl: params.actionUrl,
        actionLabel: params.actionLabel,
        expiresAt: params.expiresAt,
      }
    })
    
    logger.info(`🔔 Notificação criada: ${params.type} para ${params.userId || 'ADMIN'}`)
    return notification
  } catch (error: any) {
    logger.error('Erro ao criar notificação:', error)
    // Não falhar a operação principal se a notificação falhar
    return null
  }
}

// ============================================
// AGENDAMENTOS
// ============================================

export async function notifyAppointmentConfirmed(
  userId: string,
  appointmentData: {
    serviceName: string
    startTime: Date
  }
) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(appointmentData.startTime)
  
  return createNotification({
    userId,
    type: 'APPOINTMENT_CONFIRMED',
    title: 'Agendamento Confirmado! ✨',
    message: `Seu agendamento de ${appointmentData.serviceName} foi confirmado para ${formattedDate}`,
    icon: 'CHECK',
    priority: 'HIGH',
    actionUrl: '/cliente/agenda',
    actionLabel: 'Ver Agenda',
    metadata: appointmentData
  })
}

export async function notifyAppointmentCanceled(
  userId: string,
  appointmentData: {
    serviceName: string
    startTime: Date
    cancelReason?: string
  }
) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(appointmentData.startTime)
  
  let message = `Seu agendamento de ${appointmentData.serviceName} para ${formattedDate} foi cancelado`
  if (appointmentData.cancelReason) {
    message += `. Motivo: ${appointmentData.cancelReason}`
  }
  
  return createNotification({
    userId,
    type: 'APPOINTMENT_CANCELED',
    title: 'Agendamento Cancelado',
    message,
    icon: 'ALERT',
    priority: 'HIGH',
    actionUrl: '/cliente/agenda',
    actionLabel: 'Ver Agenda',
    metadata: appointmentData
  })
}

export async function notifyAppointmentRescheduled(
  userId: string,
  appointmentData: {
    serviceName: string
    oldStartTime: Date
    newStartTime: Date
  }
) {
  const oldDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(appointmentData.oldStartTime)
  
  const newDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(appointmentData.newStartTime)
  
  return createNotification({
    userId,
    type: 'APPOINTMENT_RESCHEDULED',
    title: 'Agendamento Reagendado',
    message: `Seu agendamento de ${appointmentData.serviceName} foi reagendado de ${oldDate} para ${newDate}`,
    icon: 'CALENDAR',
    priority: 'HIGH',
    actionUrl: '/cliente/agenda',
    actionLabel: 'Ver Agenda',
    metadata: appointmentData
  })
}

export async function notifyAppointmentReminder(
  userId: string,
  appointmentData: {
    serviceName: string
    startTime: Date
  }
) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(appointmentData.startTime)
  
  return createNotification({
    userId,
    type: 'APPOINTMENT_REMINDER',
    title: 'Lembrete de Agendamento',
    message: `Você tem um agendamento de ${appointmentData.serviceName} amanhã às ${formattedDate}`,
    icon: 'CALENDAR',
    priority: 'NORMAL',
    actionUrl: '/cliente/agenda',
    actionLabel: 'Ver Detalhes',
    metadata: appointmentData
  })
}

export async function notifyAppointmentCompleted(
  userId: string,
  appointmentData: {
    serviceName: string
  }
) {
  return createNotification({
    userId,
    type: 'APPOINTMENT_COMPLETED',
    title: 'Tratamento Concluído',
    message: `Seu tratamento de ${appointmentData.serviceName} foi concluído com sucesso! Esperamos que tenha gostado 💖`,
    icon: 'CHECK',
    priority: 'NORMAL',
    actionUrl: '/cliente/historico',
    actionLabel: 'Ver Histórico',
    metadata: appointmentData
  })
}

// ============================================
// NOTIFICAÇÕES PARA ADMIN - AGENDAMENTOS
// ============================================

export async function notifyAdminNewAppointmentRequest(appointmentData: {
  clientName: string
  serviceName: string
  startTime: Date
  appointmentId: string
}) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(appointmentData.startTime)
  
  return createNotification({
    userId: null, // Admin
    type: 'NEW_APPOINTMENT_REQUEST',
    title: 'Novo Pedido de Agendamento',
    message: `${appointmentData.clientName} solicitou agendamento de ${appointmentData.serviceName} para ${formattedDate}`,
    icon: 'CALENDAR',
    priority: 'HIGH',
    actionUrl: '/admin/atividades',
    actionLabel: 'Ver Atividades',
    metadata: appointmentData
  })
}

export async function notifyAdminClientCanceled(appointmentData: {
  clientName: string
  serviceName: string
  startTime: Date
  cancelReason?: string
}) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(appointmentData.startTime)
  
  let message = `${appointmentData.clientName} cancelou o agendamento de ${appointmentData.serviceName} para ${formattedDate}`
  if (appointmentData.cancelReason) {
    message += `. Motivo: ${appointmentData.cancelReason}`
  }
  
  return createNotification({
    userId: null, // Admin
    type: 'CLIENT_CANCELED',
    title: 'Agendamento Cancelado pelo Cliente',
    message,
    icon: 'ALERT',
    priority: 'NORMAL',
    actionUrl: '/admin/atividades',
    actionLabel: 'Ver Atividades',
    metadata: appointmentData
  })
}

// ============================================
// PAGAMENTOS
// ============================================

export async function notifyPaymentSucceeded(
  userId: string,
  paymentData: {
    amount: number
    description: string
    nextBillingDate?: Date
  }
) {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(paymentData.amount)
  
  let message = `Pagamento de ${formattedAmount} processado com sucesso`
  if (paymentData.nextBillingDate) {
    const nextDate = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short'
    }).format(paymentData.nextBillingDate)
    message += `. Próxima cobrança: ${nextDate}`
  }
  
  return createNotification({
    userId,
    type: 'PAYMENT_SUCCEEDED',
    title: 'Pagamento Aprovado',
    message,
    icon: 'CARD',
    priority: 'NORMAL',
    actionUrl: '/cliente/pagamentos',
    actionLabel: 'Ver Pagamentos',
    metadata: paymentData
  })
}

export async function notifyPaymentFailed(
  userId: string,
  paymentData: {
    amount: number
    description: string
    reason?: string
  }
) {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(paymentData.amount)
  
  let message = `O pagamento de ${formattedAmount} falhou`
  if (paymentData.reason) {
    message += `. Motivo: ${paymentData.reason}`
  }
  message += '. Por favor, atualize sua forma de pagamento.'
  
  return createNotification({
    userId,
    type: 'PAYMENT_FAILED',
    title: 'Falha no Pagamento',
    message,
    icon: 'ALERT',
    priority: 'URGENT',
    actionUrl: '/cliente/pagamentos',
    actionLabel: 'Atualizar Pagamento',
    metadata: paymentData
  })
}

export async function notifySubscriptionRenewed(
  userId: string,
  subscriptionData: {
    planName: string
    amount: number
    nextBillingDate: Date
  }
) {
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(subscriptionData.amount)
  
  const nextDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).format(subscriptionData.nextBillingDate)
  
  return createNotification({
    userId,
    type: 'SUBSCRIPTION_RENEWED',
    title: 'Assinatura Renovada',
    message: `Sua assinatura ${subscriptionData.planName} foi renovada por ${formattedAmount}. Próxima cobrança: ${nextDate}`,
    icon: 'CHECK',
    priority: 'NORMAL',
    actionUrl: '/cliente/plano',
    actionLabel: 'Ver Plano',
    metadata: subscriptionData
  })
}

// ============================================
// VOUCHERS
// ============================================

export async function notifyVoucherReceived(
  userId: string,
  voucherData: {
    description: string
    type: string
    expiresAt?: Date
  }
) {
  let message = `Você ganhou: ${voucherData.description}`
  if (voucherData.expiresAt) {
    const expiryDate = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short'
    }).format(voucherData.expiresAt)
    message += `. Válido até ${expiryDate}`
  }
  
  // Redirecionar para página apropriada baseado no tipo
  let actionUrl = '/cliente/servicos'
  let actionLabel = 'Ver Tratamentos'
  
  if (voucherData.type === 'FREE_MONTH') {
    actionUrl = '/cliente/plano'
    actionLabel = 'Ativar Plano'
  }
  
  return createNotification({
    userId,
    type: 'VOUCHER_RECEIVED',
    title: 'Você Ganhou um Presente! 🎁',
    message,
    icon: 'GIFT',
    priority: 'HIGH',
    actionUrl,
    actionLabel,
    metadata: voucherData
  })
}

export async function notifyVoucherExpiring(
  userId: string,
  voucherData: {
    description: string
    expiresAt: Date
  }
) {
  const expiryDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).format(voucherData.expiresAt)
  
  return createNotification({
    userId,
    type: 'VOUCHER_EXPIRING',
    title: 'Seu Presente Está Expirando! ⏰',
    message: `Seu voucher "${voucherData.description}" expira em ${expiryDate}. Não perca!`,
    icon: 'ALERT',
    priority: 'HIGH',
    actionUrl: '/cliente/servicos',
    actionLabel: 'Usar Agora',
    metadata: voucherData
  })
}

// ============================================
// ASSINATURAS
// ============================================

export async function notifySubscriptionActivated(
  userId: string,
  subscriptionData: {
    planName: string
    maxTreatments: number
  }
) {
  return createNotification({
    userId,
    type: 'SUBSCRIPTION_ACTIVATED',
    title: 'Assinatura Ativada! 🎉',
    message: `Sua assinatura ${subscriptionData.planName} foi ativada com sucesso! Você tem ${subscriptionData.maxTreatments} tratamentos por mês.`,
    icon: 'SPARKLES',
    priority: 'HIGH',
    actionUrl: '/cliente/plano',
    actionLabel: 'Ver Plano',
    metadata: subscriptionData
  })
}

export async function notifySubscriptionCanceled(
  userId: string,
  subscriptionData: {
    planName: string
    endDate: Date
  }
) {
  const endDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(subscriptionData.endDate)
  
  return createNotification({
    userId,
    type: 'SUBSCRIPTION_CANCELED',
    title: 'Assinatura Cancelada',
    message: `Sua assinatura ${subscriptionData.planName} foi cancelada e terminará em ${endDate}. Sentiremos sua falta! 💔`,
    icon: 'ALERT',
    priority: 'HIGH',
    actionUrl: '/cliente/plano',
    actionLabel: 'Ver Detalhes',
    metadata: subscriptionData
  })
}

export async function notifyPlanLimitReached(
  userId: string,
  planData: {
    planName: string
    limitType: string
  }
) {
  return createNotification({
    userId,
    type: 'PLAN_LIMIT_REACHED',
    title: 'Limite do Plano Atingido',
    message: `Você atingiu o limite ${planData.limitType} do seu plano ${planData.planName}. Considere fazer upgrade!`,
    icon: 'INFO',
    priority: 'NORMAL',
    actionUrl: '/planos',
    actionLabel: 'Ver Planos',
    metadata: planData
  })
}

// ============================================
// CLIENTES (Admin)
// ============================================

export async function notifyAdminNewClientRegistered(clientData: {
  clientName: string
  email: string
  userId: string
}) {
  return createNotification({
    userId: null, // Admin
    type: 'NEW_CLIENT_REGISTERED',
    title: 'Novo Cliente Cadastrado',
    message: `${clientData.clientName} (${clientData.email}) acabou de se cadastrar no sistema!`,
    icon: 'USER',
    priority: 'NORMAL',
    actionUrl: '/admin/atividades',
    actionLabel: 'Ver Atividades',
    metadata: clientData
  })
}

// ============================================
// SISTEMA
// ============================================

export async function notifyWelcome(userId: string, userName: string) {
  return createNotification({
    userId,
    type: 'WELCOME',
    title: `Bem-vinda, ${userName}! 💖`,
    message: 'Estamos felizes em ter você no Charme & Bela Club! Explore nossos tratamentos e agende seu primeiro horário.',
    icon: 'SPARKLES',
    priority: 'HIGH',
    actionUrl: '/cliente/servicos',
    actionLabel: 'Ver Tratamentos'
  })
}

export async function notifySystemMessage(
  userId: string | null,
  messageData: {
    title: string
    message: string
    actionUrl?: string
    actionLabel?: string
  }
) {
  return createNotification({
    userId,
    type: 'SYSTEM_MESSAGE',
    title: messageData.title,
    message: messageData.message,
    icon: 'INFO',
    priority: 'NORMAL',
    actionUrl: messageData.actionUrl,
    actionLabel: messageData.actionLabel
  })
}

export async function notifyPromotion(
  userId: string,
  promotionData: {
    title: string
    message: string
    actionUrl?: string
    actionLabel?: string
  }
) {
  return createNotification({
    userId,
    type: 'PROMOTION',
    title: promotionData.title,
    message: promotionData.message,
    icon: 'STAR',
    priority: 'NORMAL',
    actionUrl: promotionData.actionUrl,
    actionLabel: promotionData.actionLabel
  })
}


