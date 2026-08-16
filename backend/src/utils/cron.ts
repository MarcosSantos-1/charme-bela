import { logger } from './logger'

/**
 * Crons do backend.
 *
 * Padrão (scale-to-zero no Fly): roda manutenção uma vez quando a máquina acorda.
 * Assim o app continua consistente sem intervalos que mantêm processo/Neon ativos.
 *
 * No lançamento comercial (máquina sempre ligada), defina FLY_ALWAYS_ON=true
 * e no fly.toml: auto_stop_machines = 'off', min_machines_running = 1.
 */
function isAlwaysOn(): boolean {
  return process.env.FLY_ALWAYS_ON === 'true'
}

function localApiBase(): string {
  const port = process.env.PORT || '3333'
  return `http://127.0.0.1:${port}`
}

export function setupCronJobs() {
  // Sempre: limpeza ao acordar (cobre o caso scale-to-zero)
  void runWakeMaintenance()

  if (!isAlwaysOn()) {
    logger.success('✅ Cron em modo scale-to-zero (manutenção no wake)')
    logger.info('   Intervalos periódicos desligados — máquina pode dormir sem tráfego')
    logger.info('   Para sempre ligado: FLY_ALWAYS_ON=true + fly.toml min_machines_running=1')
    return
  }

  setupIntervalJobs()
}

async function runWakeMaintenance() {
  try {
    logger.info('🌅 Manutenção pós-wake iniciada...')
    // Não inclui check de vouchers: avisaria de novo a cada cold start
    await cancelExpiredAppointments()
    await expireFreeMonthSubscriptions()
    await autoCompletePreviousDayAppointments()
    await finalizeMachineRentals()
    logger.success('✅ Manutenção pós-wake concluída')
  } catch (error) {
    logger.error('Erro na manutenção pós-wake:', error)
  }
}

async function finalizeMachineRentals() {
  try {
    const { finalizePastReleasedOccurrences } = await import('./machineRental')
    const n = await finalizePastReleasedOccurrences()
    if (n > 0) logger.info(`🖨️ ${n} ocorrência(s) de máquina finalizada(s)`)
  } catch (error) {
    logger.error('Erro ao finalizar machine rentals:', error)
  }
}

function setupIntervalJobs() {
  // Cancela agendamentos expirados a cada 30 minutos
  setInterval(async () => {
    try {
      await cancelExpiredAppointments()
    } catch (error) {
      logger.error('Erro no cron de cancelamento:', error)
    }
  }, 30 * 60 * 1000)

  // Auto-completa tratamentos do dia anterior (à meia-noite)
  const scheduleAutoComplete = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)

    const msUntilMidnight = midnight.getTime() - now.getTime()

    setTimeout(() => {
      void autoCompletePreviousDayAppointments()
      setInterval(() => {
        void autoCompletePreviousDayAppointments()
      }, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }

  scheduleAutoComplete()

  // Vouchers expirando (diariamente às 10:00)
  const scheduleVoucherCheck = () => {
    const now = new Date()
    const target = new Date(now)
    target.setHours(10, 0, 0, 0)

    if (now.getHours() >= 10) {
      target.setDate(target.getDate() + 1)
    }

    const msUntilTarget = target.getTime() - now.getTime()

    setTimeout(() => {
      void checkExpiringVouchers()
      setInterval(() => {
        void checkExpiringVouchers()
      }, 24 * 60 * 60 * 1000)
    }, msUntilTarget)
  }

  scheduleVoucherCheck()

  // Expirar assinaturas de mês grátis (a cada 6 horas)
  setInterval(async () => {
    try {
      await expireFreeMonthSubscriptions()
    } catch (error) {
      logger.error('Erro ao expirar meses grátis:', error)
    }
  }, 6 * 60 * 60 * 1000)

  logger.success('✅ Cron jobs em modo always-on (FLY_ALWAYS_ON=true):')
  logger.info('   - Cancelamento automático: a cada 30min')
  logger.info('   - Auto-completar tratamentos: diariamente à meia-noite')
  logger.info('   - Notificar vouchers expirando: diariamente às 10:00')
  logger.info('   - Expirar meses grátis: a cada 6 horas')
}

async function cancelExpiredAppointments() {
  logger.info('🕐 Verificando agendamentos expirados...')

  const response = await fetch(`${localApiBase()}/appointments/cancel-expired`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.CRON_SECRET ? { 'X-Cron-Secret': process.env.CRON_SECRET } : {}),
    }
  })

  const data = await response.json() as { canceled?: number }

  if (data.canceled && data.canceled > 0) {
    logger.warning(`⏰ ${data.canceled} agendamento(s) expirado(s) cancelado(s)`)
  }
}

async function expireFreeMonthSubscriptions() {
  logger.info('🎁 Verificando assinaturas de mês grátis expiradas...')

  const { prisma } = await import('../lib/prisma')
  const { createNotification } = await import('./notifications')

  const now = new Date()

  const expiredFreeMonths = await prisma.subscription.findMany({
    where: {
      stripeSubscriptionId: null,
      asaasSubscriptionId: null,
      status: 'ACTIVE',
      endDate: {
        lt: now
      }
    },
    include: {
      user: true,
      plan: true
    }
  })

  for (const subscription of expiredFreeMonths) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: now,
        cancelReason: 'Mês grátis expirado'
      }
    })

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
}

async function checkExpiringVouchers() {
  try {
    logger.info('🎁 Verificando vouchers expirando...')

    const { prisma } = await import('../lib/prisma')
    const { notifyVoucherExpiring } = await import('./notifications')

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

async function autoCompletePreviousDayAppointments() {
  try {
    logger.info('🌙 Executando auto-completar de tratamentos do dia anterior...')

    const response = await fetch(`${localApiBase()}/appointments/auto-complete-previous-day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { 'X-Cron-Secret': process.env.CRON_SECRET } : {}),
      }
    })

    const data = await response.json() as { completed?: number }

    if (data.completed && data.completed > 0) {
      logger.success(`✅ ${data.completed} tratamento(s) do dia anterior marcado(s) como concluído(s) automaticamente`)
    } else {
      logger.info('ℹ️ Nenhum tratamento pendente do dia anterior para completar')
    }
  } catch (error) {
    logger.error('Erro ao auto-completar tratamentos:', error)
  }
}
