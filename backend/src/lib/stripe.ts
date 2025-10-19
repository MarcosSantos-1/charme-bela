import Stripe from 'stripe'
import { logger } from '../utils/logger'

if (!process.env.STRIPE_SECRET_KEY) {
  logger.error('❌ STRIPE_SECRET_KEY não configurada no .env')
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia', // Versão requerida pelo Stripe 17.7.0
  typescript: true,
})

logger.info('✅ Stripe SDK inicializado')

// Configurações
export const STRIPE_CONFIG = {
  currency: 'brl',
  // Métodos de pagamento para assinaturas (só cartão - recorrência)
  subscriptionPaymentMethods: ['card'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
  // Métodos de pagamento para pagamentos únicos
  // ⚠️ PIX desabilitado até ativar no Dashboard: https://dashboard.stripe.com/settings/payment_methods
  // TODO: Trocar para ['card', 'pix'] após ativar PIX
  singlePaymentMethods: ['card'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
  billingScheme: 'per_unit' as const,
  
  // URLs (serão substituídas por variáveis de ambiente)
  successUrl: process.env.FRONTEND_URL 
    ? `${process.env.FRONTEND_URL}/cliente/pagamentos?success=true` 
    : 'http://localhost:3000/cliente/pagamentos?success=true',
  
  cancelUrl: process.env.FRONTEND_URL 
    ? `${process.env.FRONTEND_URL}/cliente/pagamentos?canceled=true` 
    : 'http://localhost:3000/cliente/pagamentos?canceled=true',
  
  // Customer Portal
  portalReturnUrl: process.env.FRONTEND_URL 
    ? `${process.env.FRONTEND_URL}/cliente/pagamentos` 
    : 'http://localhost:3000/cliente/pagamentos',
}

// Helpers para criar produtos e preços
export const PLAN_TIERS = {
  BRONZE: {
    name: 'Essencial Beauty',
    tier: 'BRONZE',
    description: 'Cuidados faciais e corporais essenciais. Perfeito para quem quer começar a se cuidar com mais frequência.',
    price: 20000, // R$ 200,00 em centavos
  },
  SILVER: {
    name: 'Plus Care',
    tier: 'SILVER',
    description: 'Tratamentos elaborados e tecnológicos. Inclui modelagem corporal e cuidados faciais avançados.',
    price: 30000, // R$ 300,00 em centavos
  },
  GOLD: {
    name: 'Premium Experience',
    tier: 'GOLD',
    description: 'Acesso total e exclusivo aos tratamentos mais avançados com máxima flexibilidade.',
    price: 45000, // R$ 450,00 em centavos
  },
} as const

// Helper: converter centavos para reais
export function centsToReais(cents: number): number {
  return cents / 100
}

// Helper: converter reais para centavos
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100)
}

