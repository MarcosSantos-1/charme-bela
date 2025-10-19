'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { Button } from '@/components/Button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, CreditCard, AlertCircle, X as XIcon, Loader2 } from 'lucide-react'
import { useState, Suspense, useEffect } from 'react'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  
  // PONTO 3: Capturar ID do agendamento para cancelar se necessário
  const appointmentId = searchParams.get('appointmentId')
  
  // Stripe: capturar parâmetros de retorno
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    // Simula checagem do status do pagamento
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Se sucesso, redireciona após 3 segundos
    if (success === 'true' && !loading) {
      const timer = setTimeout(() => {
        router.push('/cliente/plano')
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [success, loading, router])

  // Estado de loading
  if (loading) {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Processando">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
              <Loader2 className="w-16 h-16 text-pink-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verificando pagamento...</h2>
              <p className="text-gray-600">Aguarde um momento</p>
            </div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  // Pagamento bem-sucedido
  if (success === 'true') {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Sucesso">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Assinatura Ativada!</h2>
              <p className="text-gray-600 mb-1">Seu pagamento foi confirmado com sucesso.</p>
              <p className="text-sm text-gray-500 mb-6">Agora você pode agendar seus tratamentos!</p>
              
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-left mb-6">
                <p className="text-sm text-green-900">
                  <strong>✨ Bem-vindo ao Charme & Bela Club!</strong>
                  <br />
                  <span className="text-xs">Redirecionando para seu plano em 3 segundos...</span>
                </p>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/cliente/plano')}
              >
                Ir para Meu Plano
              </Button>
            </div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  // Pagamento cancelado
  if (canceled === 'true') {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Cancelado">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XIcon className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Cancelado</h2>
              <p className="text-gray-600 mb-1">Você cancelou o processo de pagamento.</p>
              <p className="text-sm text-gray-500 mb-6">Não se preocupe, nada foi cobrado.</p>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-left mb-6">
                <p className="text-sm text-blue-900">
                  <strong>💡 Dica:</strong> Você pode tentar novamente quando quiser.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push('/planos')}
                >
                  Tentar Novamente
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/cliente')}
                >
                  Voltar ao Início
                </Button>
              </div>
            </div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  // Estado padrão (não deveria chegar aqui normalmente)
  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Checkout">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Processando...</h2>
            <p className="text-gray-600 mb-6">Aguarde enquanto verificamos seu pagamento.</p>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/planos')}
            >
              Voltar para Planos
            </Button>
          </div>
        </div>
      </ClientLayout>
    </ProtectedRoute>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Checkout">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

