import { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { stripe, STRIPE_CONFIG, PLAN_TIERS, reaisToCents } from '../lib/stripe'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import {
  notifyPaymentSucceeded,
  notifyPaymentFailed,
  notifySubscriptionRenewed,
  notifySubscriptionActivated,
  notifySubscriptionCanceled,
  createNotification
} from '../utils/notifications'

export async function stripeRoutes(app: FastifyInstance) {
  // ============================================
  // POST - Criar Checkout Session (Assinatura)
  // ============================================
  app.post('/stripe/create-checkout-session', async (request, reply) => {
    logger.route('POST', '/stripe/create-checkout-session')
    
    try {
      const { userId, planId } = request.body as {
        userId: string
        planId: string
      }
      
      logger.debug('Criando checkout session:', { userId, planId })
      
      // Busca usuário
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      // Busca plano
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId }
      })
      
      if (!plan) {
        return reply.status(404).send({
          success: false,
          error: 'Plano não encontrado'
        })
      }
      
      // ⚠️ TEMPORÁRIO: Validação desabilitada para testes
      // TODO: Reativar para produção
      /*
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId }
      })
      
      if (existingSubscription && existingSubscription.status === 'ACTIVE') {
        return reply.status(400).send({
          success: false,
          error: 'Usuário já possui uma assinatura ativa'
        })
      }
      */
      
      // Cria ou busca customer no Stripe
      let stripeCustomerId = user.stripeCustomerId
      
      if (!stripeCustomerId) {
        logger.info('🔄 Criando customer no Stripe para:', user.email)
        try {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            phone: user.phone || undefined,
            metadata: {
              userId: user.id,
            },
          })
          
          stripeCustomerId = customer.id
          
          // Atualiza usuário com stripeCustomerId
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId }
          })
          
          logger.info(`✅ Customer Stripe criado: ${stripeCustomerId}`)
        } catch (customerError: any) {
          logger.error('❌ Erro ao criar customer Stripe:', customerError.message)
          throw new Error(`Falha ao criar customer no Stripe: ${customerError.message}`)
        }
      } else {
        logger.info(`✅ Customer Stripe já existe: ${stripeCustomerId}`)
      }
      
      // Busca ou cria o Price ID do Stripe
      let stripePriceId = plan.stripePriceId
      
      if (!stripePriceId) {
        logger.info(`🔄 Criando produto/preço no Stripe para plano: ${plan.name}`)
        try {
          // Cria produto no Stripe (se não existir)
          const product = await stripe.products.create({
            name: `Charme & Bela Club - ${plan.name}`,
            description: plan.description,
            statement_descriptor: 'CHARME BELA', // Aparece no extrato do cartão
            metadata: {
              planId: plan.id,
              tier: plan.tier,
              maxTreatments: plan.maxTreatmentsPerMonth.toString(),
            },
          })
          
          logger.info(`✅ Produto Stripe criado: ${product.id}`)
          
          // Cria preço recorrente
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: reaisToCents(plan.price), // Converte para centavos
            currency: STRIPE_CONFIG.currency,
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
            nickname: plan.name, // Nome amigável
            metadata: {
              planId: plan.id,
              tier: plan.tier,
            },
          })
          
          stripePriceId = price.id
          
          // Atualiza plano com stripePriceId
          await prisma.subscriptionPlan.update({
            where: { id: planId },
            data: { stripePriceId }
          })
          
          logger.info(`✅ Price Stripe criado: ${stripePriceId}`)
        } catch (priceError: any) {
          logger.error('❌ Erro ao criar produto/preço Stripe:', priceError.message)
          throw new Error(`Falha ao criar produto/preço no Stripe: ${priceError.message}`)
        }
      } else {
        logger.info(`✅ Price Stripe já existe: ${stripePriceId}`)
      }
      
      // Cria Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: STRIPE_CONFIG.subscriptionPaymentMethods, // Só cartão (assinatura recorrente)
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: STRIPE_CONFIG.successUrl,
        cancel_url: STRIPE_CONFIG.cancelUrl,
        
        // Configurações de idioma e localização
        locale: 'pt-BR', // Português do Brasil
        
        // Customização visual
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true, // Coleta telefone
        },
        
        // Informações para a fatura
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        
        // Mensagens customizadas
        custom_text: {
          submit: {
            message: 'Seus dados estão seguros e criptografados. Ao confirmar, você concorda com nossa política de cancelamento.',
          },
        },
        
        // Permite cupons de desconto
        allow_promotion_codes: true,
        
        // Metadata
        metadata: {
          userId: user.id,
          planId: plan.id,
          planName: plan.name,
          userName: user.name,
        },
        
        // Metadata da assinatura
        subscription_data: {
          description: `Charme & Bela Club - ${plan.name}`,
          metadata: {
            userId: user.id,
            planId: plan.id,
            userName: user.name,
            tier: plan.tier,
          },
        },
        
        // INVOICE_CREATION DESABILITADO - Pode causar erro 500 se não configurado no Stripe
        // invoice_creation: {
        //   enabled: true,
        //   invoice_data: {
        //     description: `Assinatura mensal - ${plan.name}`,
        //     footer: 'Obrigado por escolher Charme & Bela Club! 💖',
        //     metadata: {
        //       userName: user.name,
        //       planName: plan.name,
        //     },
        //   },
        // },
      })
      
      logger.success(`✅ Checkout session criada: ${session.id}`)
      
      return reply.status(200).send({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url,
        }
      })
    } catch (error: any) {
      logger.error('Erro ao criar checkout session:', error)
      logger.error('Error stack:', error.stack)
      logger.error('Error details:', JSON.stringify(error, null, 2))
      
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar sessão de pagamento',
        details: error.message,
        stripeError: error.type || 'unknown',
        code: error.code || 'unknown'
      })
    }
  })
  
  // ============================================
  // POST - Criar Checkout Session (Pagamento Único/Avulso)
  // ============================================
  app.post('/stripe/create-payment-session', async (request, reply) => {
    logger.route('POST', '/stripe/create-payment-session')
    
    try {
      const { userId, serviceId, appointmentId, customAmount, customDescription } = request.body as {
        userId: string
        serviceId: string
        appointmentId?: string
        customAmount?: number  // Valor customizado (com desconto aplicado)
        customDescription?: string  // Descrição customizada (ex: "com 50% de desconto")
      }
      
      logger.debug('Criando payment session:', { userId, serviceId, appointmentId, customAmount, customDescription })
      
      // Busca usuário
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      // Busca serviço
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      })
      
      if (!service) {
        return reply.status(404).send({
          success: false,
          error: 'Serviço não encontrado'
        })
      }
      
      // Cria ou busca customer no Stripe
      let stripeCustomerId = user.stripeCustomerId
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          phone: user.phone || undefined,
          metadata: {
            userId: user.id,
          },
        })
        
        stripeCustomerId = customer.id
        
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId }
        })
        
        logger.info(`✅ Customer Stripe criado: ${stripeCustomerId}`)
      }
      
      // Usar preço customizado se fornecido (voucher com desconto), senão usar preço do serviço
      const finalAmount = customAmount !== undefined ? customAmount : service.price
      
      // Descrição customizada para mostrar desconto
      let productDescription = service.description
      if (customAmount !== undefined && customAmount < service.price) {
        const discount = service.price - customAmount
        productDescription = `${service.description} (Desconto aplicado: R$ ${discount.toFixed(2)})`
      }
      if (customDescription) {
        productDescription += ` - ${customDescription}`
      }
      
      logger.info(`💰 Criando sessão: Preço original R$ ${service.price} → Preço final R$ ${finalAmount}`)
      
      // Cria Checkout Session para pagamento único
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: STRIPE_CONFIG.singlePaymentMethods, // Só cartão
        line_items: [
          {
            price_data: {
              currency: STRIPE_CONFIG.currency,
              unit_amount: reaisToCents(finalAmount), // Usa o valor final com desconto
              product_data: {
                name: customAmount !== undefined && customAmount < service.price 
                  ? `${service.name} - Charme & Bela (com desconto)` 
                  : `${service.name} - Charme & Bela`,
                description: productDescription,
                metadata: {
                  serviceId: service.id,
                  category: service.category,
                  originalPrice: service.price.toString(),
                  finalPrice: finalAmount.toString(),
                  hasDiscount: (customAmount !== undefined && customAmount < service.price).toString()
                },
              },
            },
            quantity: 1,
          },
        ],
        mode: 'payment', // Pagamento ÚNICO (não recorrente)
        success_url: `${STRIPE_CONFIG.successUrl}&appointmentId=${appointmentId || ''}`,
        cancel_url: STRIPE_CONFIG.cancelUrl,
        
        // Português
        locale: 'pt-BR',
        
        // Salva cartão para próximas compras + recibo
        payment_intent_data: {
          setup_future_usage: 'on_session', // Salva cartão
          statement_descriptor: 'CHARME BELA',
          description: `Tratamento: ${service.name}`,
          receipt_email: user.email, // Envia recibo por email
          metadata: {
            userId: user.id,
            serviceId: service.id,
            serviceName: service.name,
            appointmentId: appointmentId || '',
          },
        },
        
        // Customização
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true,
        },
        
        custom_text: {
          submit: {
            message: 'Pagamento seguro. Após confirmado, você receberá um email de confirmação.',
          },
        },
        
        // Metadata
        metadata: {
          userId: user.id,
          serviceId: service.id,
          serviceName: service.name,
          appointmentId: appointmentId || '',
          type: 'single_treatment', // Identifica como avulso
        },
      })
      
      logger.success(`✅ Payment session criada: ${session.id}`)
      
      return reply.status(200).send({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url,
        }
      })
    } catch (error: any) {
      logger.error('Erro ao criar payment session:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar sessão de pagamento',
        details: error.message
      })
    }
  })
  
  // ============================================
  // POST - Criar Customer Portal Session
  // ============================================
  app.post('/stripe/create-portal-session', async (request, reply) => {
    logger.route('POST', '/stripe/create-portal-session')
    
    try {
      const { userId } = request.body as { userId: string }
      
      logger.debug('🔍 Criando portal para userId:', userId)
      
      // Busca usuário
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user) {
        logger.error('❌ Usuário não encontrado:', userId)
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      if (!user.stripeCustomerId) {
        logger.error('❌ Usuário não possui stripeCustomerId:', userId)
        return reply.status(404).send({
          success: false,
          error: 'Usuário não possui customer no Stripe. Assine um plano primeiro.'
        })
      }
      
      logger.debug('🔍 stripeCustomerId:', user.stripeCustomerId)
      logger.debug('🔍 portalReturnUrl:', STRIPE_CONFIG.portalReturnUrl)
      
      // Cria portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: STRIPE_CONFIG.portalReturnUrl,
      })
      
      logger.success(`✅ Portal session criada para: ${userId}`)
      logger.debug('🔗 Portal URL:', session.url)
      
      return reply.status(200).send({
        success: true,
        data: {
          url: session.url,
        }
      })
    } catch (error: any) {
      logger.error('❌ Erro ao criar portal session:', error)
      logger.error('❌ Error message:', error.message)
      logger.error('❌ Error type:', error.type)
      logger.error('❌ Error code:', error.code)
      
      // Mensagem mais específica se for erro do Stripe
      let errorMessage = 'Erro ao criar portal do cliente'
      
      if (error.type === 'StripeInvalidRequestError') {
        if (error.message.includes('billing portal')) {
          errorMessage = 'O Portal de Pagamentos precisa ser ativado no Stripe Dashboard primeiro. Acesse: https://dashboard.stripe.com/test/settings/billing/portal'
        } else if (error.message.includes('customer')) {
          errorMessage = 'Customer inválido no Stripe'
        }
      }
      
      return reply.status(500).send({
        success: false,
        error: errorMessage,
        details: error.message
      })
    }
  })
  
  // ============================================
  // GET - Buscar informações de pagamento
  // ============================================
  app.get('/stripe/payment-methods/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('GET', `/stripe/payment-methods/${userId}`)
    
    try {
      // Busca usuário
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user || !user.stripeCustomerId) {
        return reply.status(404).send({
          success: false,
          error: 'Usuário não possui customer no Stripe',
          data: []
        })
      }
      
      // Busca métodos de pagamento
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
        limit: 20, // Limita a 20 cartões
      })
      
      // Busca customer para pegar default payment method
      const customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer
      
      const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method
      
      // Formata e remove duplicatas
      const formattedMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId,
        created: pm.created,
      }))
      
      // Remove duplicatas baseado em brand + last4 + validade
      // Mantém apenas o mais recente de cada cartão
      const uniqueCards = new Map<string, typeof formattedMethods[0]>()
      
      formattedMethods.forEach(card => {
        const key = `${card.brand}-${card.last4}-${card.expMonth}-${card.expYear}`
        const existing = uniqueCards.get(key)
        
        // Se não existe ou se este é mais recente, usa este
        if (!existing || card.created > existing.created) {
          uniqueCards.set(key, card)
        }
      })
      
      // Converte de volta para array e remove o campo 'created'
      const finalMethods = Array.from(uniqueCards.values())
        .map(({ created, ...card }) => card)
        .sort((a, b) => {
          // Default primeiro
          if (a.isDefault && !b.isDefault) return -1
          if (!a.isDefault && b.isDefault) return 1
          return 0
        })
      
      return reply.status(200).send({
        success: true,
        data: finalMethods
      })
    } catch (error: any) {
      logger.error('Erro ao buscar métodos de pagamento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar métodos de pagamento',
        details: error.message
      })
    }
  })
  
  // ============================================
  // GET - Calcular receita do mês atual (ADMIN)
  // ============================================
  app.get('/stripe/monthly-revenue', async (request, reply) => {
    logger.route('GET', '/stripe/monthly-revenue')
    
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      
      // Timestamp Unix para o Stripe
      const startTimestamp = Math.floor(startOfMonth.getTime() / 1000)
      const endTimestamp = Math.floor(endOfMonth.getTime() / 1000)
      
      logger.debug(`Calculando receita de ${startOfMonth.toLocaleDateString('pt-BR')} a ${endOfMonth.toLocaleDateString('pt-BR')}`)
      
      // Buscar todos os clientes
      const users = await prisma.user.findMany({
        where: { 
          role: 'CLIENT',
          stripeCustomerId: { not: null }
        },
        select: { stripeCustomerId: true }
      })
      
      let totalRevenue = 0
      let subscriptionRevenue = 0
      let singlePaymentRevenue = 0
      let paymentCount = 0
      
      // Para cada cliente, buscar pagamentos do mês
      for (const user of users) {
        if (!user.stripeCustomerId) continue
        
        try {
          // Buscar invoices (assinaturas) pagas do mês
          const invoices = await stripe.invoices.list({
            customer: user.stripeCustomerId,
            status: 'paid',
            created: {
              gte: startTimestamp,
              lte: endTimestamp
            },
            limit: 100
          })
          
          for (const invoice of invoices.data) {
            subscriptionRevenue += invoice.amount_paid / 100
            paymentCount++
          }
          
          // Buscar payment intents (avulsos) bem-sucedidos do mês
          const paymentIntents = await stripe.paymentIntents.list({
            customer: user.stripeCustomerId,
            created: {
              gte: startTimestamp,
              lte: endTimestamp
            },
            limit: 100
          })
          
          for (const pi of paymentIntents.data) {
            if (pi.status === 'succeeded') {
              singlePaymentRevenue += pi.amount / 100
              paymentCount++
            }
          }
        } catch (customerError: any) {
          logger.warning(`Erro ao buscar pagamentos do cliente ${user.stripeCustomerId}:`, customerError.message)
          // Continua para próximo cliente
        }
      }
      
      totalRevenue = subscriptionRevenue + singlePaymentRevenue
      
      logger.success(`💰 Receita do mês: R$ ${totalRevenue.toFixed(2)} (${paymentCount} pagamentos)`)
      
      return reply.status(200).send({
        success: true,
        data: {
          totalRevenue,
          subscriptionRevenue,
          singlePaymentRevenue,
          paymentCount,
          month: now.getMonth() + 1,
          year: now.getFullYear()
        }
      })
    } catch (error: any) {
      logger.error('Erro ao calcular receita mensal:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao calcular receita mensal',
        details: error.message
      })
    }
  })
  
  // ============================================
  // GET - Buscar histórico de pagamentos
  // ============================================
  app.get('/stripe/payment-history/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    logger.route('GET', `/stripe/payment-history/${userId}`)
    
    try {
      // Busca usuário
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user || !user.stripeCustomerId) {
        return reply.status(404).send({
          success: false,
          error: 'Usuário não possui customer no Stripe',
          data: []
        })
      }
      
      // Busca invoices (faturas recorrentes)
      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 50,
      })
      
      // Busca payment intents (pagamentos únicos) com charges expandidos
      const paymentIntents = await stripe.paymentIntents.list({
        customer: user.stripeCustomerId,
        limit: 50,
        expand: ['data.charges'],
      })
      
      // Combina invoices e payment intents
      const allPayments = [
        // Invoices (assinaturas)
        ...invoices.data.map(invoice => ({
          id: invoice.id,
          type: 'subscription' as const,
          amount: invoice.amount_paid / 100,
          totalAmount: invoice.total / 100,
          currency: invoice.currency,
          status: invoice.status, // paid, open, void, uncollectible
          description: invoice.description || 'Assinatura mensal',
          paidAt: invoice.status_transitions.paid_at 
            ? new Date(invoice.status_transitions.paid_at * 1000) 
            : null,
          createdAt: new Date(invoice.created * 1000),
          invoicePdf: invoice.invoice_pdf,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
        })),
        
        // Payment Intents (avulsos)
        ...paymentIntents.data.map(pi => {
          // Charges são expandidos via 'expand' parameter
          const charges = (pi as any).charges?.data || []
          const latestCharge = charges[0]
          
          // Para pagamentos avulsos bem-sucedidos, gera URL de recibo
          let receiptUrl = latestCharge?.receipt_url || null
          
          // Se não tem receipt_url mas tem charge, tenta buscar
          if (!receiptUrl && latestCharge?.id && pi.status === 'succeeded') {
            receiptUrl = `https://dashboard.stripe.com/payments/${latestCharge.id}`
          }
          
          return {
            id: pi.id,
            type: 'single' as const,
            amount: pi.amount / 100,
            totalAmount: pi.amount / 100,
            currency: pi.currency,
            status: pi.status, // succeeded, canceled, processing, requires_payment_method
            description: pi.description || 'Tratamento avulso',
            paidAt: latestCharge?.created 
              ? new Date(latestCharge.created * 1000) 
              : null,
            createdAt: new Date(pi.created * 1000),
            invoicePdf: null, // Pagamentos avulsos não geram PDF via API
            hostedInvoiceUrl: null,
            receiptUrl: receiptUrl,
          }
        }),
      ]
      
      // Ordena por data (mais recente primeiro)
      allPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      
      return reply.status(200).send({
        success: true,
        data: allPayments
      })
    } catch (error: any) {
      logger.error('Erro ao buscar histórico de pagamentos:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar histórico de pagamentos',
        details: error.message
      })
    }
  })
  
  // ============================================
  // POST - Webhook do Stripe
  // ============================================
  app.post('/stripe/webhook', async (request, reply) => {
    logger.route('POST', '/stripe/webhook')
    
    const sig = request.headers['stripe-signature'] as string
    
    if (!sig) {
      return reply.status(400).send({ error: 'Missing stripe-signature header' })
    }
    
    let event: Stripe.Event
    
    try {
      // Em desenvolvimento, o Stripe CLI envia o body já parseado
      // então vamos usar o body diretamente sem validação de assinatura
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        event = request.body as Stripe.Event
      } else {
        // Em produção, valida a assinatura
        // Reconstrói o body como string para validação
        const rawBody = JSON.stringify(request.body)
        
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        )
      }
    } catch (err: any) {
      logger.error(`Webhook signature verification failed: ${err.message}`)
      // Em desenvolvimento, aceita sem validação
      logger.warning('⚠️ Aceitando webhook sem validação (desenvolvimento)')
      event = request.body as Stripe.Event
    }
    
    logger.info(`🎣 Webhook recebido: ${event.type}`)
    
    try {
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          // Verifica se é assinatura ou pagamento único
          if (session.mode === 'subscription') {
            await handleCheckoutCompleted(session)
          } else if (session.mode === 'payment') {
            await handlePaymentCompleted(session)
          }
          break
        }
        
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          await handleInvoicePaymentSucceeded(invoice)
          break
        }
        
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          await handleInvoicePaymentFailed(invoice)
          break
        }
        
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionUpdated(subscription)
          break
        }
        
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionDeleted(subscription)
          break
        }
        
        default:
          logger.warning(`Unhandled event type: ${event.type}`)
      }
      
      return reply.status(200).send({ received: true })
    } catch (error: any) {
      logger.error('Erro ao processar webhook:', error)
      return reply.status(500).send({ error: error.message })
    }
  })
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.info('💳 Checkout completado:', session.id)
  
  const userId = session.metadata?.userId
  const planId = session.metadata?.planId
  
  if (!userId || !planId) {
    logger.error('Missing metadata in checkout session')
    return
  }
  
  // Busca subscription do Stripe
  const stripeSubscriptionId = session.subscription as string
  
  if (!stripeSubscriptionId) {
    logger.error('No subscription ID in checkout session')
    return
  }
  
  // Busca configurações para pegar fidelidade mínima
  const config = await prisma.systemConfig.findFirst()
  const commitmentMonths = config?.minimumCommitmentMonths || 3
  
  // Calcula data de compromisso mínimo
  const minimumCommitmentEnd = new Date()
  minimumCommitmentEnd.setMonth(minimumCommitmentEnd.getMonth() + commitmentMonths)
  
  // Busca plano
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId }
  })
  
  // Cria ou atualiza assinatura no banco
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      planId,
      stripeSubscriptionId,
      status: 'ACTIVE',
      startDate: new Date(),
      minimumCommitmentEnd,
      endDate: null,
      canceledAt: null,
      cancelReason: null
    },
    create: {
      userId,
      planId,
      stripeSubscriptionId,
      status: 'ACTIVE',
      startDate: new Date(),
      minimumCommitmentEnd
    }
  })
  
  logger.success(`✅ Assinatura criada/atualizada para usuário: ${userId}`)
  
  // Notifica ativação da assinatura
  if (plan) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    
    if (user) {
      // Notifica cliente
      await notifySubscriptionActivated(userId, {
        planName: plan.name,
        maxTreatments: plan.maxTreatmentsPerMonth
      })
      
      // Notifica admin sobre nova assinatura
      await createNotification({
        userId: null, // Admin
        type: 'SUBSCRIPTION_ACTIVATED',
        title: 'Nova Assinatura Ativada! 🎉',
        message: `${user.name} assinou o plano ${plan.name} (${plan.tier})`,
        icon: 'STAR',
        priority: 'HIGH',
        actionUrl: '/admin/atividades',
        actionLabel: 'Ver Atividades',
        metadata: { userId: user.id, planId: plan.id, planName: plan.name }
      })
      
      logger.success(`✅ Notificações de ativação enviadas (cliente + admin)`)
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info('💰 Pagamento de invoice bem-sucedido:', invoice.id)
  
  const customerId = invoice.customer as string
  
  // Busca usuário pelo stripeCustomerId
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    include: { subscription: { include: { plan: true } } }
  })
  
  if (user && user.subscription) {
    // Calcula próxima data de cobrança (próximo mês)
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    
    const amount = invoice.amount_paid / 100
    
    // Notifica cliente sobre pagamento bem-sucedido
    await notifyPaymentSucceeded(user.id, {
      amount,
      description: `Assinatura ${user.subscription.plan.name}`,
      nextBillingDate
    })
    
    // Notifica ADMIN sobre pagamento recebido
    await createNotification({
      userId: null, // Admin
      type: 'PAYMENT_SUCCEEDED',
      title: 'Pagamento Recebido! 💰',
      message: `${user.name} - R$ ${amount.toFixed(2).replace('.', ',')} (${user.subscription.plan.name})`,
      icon: 'CARD',
      priority: 'NORMAL',
      actionUrl: '/admin/atividades',
      actionLabel: 'Ver Atividades',
      metadata: { 
        userId: user.id, 
        amount, 
        planName: user.subscription.plan.name,
        invoiceId: invoice.id
      }
    })
    
    // Se não for o primeiro pagamento, também notifica renovação
    if (invoice.billing_reason === 'subscription_cycle') {
      await notifySubscriptionRenewed(user.id, {
        planName: user.subscription.plan.name,
        amount,
        nextBillingDate
      })
    }
    
    logger.success(`✅ Notificações de pagamento enviadas (cliente + admin)`)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.warning('❌ Pagamento de invoice falhou:', invoice.id)
  
  const customerId = invoice.customer as string
  
  // Busca usuário pelo stripeCustomerId
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    include: { subscription: { include: { plan: true } } }
  })
  
  if (user) {
    // Atualiza status da assinatura para PAST_DUE
    await prisma.subscription.updateMany({
      where: { userId: user.id },
      data: { status: 'PAST_DUE' }
    })
    
    logger.warning(`⚠️ Assinatura do usuário ${user.id} marcada como PAST_DUE`)
    
    // Notifica falha no pagamento
    if (user.subscription) {
      await notifyPaymentFailed(user.id, {
        amount: invoice.amount_due / 100,
        description: `Assinatura ${user.subscription.plan.name}`,
        reason: 'Cartão recusado ou sem saldo'
      })
      
      logger.success(`✅ Notificação de falha enviada para ${user.name}`)
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info('🔄 Assinatura atualizada:', subscription.id)
  
  // Busca assinatura no banco
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  })
  
  if (dbSubscription) {
    // Mapeia status do Stripe para nosso enum
    let status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'PAUSED' = 'ACTIVE'
    
    if (subscription.status === 'canceled') status = 'CANCELED'
    else if (subscription.status === 'past_due') status = 'PAST_DUE'
    else if (subscription.status === 'paused') status = 'PAUSED'
    
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: { status }
    })
    
    logger.success(`✅ Status da assinatura atualizado para: ${status}`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info('🗑️ Assinatura deletada:', subscription.id)
  
  // Busca assinatura no banco
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: { plan: true }
  })
  
  if (dbSubscription) {
    const endDate = new Date()
    
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        endDate
      }
    })
    
    logger.success(`✅ Assinatura cancelada no banco de dados`)
    
    // Notifica cancelamento da assinatura
    await notifySubscriptionCanceled(dbSubscription.userId, {
      planName: dbSubscription.plan.name,
      endDate
    })
    
    logger.success(`✅ Notificação de cancelamento enviada`)
  }
}

async function handlePaymentCompleted(session: Stripe.Checkout.Session) {
  logger.info('💳 Pagamento único completado:', session.id)
  
  const appointmentId = session.metadata?.appointmentId
  const userId = session.metadata?.userId
  const serviceName = session.metadata?.serviceName
  
  if (appointmentId) {
    // Atualiza status do agendamento para PAID e LIMPA EXPIRAÇÃO
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'credit_card',
        paymentAmount: (session.amount_total || 0) / 100,
        // paymentExpiresAt: null, // Remove expiração (pagamento confirmado!) - temporariamente comentado até regenerar Prisma
      }
    })
    
    logger.success(`✅ Agendamento ${appointmentId} pago e confirmado`)
    
    // Notifica pagamento bem-sucedido
    if (userId) {
      const amount = (session.amount_total || 0) / 100
      const user = await prisma.user.findUnique({ where: { id: userId } })
      
      // Notifica cliente
      await notifyPaymentSucceeded(userId, {
        amount,
        description: `Tratamento: ${serviceName || 'Avulso'}`
      })
      
      // Notifica ADMIN sobre pagamento avulso recebido
      if (user) {
        await createNotification({
          userId: null, // Admin
          type: 'PAYMENT_SUCCEEDED',
          title: 'Pagamento Avulso Recebido! 💵',
          message: `${user.name} - R$ ${amount.toFixed(2).replace('.', ',')} (${serviceName || 'Tratamento Avulso'})`,
          icon: 'CARD',
          priority: 'NORMAL',
          actionUrl: '/admin/atividades',
          actionLabel: 'Ver Atividades',
          metadata: { 
            userId: user.id, 
            amount, 
            serviceName,
            appointmentId,
            sessionId: session.id
          }
        })
      }
      
      logger.success(`✅ Notificações de pagamento enviadas (cliente + admin)`)
    }
  }
}

