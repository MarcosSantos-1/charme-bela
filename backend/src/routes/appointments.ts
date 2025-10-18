import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

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
          })
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
      
      // 8. Cria o agendamento
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
          paymentAmount,
          paymentStatus: paymentStatus ? paymentStatus.toUpperCase() as any : (origin === 'SINGLE' ? 'PENDING' : null),
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
      
      // 9. Atualiza uso mensal se for de assinatura
      if (origin === 'SUBSCRIPTION') {
        await updateMonthlyUsage(userId, appointmentStart)
      }
      
      logger.success(`Agendamento criado: ${appointment.id}`)
      logger.debug(`✅ Dados salvos - Origin: ${appointment.origin}, PaymentStatus: ${appointment.paymentStatus}, PaymentAmount: ${appointment.paymentAmount}`)
      return reply.status(201).send({
        success: true,
        data: appointment,
        message: 'Agendamento criado com sucesso. Aguardando confirmação do admin.'
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
      
      logger.success(`Agendamento cancelado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: updatedAppointment,
        lostTreatment,
        message: lostTreatment 
          ? `Agendamento cancelado. Como foi cancelado com menos de ${minHours}h de antecedência, o tratamento foi contabilizado.`
          : 'Agendamento cancelado com sucesso'
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
}

