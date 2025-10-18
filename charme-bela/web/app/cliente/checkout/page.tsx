'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { Button } from '@/components/Button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, CreditCard, AlertCircle } from 'lucide-react'
import { useState } from 'react'

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // PONTO 3: Capturar ID do agendamento para cancelar se necessário
  const appointmentId = searchParams.get('appointmentId')

  const handleMockPayment = () => {
    setProcessing(true)
    
    // Simular processamento de pagamento
    setTimeout(() => {
      setSuccess(true)
      
      // Redirecionar para agenda após 2 segundos
      setTimeout(() => {
        router.push('/cliente/agenda')
      }, 2000)
    }, 1500)
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Checkout">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {!success ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-10 h-10 text-yellow-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Página de Pagamento (Mock)</h1>
                <p className="text-gray-600">
                  Esta é uma página temporária para testar o fluxo de pagamento.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  A integração com Stripe será implementada em breve.
                </p>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Modo de Teste:</strong> Clique em "Simular Pagamento" para finalizar o agendamento.
                </p>
              </div>
              
              {/* PONTO 3: Aviso sobre reserva de horário */}
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-orange-900">
                    <strong>Horário Reservado:</strong> Seu horário está temporariamente reservado.
                    <br />
                    <span className="text-xs">Complete o pagamento para confirmar ou cancele para liberar o horário.</span>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleMockPayment}
                disabled={processing}
              >
                {processing ? 'Processando...' : 'Simular Pagamento'}
              </Button>

              <button
                onClick={() => router.back()}
                className="w-full mt-4 text-sm text-gray-600 hover:text-gray-900"
                disabled={processing}
              >
                Cancelar e voltar
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Confirmado!</h2>
              <p className="text-gray-600 mb-1">Seu agendamento foi realizado com sucesso.</p>
              <p className="text-sm text-gray-500">Redirecionando para sua agenda...</p>
            </div>
          )}
        </div>
      </ClientLayout>
    </ProtectedRoute>
  )
}

