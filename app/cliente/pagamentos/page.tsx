'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Button } from '@/components/Button'
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  Download, 
  Check, 
  Clock,
  X,
  Plus,
  Trash2 
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function PagamentosPage() {
  const router = useRouter()
  const [showAddCardModal, setShowAddCardModal] = useState(false)

  const paymentHistory = [
    { id: '1', date: '15/Out/2025', amount: 249.90, status: 'paid', method: 'Cartão ••• 4242' },
    { id: '2', date: '15/Set/2025', amount: 249.90, status: 'paid', method: 'Cartão ••• 4242' },
    { id: '3', date: '15/Ago/2025', amount: 249.90, status: 'paid', method: 'Cartão ••• 4242' },
    { id: '4', date: '15/Jul/2025', amount: 249.90, status: 'paid', method: 'Cartão ••• 4242' },
    { id: '5', date: '15/Jun/2025', amount: 249.90, status: 'paid', method: 'Cartão ••• 4242' },
    { id: '6', date: '15/Mai/2025', amount: 249.90, status: 'failed', method: 'Cartão ••• 1234' },
  ]

  const savedCards = [
    { id: '1', brand: 'Visa', last4: '4242', expiry: '12/26', isDefault: true },
    { id: '2', brand: 'Mastercard', last4: '1234', expiry: '08/25', isDefault: false },
  ]

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Pagamentos</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-20">
          {/* Next Payment */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl text-white p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="w-6 h-6" />
              <h2 className="font-semibold">Próximo Pagamento</h2>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold">R$ 249,90</div>
                <div className="text-green-100 text-sm mt-1">15 de Novembro de 2025</div>
              </div>
              <div className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                Plano Plus Care
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Formas de Pagamento</h3>
              <button
                onClick={() => setShowAddCardModal(true)}
                className="flex items-center space-x-2 text-pink-600 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            <div className="space-y-3">
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 rounded-xl border-2 ${
                    card.isDefault ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded flex items-center justify-center text-white text-xs font-bold">
                        {card.brand === 'Visa' ? 'VISA' : 'MC'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {card.brand} •••• {card.last4}
                        </div>
                        <div className="text-sm text-gray-600">Validade: {card.expiry}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {card.isDefault && (
                        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full font-medium">
                          Padrão
                        </span>
                      )}
                      <button className="p-2 hover:bg-gray-100 rounded-full">
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  {!card.isDefault && (
                    <button className="mt-3 text-sm text-pink-600 font-medium">
                      Definir como padrão
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Histórico de Pagamentos</h3>
            
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payment.status === 'paid'
                        ? 'bg-green-100'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100'
                        : 'bg-red-100'
                    }`}>
                      {payment.status === 'paid' ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : payment.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        R$ {payment.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">{payment.date}</div>
                      <div className="text-xs text-gray-500 mt-1">{payment.method}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      payment.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {payment.status === 'paid' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : 'Falhou'}
                    </span>
                    {payment.status === 'paid' && (
                      <button className="p-2 hover:bg-gray-100 rounded-full">
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Settings */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Preferências de Fatura</h3>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-gray-700">Enviar fatura por e-mail</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 text-pink-600" />
              </label>
              
              <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-gray-700">Lembrete de pagamento</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 text-pink-600" />
              </label>
              
              <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-gray-700">Notificar falhas de pagamento</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 text-pink-600" />
              </label>
            </div>
          </div>
        </div>

        {/* Add Card Modal */}
        {showAddCardModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Adicionar Cartão</h2>
                <button
                  onClick={() => setShowAddCardModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-900" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número do Cartão
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome no Cartão
                  </label>
                  <input
                    type="text"
                    placeholder="Nome como está no cartão"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Validade
                    </label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <label className="flex items-center space-x-2 pt-2">
                  <input type="checkbox" className="w-5 h-5 text-pink-600" />
                  <span className="text-sm text-gray-700">Definir como cartão padrão</span>
                </label>

                <div className="space-y-3 pt-4">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      toast.success('Cartão adicionado com sucesso! 💳', {
                        duration: 3000,
                        style: {
                          background: '#10b981',
                          color: '#fff',
                          fontWeight: '600',
                        }
                      })
                      setShowAddCardModal(false)
                    }}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Adicionar Cartão
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddCardModal(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

