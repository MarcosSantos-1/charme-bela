import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    
    if (!key) {
      console.error('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não configurada')
      throw new Error('Stripe publishable key is missing')
    }
    
    stripePromise = loadStripe(key)
  }
  
  return stripePromise
}

// Helper: Redirecionar para checkout do Stripe
export async function redirectToCheckout(sessionId: string) {
  const stripe = await getStripe()
  
  if (!stripe) {
    throw new Error('Stripe não inicializado')
  }
  
  const { error } = await stripe.redirectToCheckout({ sessionId })
  
  if (error) {
    console.error('Erro ao redirecionar para checkout:', error)
    throw error
  }
}

