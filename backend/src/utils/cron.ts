import { logger } from './logger'

// Função para executar tarefas periódicas
export function setupCronJobs() {
  // Cancela agendamentos expirados a cada 5 minutos
  setInterval(async () => {
    try {
      logger.info('🕐 Verificando agendamentos expirados...')
      
      const response = await fetch('http://localhost:3333/appointments/cancel-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json() as any
      
      if (data.canceled > 0) {
        logger.warning(`⏰ ${data.canceled} agendamento(s) expirado(s) cancelado(s)`)
      }
    } catch (error) {
      logger.error('Erro no cron de cancelamento:', error)
    }
  }, 5 * 60 * 1000) // 5 minutos
  
  // Auto-completa tratamentos do dia anterior (roda à meia-noite)
  const scheduleAutoComplete = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0) // Próxima meia-noite
    
    const msUntilMidnight = midnight.getTime() - now.getTime()
    
    setTimeout(() => {
      autoCompletePreviousDayAppointments()
      // Agenda para rodar todo dia à meia-noite
      setInterval(autoCompletePreviousDayAppointments, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }
  
  scheduleAutoComplete()
  
  // Cron Job 3: Verificar vouchers expirando (diariamente às 10:00)
  const scheduleVoucherCheck = () => {
    const now = new Date()
    const target = new Date(now)
    target.setHours(10, 0, 0, 0) // 10:00
    
    // Se já passou das 10h hoje, agenda para amanhã
    if (now.getHours() >= 10) {
      target.setDate(target.getDate() + 1)
    }
    
    const msUntilTarget = target.getTime() - now.getTime()
    
    setTimeout(() => {
      checkExpiringVouchers()
      // Agenda para rodar todo dia às 10:00
      setInterval(checkExpiringVouchers, 24 * 60 * 60 * 1000)
    }, msUntilTarget)
  }
  
  scheduleVoucherCheck()
  
  // Cron Job 4: Expirar assinaturas de mês grátis (a cada hora)
  setInterval(async () => {
    try {
      logger.info('🎁 Verificando assinaturas de mês grátis expiradas...')
      
      const { prisma } = await import('../lib/prisma')
      const { createNotification } = await import('./notifications')
      
      const now = new Date()
      
      // Buscar assinaturas de mês grátis que já expiraram
      const expiredFreeMonths = await prisma.subscription.findMany({
        where: {
          stripeSubscriptionId: null, // Mês grátis (sem Stripe)
          status: 'ACTIVE',
          endDate: {
            lt: now // endDate já passou
          }
        },
        include: {
          user: true,
          plan: true
        }
      })
      
      for (const subscription of expiredFreeMonths) {
        // Cancelar assinatura
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'CANCELED',
            canceledAt: now,
            cancelReason: 'Mês grátis expirado'
          }
        })
        
        // Notificar cliente
        await createNotification({
          userId: subscription.userId,
          type: 'SUBSCRIPTION_CANCELED',
          title: 'Seu Mês Grátis Expirou',
          message: `Seu período de teste do plano ${subscription.plan.name} terminou. Que tal assinar para continuar aproveitando?`,
          icon: 'INFO',
          priority: 'HIGH',
          actionUrl: '/planos',
          actionLabel: 'Ver Planos'
        })
        
        logger.warning(`⏰ Mês grátis expirado para ${subscription.user.name} - assinatura cancelada`)
      }
      
      if (expiredFreeMonths.length > 0) {
        logger.success(`✅ ${expiredFreeMonths.length} assinatura(s) de mês grátis expirada(s)`)
      }
    } catch (error) {
      logger.error('Erro ao expirar meses grátis:', error)
    }
  }, 60 * 60 * 1000) // A cada 1 hora
  
  logger.success('✅ Cron jobs iniciados:')
  logger.info('   - Cancelamento automático: a cada 5min')
  logger.info('   - Auto-completar tratamentos: diariamente à meia-noite')
  logger.info('   - Notificar vouchers expirando: diariamente às 10:00')
  logger.info('   - Expirar meses grátis: a cada 1 hora')
}

// Função para notificar vouchers expirando
async function checkExpiringVouchers() {
  try {
    logger.info('🎁 Verificando vouchers expirando...')
    
    const { prisma } = await import('../lib/prisma')
    const { notifyVoucherExpiring } = await import('./notifications')
    
    // Buscar vouchers que expiram nos próximos 7 dias
    const now = new Date()
    const in7Days = new Date()
    in7Days.setDate(in7Days.getDate() + 7)
    
    const expiringVouchers = await prisma.voucher.findMany({
      where: {
        isUsed: false,
        expiresAt: {
          gte: now,
          lte: in7Days
        }
      },
      include: {
        user: true
      }
    })
    
    // Notificar cada cliente
    for (const voucher of expiringVouchers) {
      await notifyVoucherExpiring(voucher.userId, {
        description: voucher.description,
        expiresAt: voucher.expiresAt!
      })
    }
    
    if (expiringVouchers.length > 0) {
      logger.warning(`⚠️ ${expiringVouchers.length} voucher(s) expirando em breve - clientes notificados`)
    } else {
      logger.info('ℹ️ Nenhum voucher expirando nos próximos 7 dias')
    }
  } catch (error) {
    logger.error('Erro ao verificar vouchers expirando:', error)
  }
}

// Função para auto-completar tratamentos do dia anterior
async function autoCompletePreviousDayAppointments() {
  try {
    logger.info('🌙 Executando auto-completar de tratamentos do dia anterior...')
    
    const response = await fetch('http://localhost:3333/appointments/auto-complete-previous-day', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    const data = await response.json() as any
    
    if (data.completed > 0) {
      logger.success(`✅ ${data.completed} tratamento(s) do dia anterior marcado(s) como concluído(s) automaticamente`)
    } else {
      logger.info('ℹ️ Nenhum tratamento pendente do dia anterior para completar')
    }
  } catch (error) {
    logger.error('Erro ao auto-completar tratamentos:', error)
  }
}

