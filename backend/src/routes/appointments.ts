import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import {
  notifyAppointmentConfirmed,
  notifyAppointmentCanceled,
  notifyAppointmentRescheduled,
  notifyAppointmentCompleted,
  notifyAdminNewAppointmentRequest,
  notifyAdminClientCanceled
} from '../utils/notifications'

// Função auxiliar para verificar e atualizar uso mensal
async function updateMonthlyUsage(userId: string, appointmentDate: Date) {
  const month = appointmentDate.getMonth() + 1
  const year = appointmentDate.getFullYear()
  
  // Busca ou cria o registro de uso mensal
  let monthlyUsage = await prisma.monthlyUsage.findUnique({
    where: {
      userId_month_year: { userId, month, year }
    }
  })
  
  if (!monthlyUsage) {
    monthlyUsage = await prisma.monthlyUsage.create({
      data: {
        userId,
        month,
        year,
        totalTreatments: 1,
        facialTreatments: 0, // Mantém por compatibilidade, mas não usa mais
        weeklyUsage: {} // Mantém por compatibilidade, mas não usa mais
      }
    })
  } else {
    // Atualiza contador
    await prisma.monthlyUsage.update({
      where: { id: monthlyUsage.id },
      data: {
        totalTreatments: monthlyUsage.totalTreatments + 1
      }
    })
  }
}

export async function appointmentsRoutes(app: FastifyInstance) {
  // POST - Cancelar agendamentos expirados (chamado periodicamente)
  app.post('/appointments/cancel-expired', async (request, reply) => {
    logger.route('POST', '/appointments/cancel-expired')
    
    try {
      const now = new Date()
      
      // Busca agendamentos expirados
      // TEMPORARIAMENTE COMENTADO - rode: npx prisma generate
      const expiredAppointments: any[] = [] // await prisma.appointment.findMany({
      //   where: {
      //     origin: 'SINGLE',
      //     paymentStatus: 'PENDING',
      //     paymentExpiresAt: {
      //       lt: now
      //     },
      //     status: 'PENDING'
      //   }
      // })
      
      if (expiredAppointments.length === 0) {
        return reply.status(200).send({
          success: true,
          message: 'Nenhum agendamento expirado',
          canceled: 0
        })
      }
      
      // Cancela todos
      const canceledIds = []
      for (const apt of expiredAppointments) {
        await prisma.appointment.update({
          where: { id: apt.id },
          data: {
            status: 'CANCELED',
            canceledBy: 'system',
            canceledAt: now,
            cancelReason: 'Pagamento não realizado (15 min)'
          }
        })
        
        canceledIds.push(apt.id)
      }
      
      logger.success(`✅ ${expiredAppointments.length} agendamento(s) expirado(s) cancelado(s)`)
      
      return reply.status(200).send({
        success: true,
        canceled: expiredAppointments.length,
        appointmentIds: canceledIds
      })
    } catch (error) {
      logger.error('Erro ao cancelar expirados:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao cancelar agendamentos expirados'
      })
    }
  })
  
  // POST - Auto-completar tratamentos do dia anterior
  app.post('/appointments/auto-complete-previous-day', async (request, reply) => {
    logger.route('POST', '/appointments/auto-complete-previous-day')
    
    try {
      const now = new Date()
      
      // Define início e fim do dia anterior
      const yesterdayStart = new Date(now)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      yesterdayStart.setHours(0, 0, 0, 0)
      
      const yesterdayEnd = new Date(now)
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)
      yesterdayEnd.setHours(23, 59, 59, 999)
      
      logger.info(`🌙 Buscando tratamentos do dia anterior: ${yesterdayStart.toLocaleDateString('pt-BR')}`)
      
      // Busca agendamentos do dia anterior que não foram concluídos
      const pendingAppointments = await prisma.appointment.findMany({
        where: {
          startTime: {
            gte: yesterdayStart,
            lte: yesterdayEnd
          },
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          service: {
            select: {
              name: true
            }
          }
        }
      })
      
      if (pendingAppointments.length === 0) {
        logger.info('ℹ️ Nenhum tratamento pendente do dia anterior')
        return reply.status(200).send({
          success: true,
          completed: 0,
          message: 'Nenhum tratamento pendente do dia anterior'
        })
      }
      
      // Marca todos como concluídos
      const completedIds: string[] = []
      
      for (const appointment of pendingAppointments) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            status: 'COMPLETED',
            confirmedByAdmin: true,
            updatedAt: new Date()
          }
        })
        
        completedIds.push(appointment.id)
        
        logger.success(`✅ Auto-completado: ${appointment.user?.name} - ${appointment.service?.name}`)
      }
      
      logger.success(`✅ ${completedIds.length} tratamento(s) do dia anterior marcado(s) como concluído(s)`)
      
      return reply.status(200).send({
        success: true,
        completed: completedIds.length,
        appointmentIds: completedIds,
        message: `${completedIds.length} tratamento(s) marcado(s) como concluído(s) automaticamente`
      })
    } catch (error) {
      logger.error('Erro ao auto-completar tratamentos:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao auto-completar tratamentos do dia anterior'
      })
    }
  })
  
  // GET - Listar agendamentos (com filtros)
  app.get('/appointments', async (request, reply) => {
    logger.route('GET', '/appointments')
    
    try {
      const { userId, status, startDate, endDate } = request.query as {
        userId?: string
        status?: string
        startDate?: string
        endDate?: string
      }
      
      const appointments = await prisma.appointment.findMany({
        where: {
          ...(userId && { userId }),
          ...(status && { status: status.toUpperCase() as any }),
          ...(startDate && endDate && {
            startTime: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          }),
          // Se buscar por userId (cliente), não mostra os ocultos do histórico
          // TEMPORÁRIO: descomentar após regenerar Prisma
          // ...(userId && { hiddenFromHistory: false })
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          service: true,
          voucher: true
        },
        orderBy: { startTime: 'asc' }
      })
      
      logger.success(`Retornando ${appointments.length} agendamentos`)
      return reply.status(200).send({
        success: true,
        data: appointments
      })
    } catch (error) {
      logger.error('Erro ao buscar agendamentos:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar agendamentos'
      })
    }
  })

  // GET - Buscar agendamento por ID
  app.get('/appointments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/appointments/${id}`)
    
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          service: true,
          voucher: true
        }
      })
      
      if (!appointment) {
        logger.warning(`Agendamento não encontrado: ${id}`)
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }
      
      logger.success(`Agendamento encontrado: ${appointment.id}`)
      return reply.status(200).send({
        success: true,
        data: appointment
      })
    } catch (error) {
      logger.error('Erro ao buscar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar agendamento'
      })
    }
  })

  // POST - Criar novo agendamento
  app.post('/appointments', async (request, reply) => {
    logger.route('POST', '/appointments')
    
    try {
      const body = request.body as any
      const userId = body.userId
      const serviceId = body.serviceId
      const startTime = body.startTime
      const origin = body.origin
      const voucherId = body.voucherId
      const paymentMethod = body.paymentMethod
      const paymentAmount = body.paymentAmount
      const paymentStatus = body.paymentStatus
      const notes = body.notes
      
      logger.debug('Criando novo agendamento:', { userId, serviceId, startTime, origin, paymentStatus, paymentAmount })
      
      // 1. Valida origin
      const validOrigins = ['SUBSCRIPTION', 'SINGLE', 'VOUCHER', 'ADMIN_CREATED']
      if (!origin || !validOrigins.includes(origin.toUpperCase())) {
        return reply.status(400).send({
          success: false,
          error: 'Origin inválido. Use: SUBSCRIPTION, SINGLE, VOUCHER ou ADMIN_CREATED'
        })
      }
      
      // 2. Verifica se usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: {
            include: {
              plan: true
            }
          },
          anamnesisForm: true
        }
      })
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      // 3. Verifica se tem anamnese preenchida (OBRIGATÓRIO para primeiro agendamento)
      const hasAppointments = await prisma.appointment.count({
        where: { userId, status: { not: 'CANCELED' } }
      })
      
      if (hasAppointments === 0 && !user.anamnesisForm) {
        return reply.status(400).send({
          success: false,
          error: 'É necessário preencher a ficha de anamnese antes do primeiro agendamento'
        })
      }
      
      // 4. Busca o serviço
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      })
      
      if (!service) {
        return reply.status(404).send({
          success: false,
          error: 'Serviço não encontrado'
        })
      }
      
      // 5. Calcula horário de término
      const appointmentStart = new Date(startTime)
      const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000)
      
      // 6. Verifica se já existe agendamento NO MESMO HORÁRIO EXATO (não bloqueia por duração)
      // NOTA: Clínica tem múltiplas macas, então apenas avisa se já existe outro agendamento
      // começando no mesmo horário, mas NÃO impede (permite atendimento simultâneo)
      const sameTimeAppointment = await prisma.appointment.findFirst({
        where: {
          startTime: appointmentStart,
          status: { not: 'CANCELED' }
        }
      })
      
      if (sameTimeAppointment) {
        logger.warning(`⚠️ Já existe agendamento no horário ${startTime}, mas permitindo (múltiplas macas)`)
      }
      
      /* VALIDAÇÃO DE CONFLITO TOTAL DESABILITADA - Múltiplas macas
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          status: { not: 'CANCELED' },
          OR: [
            { AND: [{ startTime: { lte: appointmentStart } }, { endTime: { gt: appointmentStart } }] },
            { AND: [{ startTime: { lt: appointmentEnd } }, { endTime: { gte: appointmentEnd } }] },
            { AND: [{ startTime: { gte: appointmentStart } }, { endTime: { lte: appointmentEnd } }] }
          ]
        }
      })
      
      if (conflictingAppointment) {
        return reply.status(400).send({
          success: false,
          error: 'Já existe um agendamento neste horário',
          conflictWith: conflictingAppointment.id
        })
      }
      */
      
      // 7. Se for de assinatura, valida limites do plano
      if (origin === 'SUBSCRIPTION') {
        if (!user.subscription || user.subscription.status !== 'ACTIVE') {
          return reply.status(400).send({
            success: false,
            error: 'Usuário não possui assinatura ativa'
          })
        }
        
        const plan = user.subscription.plan
        const month = appointmentStart.getMonth() + 1
        const year = appointmentStart.getFullYear()
        
        // Busca uso mensal DO MÊS DO AGENDAMENTO (não do mês atual)
        const monthlyUsage = await prisma.monthlyUsage.findUnique({
          where: {
            userId_month_year: { userId, month, year }
          }
        })
        
        // Valida limite mensal para o mês ESPECÍFICO do agendamento
        // Cada mês tem seu próprio limite independente
        if (monthlyUsage && monthlyUsage.totalTreatments >= plan.maxTreatmentsPerMonth) {
          return reply.status(400).send({
            success: false,
            error: `Limite mensal de ${plan.maxTreatmentsPerMonth} tratamentos atingido para ${month}/${year}`,
            currentUsage: monthlyUsage.totalTreatments,
            limit: plan.maxTreatmentsPerMonth,
            month,
            year
          })
        }
        
        // NOVA VALIDAÇÃO: Máximo 3 tratamentos por dia
        const dayStart = new Date(appointmentStart)
        dayStart.setHours(0, 0, 0, 0)
        
        const dayEnd = new Date(appointmentStart)
        dayEnd.setHours(23, 59, 59, 999)
        
        const appointmentsToday = await prisma.appointment.count({
          where: {
            userId,
            startTime: {
              gte: dayStart,
              lte: dayEnd
            },
            status: { not: 'CANCELED' },
            origin: 'SUBSCRIPTION'
          }
        })
        
        if (appointmentsToday >= 3) {
          return reply.status(400).send({
            success: false,
            error: 'Limite de 3 tratamentos por dia atingido',
            currentUsage: appointmentsToday,
            limit: 3,
            message: 'Para sua segurança e melhor resultado, recomendamos no máximo 3 tratamentos por dia.'
          })
        }
      }
      
      // 8. Validar e aplicar VOUCHER se fornecido
      let finalPrice = service.price
      let appliedDiscount = 0
      let voucherApplied = null
      
      if (origin === 'VOUCHER' && voucherId) {
        const voucher = await prisma.voucher.findUnique({
          where: { id: voucherId }
        })
        
        if (!voucher) {
          return reply.status(404).send({
            success: false,
            error: 'Voucher não encontrado'
          })
        }
        
        if (voucher.isUsed) {
          return reply.status(400).send({
            success: false,
            error: 'Voucher já foi utilizado'
          })
        }
        
        if (voucher.expiresAt && voucher.expiresAt < new Date()) {
          return reply.status(400).send({
            success: false,
            error: 'Voucher expirado'
          })
        }
        
        if (voucher.userId !== userId) {
          return reply.status(400).send({
            success: false,
            error: 'Voucher não pertence a este usuário'
          })
        }
        
        // Aplicar desconto/gratuidade
        switch (voucher.type) {
          case 'FREE_TREATMENT':
            if (voucher.anyService || voucher.serviceId === serviceId) {
              finalPrice = 0
              appliedDiscount = service.price
              voucherApplied = voucher
            } else {
              return reply.status(400).send({
                success: false,
                error: 'Voucher não é válido para este serviço'
              })
            }
            break
            
          case 'DISCOUNT':
            if (voucher.discountPercent) {
              appliedDiscount = service.price * (voucher.discountPercent / 100)
            } else if (voucher.discountAmount) {
              appliedDiscount = Math.min(voucher.discountAmount, service.price)
            }
            finalPrice = Math.max(0, service.price - appliedDiscount)
            voucherApplied = voucher
            break
            
          case 'FREE_MONTH':
            return reply.status(400).send({
              success: false,
              error: 'Voucher de mês grátis não pode ser usado em agendamentos'
            })
        }
        
        logger.info(`💳 Voucher aplicado: ${voucher.description} - Desconto: R$ ${appliedDiscount.toFixed(2)}`)
      }
      
      // 9. Calcula expiração do pagamento (15min para SINGLE sem voucher)
      // TEMPORARIAMENTE COMENTADO - rode: npx prisma generate
      // const paymentExpiresAt = origin === 'SINGLE' 
      //   ? new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
      //   : null
      
      // if (paymentExpiresAt) {
      //   logger.info(`⏰ Agendamento expira em: ${paymentExpiresAt.toLocaleString('pt-BR')}`)
      // }
      
      // 10. Cria o agendamento (aplicando preço final se houver voucher)
      const appointment = await prisma.appointment.create({
        data: {
          userId,
          serviceId,
          startTime: appointmentStart,
          endTime: appointmentEnd,
          status: 'PENDING',
          origin: origin.toUpperCase() as any,
          voucherId,
          paymentMethod,
          // Se tem voucher, usa o preço final calculado, senão usa o paymentAmount fornecido
          paymentAmount: voucherApplied ? finalPrice : paymentAmount,
          // Se voucher torna grátis, marca como PAID. Se é parcial, ainda precisa pagar.
          paymentStatus: paymentStatus ? paymentStatus.toUpperCase() as any : 
            (voucherApplied && finalPrice === 0 ? 'PAID' : 
              (origin === 'SINGLE' ? 'PENDING' : null)),
          // paymentExpiresAt, // Expira em 15min se for SINGLE - TEMPORÁRIO: rode npx prisma generate
          confirmedByAdmin: false,
          notes
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          service: true
        }
      })
      
      // 11. Atualiza uso mensal se for de assinatura
      if (origin === 'SUBSCRIPTION') {
        await updateMonthlyUsage(userId, appointmentStart)
      }
      
      // 12. NÃO marca voucher como usado ainda - só quando COMPLETAR o tratamento!
      // O voucher fica "reservado" pelo voucherId no appointment
      if (voucherApplied) {
        logger.info(`🎫 Voucher ${voucherApplied.id} reservado (será marcado como usado ao completar tratamento)`)
      }
      
      // 13. Notifica admin sobre novo agendamento (exceto se criado pelo admin)
      if (origin !== 'ADMIN_CREATED') {
        await notifyAdminNewAppointmentRequest({
          clientName: appointment.user.name,
          serviceName: appointment.service.name,
          startTime: appointmentStart,
          appointmentId: appointment.id
        })
      }
      
      logger.success(`Agendamento criado: ${appointment.id}`)
      logger.debug(`✅ Dados salvos - Origin: ${appointment.origin}, PaymentStatus: ${appointment.paymentStatus}, PaymentAmount: ${appointment.paymentAmount}`)
      
      let successMessage = 'Agendamento criado com sucesso. Aguardando confirmação do admin.'
      if (voucherApplied) {
        if (finalPrice === 0) {
          successMessage = `Agendamento criado! Voucher aplicado - Tratamento GRÁTIS! 🎁`
        } else {
          successMessage = `Agendamento criado! Desconto de R$ ${appliedDiscount.toFixed(2).replace('.', ',')} aplicado. Valor final: R$ ${finalPrice.toFixed(2).replace('.', ',')}`
        }
      }
      
      return reply.status(201).send({
        success: true,
        data: appointment,
        voucherApplied: voucherApplied ? {
          id: voucherApplied.id,
          description: voucherApplied.description,
          discount: appliedDiscount,
          finalPrice
        } : null,
        message: successMessage
      })
    } catch (error) {
      logger.error('Erro ao criar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar agendamento'
      })
    }
  })

  // PUT - Confirmar agendamento (admin)
  app.put('/appointments/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/confirm`)
    
    try {
      const appointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedByAdmin: true
        },
        include: {
          user: true,
          service: true
        }
      })
      
      // Notifica cliente sobre confirmação
      await notifyAppointmentConfirmed(appointment.userId, {
        serviceName: appointment.service.name,
        startTime: new Date(appointment.startTime)
      })
      
      logger.success(`Agendamento confirmado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: appointment,
        message: 'Agendamento confirmado com sucesso'
      })
    } catch (error) {
      logger.error('Erro ao confirmar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao confirmar agendamento'
      })
    }
  })

  // PUT - Marcar como concluído e pago (admin)
  // IMPORTANTE: Agendamentos com paymentStatus='PENDING' só podem ser concluídos
  // manualmente pelo admin após receber o pagamento na clínica.
  // Processos automáticos de conclusão devem ignorar agendamentos com pagamento pendente.
  app.put('/appointments/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/complete`)
    
    try {
      const { paid } = request.body as { paid?: boolean }
      
      const appointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          confirmedByAdmin: true,
          // Se foi pago, atualiza status de pagamento
          ...(paid && { paymentStatus: 'PAID' })
        },
        include: {
          user: true,
          service: true
        }
      })
      
      // Marcar voucher como usado se tratamento tinha voucher
      if (appointment.voucherId) {
        try {
          await prisma.voucher.update({
            where: { id: appointment.voucherId },
            data: {
              isUsed: true,
              usedAt: new Date()
            }
          })
          logger.success(`✅ Voucher ${appointment.voucherId} marcado como usado`)
        } catch (voucherError) {
          logger.error('Erro ao marcar voucher como usado:', voucherError)
          // Não falhar a conclusão se voucher falhar
        }
      }
      
      // Notifica cliente sobre conclusão
      await notifyAppointmentCompleted(appointment.userId, {
        serviceName: appointment.service.name
      })
      
      logger.success(`Agendamento concluído: ${id}${paid ? ' e pago' : ''}`)
      return reply.status(200).send({
        success: true,
        data: appointment,
        message: paid ? 'Agendamento concluído e pago!' : 'Agendamento concluído'
      })
    } catch (error) {
      logger.error('Erro ao concluir agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao concluir agendamento'
      })
    }
  })

  // PUT - Cancelar agendamento
  app.put('/appointments/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/cancel`)
    
    try {
      const { canceledBy, cancelReason } = request.body as {
        canceledBy: string  // 'client' ou 'admin'
        cancelReason?: string
      }
      
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          service: true,
          user: {
            include: {
              subscription: {
                include: {
                  plan: true
                }
              }
            }
          }
        }
      })
      
      if (!appointment) {
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }
      
      // Busca configurações
      const config = await prisma.systemConfig.findFirst()
      const minHours = config?.minCancellationHours || 8
      
      // Calcula diferença de horas
      const now = new Date()
      const hoursDiff = (appointment.startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      // Se cliente cancelar com menos de X horas, perde o tratamento (só se for de assinatura)
      let lostTreatment = false
      let creditVoucher = null
      
      if (canceledBy === 'client' && hoursDiff < minHours && appointment.origin === 'SUBSCRIPTION') {
        lostTreatment = true
        // Não remove do MonthlyUsage - cliente perdeu o tratamento
      } else if (appointment.origin === 'SUBSCRIPTION') {
        // Remove do uso mensal se cancelou com antecedência adequada
        const month = appointment.startTime.getMonth() + 1
        const year = appointment.startTime.getFullYear()
        
        const monthlyUsage = await prisma.monthlyUsage.findUnique({
          where: {
            userId_month_year: { userId: appointment.userId, month, year }
          }
        })
        
        if (monthlyUsage && monthlyUsage.totalTreatments > 0) {
          await prisma.monthlyUsage.update({
            where: { id: monthlyUsage.id },
            data: {
              totalTreatments: monthlyUsage.totalTreatments - 1
            }
          })
        }
      }
      
      // SISTEMA DE REEMBOLSO/CRÉDITO para tratamentos AVULSOS pagos
      if (canceledBy === 'client' && appointment.origin === 'SINGLE' && appointment.paymentStatus === 'PAID' && appointment.paymentAmount) {
        
        // CASO 1: Cancelamento COM ANTECEDÊNCIA (>= minHours) → REEMBOLSO via Stripe
        if (hoursDiff >= minHours) {
          try {
            logger.info(`💰 Processando reembolso de R$ ${appointment.paymentAmount} para ${appointment.user.name}`)
            
            // Buscar Payment Intent do Stripe via metadata
            const { stripe } = await import('../lib/stripe')
            
            // Buscar customer
            const customer = await prisma.user.findUnique({
              where: { id: appointment.userId },
              select: { stripeCustomerId: true }
            })
            
            if (customer?.stripeCustomerId) {
              // Buscar payment intents deste customer
              const paymentIntents = await stripe.paymentIntents.list({
                customer: customer.stripeCustomerId,
                limit: 100
              })
              
              // Encontrar o payment intent deste agendamento
              const paymentIntent = paymentIntents.data.find(pi => 
                pi.metadata.appointmentId === appointment.id
              )
              
              if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Criar reembolso
                const refund = await stripe.refunds.create({
                  payment_intent: paymentIntent.id,
                  amount: Math.round(appointment.paymentAmount * 100), // Converter para centavos
                  reason: 'requested_by_customer',
                  metadata: {
                    appointmentId: appointment.id,
                    userId: appointment.userId,
                    serviceName: appointment.service.name
                  }
                })
                
                // Atualizar status de pagamento
                await prisma.appointment.update({
                  where: { id: appointment.id },
                  data: { paymentStatus: 'REFUNDED' }
                })
                
                logger.success(`✅ Reembolso processado: ${refund.id} - R$ ${appointment.paymentAmount}`)
                
                // Notificar cliente
                const { createNotification } = await import('../utils/notifications')
                await createNotification({
                  userId: appointment.userId,
                  type: 'PAYMENT_REFUNDED',
                  title: 'Reembolso Processado',
                  message: `Seu pagamento de R$ ${appointment.paymentAmount.toFixed(2).replace('.', ',')} foi reembolsado. O valor será estornado em até 10 dias úteis.`,
                  icon: 'CARD',
                  priority: 'HIGH',
                  actionUrl: '/cliente/pagamentos',
                  actionLabel: 'Ver Pagamentos'
                })
              } else {
                throw new Error('Payment intent não encontrado ou não pago')
              }
            } else {
              throw new Error('Cliente sem stripeCustomerId')
            }
          } catch (refundError: any) {
            logger.error('❌ Erro ao processar reembolso:', refundError.message)
            logger.warning('⚠️ Criando voucher de crédito como fallback...')
            
            // FALLBACK: Se reembolso falhar, cria voucher de crédito
            try {
              const expiresAt = new Date()
              expiresAt.setMonth(expiresAt.getMonth() + 6) // 6 meses para reembolso como crédito
              
              creditVoucher = await prisma.voucher.create({
                data: {
                  userId: appointment.userId,
                  type: 'DISCOUNT',
                  description: `Crédito de reembolso - ${appointment.service.name}`,
                  discountAmount: appointment.paymentAmount,
                  anyService: true,
                  expiresAt,
                  grantedBy: 'system',
                  grantedReason: `Reembolso de cancelamento com antecedência. Falha no processamento Stripe.`
                }
              })
              
              const { notifyVoucherReceived } = await import('../utils/notifications')
              await notifyVoucherReceived(appointment.userId, {
                description: creditVoucher.description,
                type: 'DISCOUNT',
                expiresAt: creditVoucher.expiresAt || undefined
              })
              
              logger.success(`💳 Voucher de crédito criado (fallback): R$ ${appointment.paymentAmount}`)
            } catch (voucherError) {
              logger.error('Erro ao criar voucher de fallback:', voucherError)
            }
          }
        }
        
        // CASO 2: Cancelamento TARDIO (< minHours) → CRÉDITO (política de penalidade)
        else {
          try {
            logger.info(`⚠️ Cancelamento tardio - criando voucher de crédito...`)
            
            const expiresAt = new Date()
            expiresAt.setMonth(expiresAt.getMonth() + 3) // Válido por 3 meses
            
            creditVoucher = await prisma.voucher.create({
              data: {
                userId: appointment.userId,
                type: 'DISCOUNT',
                description: `Crédito de cancelamento tardio - ${appointment.service.name}`,
                discountAmount: appointment.paymentAmount,
                anyService: true,
                expiresAt,
                grantedBy: 'system',
                grantedReason: `Cancelamento com menos de ${minHours}h de antecedência. Valor convertido em crédito.`
              }
            })
            
            const { notifyVoucherReceived } = await import('../utils/notifications')
            await notifyVoucherReceived(appointment.userId, {
              description: creditVoucher.description,
              type: 'DISCOUNT',
              expiresAt: creditVoucher.expiresAt || undefined
            })
            
            logger.success(`💳 Voucher de crédito criado (tardio): R$ ${appointment.paymentAmount}`)
          } catch (voucherError) {
            logger.error('Erro ao criar voucher de crédito:', voucherError)
          }
        }
      }
      
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'CANCELED',
          canceledBy,
          canceledAt: new Date(),
          cancelReason
        },
        include: {
          user: true,
          service: true
        }
      })
      
      // Notifica conforme quem cancelou
      if (canceledBy === 'client') {
        // Notifica admin sobre cancelamento do cliente
        await notifyAdminClientCanceled({
          clientName: updatedAppointment.user.name,
          serviceName: updatedAppointment.service.name,
          startTime: updatedAppointment.startTime,
          cancelReason
        })
      } else {
        // Notifica cliente sobre cancelamento
        await notifyAppointmentCanceled(updatedAppointment.userId, {
          serviceName: updatedAppointment.service.name,
          startTime: updatedAppointment.startTime,
          cancelReason
        })
      }
      
      logger.success(`Agendamento cancelado: ${id}`)
      
      let message = 'Agendamento cancelado com sucesso'
      let refunded = false
      
      if (updatedAppointment.paymentStatus === 'REFUNDED') {
        message = `Agendamento cancelado. Seu reembolso de R$ ${appointment.paymentAmount?.toFixed(2).replace('.', ',')} foi processado e será estornado em até 10 dias úteis.`
        refunded = true
      } else if (lostTreatment) {
        message = `Agendamento cancelado. Como foi cancelado com menos de ${minHours}h de antecedência, o tratamento foi contabilizado.`
      } else if (creditVoucher) {
        const months = hoursDiff >= minHours ? 6 : 3
        message = `Agendamento cancelado. Você recebeu um crédito de R$ ${creditVoucher.discountAmount?.toFixed(2).replace('.', ',')} válido por ${months} meses!`
      }
      
      return reply.status(200).send({
        success: true,
        data: updatedAppointment,
        lostTreatment,
        creditVoucher,
        refunded,
        message
      })
    } catch (error) {
      logger.error('Erro ao cancelar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao cancelar agendamento'
      })
    }
  })

  // PUT - Reagendar
  app.put('/appointments/:id/reschedule', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/appointments/${id}/reschedule`)
    
    try {
      const { newStartTime, startTime, endTime } = request.body as { 
        newStartTime?: string
        startTime?: string 
        endTime?: string 
      }
      
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { service: true }
      })
      
      if (!appointment) {
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }
      
      // Verifica se pode reagendar (tempo mínimo)
      const config = await prisma.systemConfig.findFirst()
      const minHours = config?.minRescheduleHours || 8
      const now = new Date()
      const hoursDiff = (appointment.startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (hoursDiff < minHours) {
        return reply.status(400).send({
          success: false,
          error: `Não é possível reagendar com menos de ${minHours}h de antecedência`
        })
      }
      
      // Calcula novo horário de término - aceita ambos formatos
      const newStartDate = startTime || newStartTime
      if (!newStartDate) {
        return reply.status(400).send({
          success: false,
          error: 'Data de início não fornecida'
        })
      }
      
      const newStart = new Date(newStartDate)
      if (isNaN(newStart.getTime())) {
        return reply.status(400).send({
          success: false,
          error: 'Data de início inválida'
        })
      }
      
      const newEnd = endTime ? new Date(endTime) : new Date(newStart.getTime() + appointment.service.duration * 60000)
      
      // Verifica se já existe agendamento NO MESMO HORÁRIO EXATO (não bloqueia por duração)
      // Permite múltiplas clientes, apenas avisa se já existe outro começando no mesmo horário
      const sameTimeAppointment = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          startTime: newStart,
          status: { not: 'CANCELED' }
        }
      })
      
      if (sameTimeAppointment) {
        logger.warning(`⚠️ Já existe agendamento no horário ${newStart.toISOString()}, mas permitindo (múltiplas macas)`)
      }
      
      /* VALIDAÇÃO DE CONFLITO TOTAL DESABILITADA - Múltiplas macas
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          status: { not: 'CANCELED' },
          OR: [
            { AND: [{ startTime: { lte: newStart } }, { endTime: { gt: newStart } }] },
            { AND: [{ startTime: { lt: newEnd } }, { endTime: { gte: newEnd } }] }
          ]
        }
      })
      
      if (conflictingAppointment) {
        return reply.status(400).send({
          success: false,
          error: 'Já existe um agendamento no novo horário'
        })
      }
      */
      
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          startTime: newStart,
          endTime: newEnd,
          status: 'PENDING',  // Volta para pendente
          confirmedByAdmin: false
        },
        include: {
          user: true,
          service: true
        }
      })
      
      // Notifica cliente sobre reagendamento
      await notifyAppointmentRescheduled(updatedAppointment.userId, {
        serviceName: updatedAppointment.service.name,
        oldStartTime: appointment.startTime,
        newStartTime: newStart
      })
      
      logger.success(`Agendamento reagendado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: updatedAppointment,
        message: 'Agendamento reagendado com sucesso. Aguardando nova confirmação.'
      })
    } catch (error) {
      logger.error('Erro ao reagendar:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao reagendar'
      })
    }
  })

  // DELETE - Ocultar agendamento do histórico (soft delete)
  app.delete('/appointments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/appointments/${id}`)
    
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id }
      })
      
      if (!appointment) {
        logger.error('❌ Agendamento não encontrado:', id)
        return reply.status(404).send({
          success: false,
          error: 'Agendamento não encontrado'
        })
      }
      
      logger.debug('🔍 Detalhes do agendamento:', {
        id: appointment.id,
        status: appointment.status,
        statusType: typeof appointment.status,
        userId: appointment.userId,
        service: appointment.serviceId
      })
      
      // Verifica se está em status válido (case insensitive para ser mais robusto)
      const validStatuses = ['COMPLETED', 'CANCELED', 'NO_SHOW']
      const statusUpper = appointment.status?.toUpperCase()
      const isValidStatus = validStatuses.includes(statusUpper)
      
      logger.debug(`🔍 Status válido para deletar? ${isValidStatus}`, {
        original: appointment.status,
        uppercase: statusUpper,
        validos: validStatuses,
        includes: isValidStatus
      })
      
      // TEMPORÁRIO: Permite deletar QUALQUER status para teste
      // TODO: Voltar a validar apenas COMPLETED/CANCELED após resolver o problema
      const allowAnyStatus = true // Remover após debug
      
      if (!allowAnyStatus && !isValidStatus) {
        logger.warning(`⚠️ Tentativa de ocultar agendamento com status inválido: ${appointment.status}`)
        return reply.status(400).send({
          success: false,
          error: `Apenas tratamentos concluídos ou cancelados podem ser removidos. Status atual: ${appointment.status}`
        })
      }
      
      logger.success(`✅ Status aceito para deletar: ${appointment.status}`)
      
      // Soft delete: apenas marca como oculto
      // TEMPORÁRIO: rode npx prisma generate após parar o backend
      try {
        await prisma.appointment.update({
          where: { id },
          data: {
            // hiddenFromHistory: true  // Descomentar após regenerar Prisma
            notes: appointment.notes // Workaround: atualiza algo para não dar erro
          }
        })
      } catch (updateError) {
        // Ignora erro temporariamente
        logger.warning('⚠️ Campo hiddenFromHistory ainda não disponível. Rode: npx prisma generate')
      }
      
      logger.success(`👻 Agendamento ocultado do histórico: ${id} (soft delete simulado)`)
      return reply.status(200).send({
        success: true,
        message: 'Tratamento removido do histórico (temporário - ative soft delete)'
      })
    } catch (error) {
      logger.error('Erro ao ocultar agendamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover do histórico'
      })
    }
  })
  
  // PUT - Limpar histórico completo (ocultar todos concluídos/cancelados)
  app.put('/appointments/clear-history/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('PUT', `/appointments/clear-history/${userId}`)
    
    try {
      // Oculta todos os agendamentos concluídos/cancelados do usuário
      // TEMPORÁRIO: rode npx prisma generate após parar o backend
      let count = 0
      
      try {
        const result = await prisma.appointment.updateMany({
          where: {
            userId,
            status: {
              in: ['COMPLETED', 'CANCELED', 'NO_SHOW']
            },
            // hiddenFromHistory: false  // Descomentar após regenerar Prisma
          },
          data: {
            // hiddenFromHistory: true  // Descomentar após regenerar Prisma
          }
        })
        count = result.count
      } catch (updateError) {
        // Conta quantos seriam ocultados (workaround temporário)
        const appointments = await prisma.appointment.count({
          where: {
            userId,
            status: {
              in: ['COMPLETED', 'CANCELED', 'NO_SHOW']
            }
          }
        })
        count = appointments
        logger.warning('⚠️ Campo hiddenFromHistory ainda não disponível. Rode: npx prisma generate')
      }
      
      logger.success(`🧹 ${count} agendamento(s) ocultado(s) do histórico do usuário: ${userId} (soft delete simulado)`)
      return reply.status(200).send({
        success: true,
        count: count,
        message: `${count} tratamento(s) removido(s) do histórico (temporário - ative soft delete)`
      })
    } catch (error) {
      logger.error('Erro ao limpar histórico:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao limpar histórico'
      })
    }
  })
}

