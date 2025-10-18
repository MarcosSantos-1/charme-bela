'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { Clock, Calendar, Check, X, FileText } from 'lucide-react'

export default function HistoricoPage() {
  const { user } = useAuth()
  const { appointments, loading } = useAppointments(user?.id)

  // Filtrar apenas concluídos ou cancelados
  const pastAppointments = appointments.filter(apt => 
    ['COMPLETED', 'CANCELED'].includes(apt.status)
  )

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Histórico">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Histórico de Tratamentos</h1>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
            </div>
          ) : pastAppointments.length > 0 ? (
            <div className="space-y-3">
              {pastAppointments.map((appointment) => {
                const date = new Date(appointment.startTime)
                const isCompleted = appointment.status === 'COMPLETED'
                
                return (
                  <div
                    key={appointment.id}
                    className="bg-white rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isCompleted ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-6 h-6 text-green-600" />
                          ) : (
                            <X className="w-6 h-6 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {appointment.service?.name || 'Serviço não encontrado'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {appointment.service?.category}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        appointment.origin === 'ADMIN_CREATED'
                          ? 'bg-yellow-100 text-yellow-700'
                          : appointment.origin === 'SUBSCRIPTION'
                          ? 'bg-purple-100 text-purple-700'
                          : appointment.origin === 'VOUCHER'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {appointment.origin === 'ADMIN_CREATED' 
                          ? (appointment.paymentStatus === 'PAID' ? '💰 Pago na Clínica' : '💰 Pagar na Clínica')
                          : appointment.origin === 'SUBSCRIPTION' ? 'Plano'
                          : appointment.origin === 'VOUCHER' ? 'Voucher'
                          : appointment.paymentAmount ? `R$ ${appointment.paymentAmount.toFixed(2)}` : 'Avulso'}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                      <Calendar className="w-3 h-3 mr-1" />
                      {date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      <Clock className="w-3 h-3 ml-3 mr-1" />
                      {`${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`}
                      <span className={`ml-auto ${isCompleted ? 'text-green-600' : 'text-red-600'}`}>
                        {isCompleted ? '✓ Concluído' : '✗ Cancelado'}
                      </span>
                    </div>
                    
                    {appointment.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600">
                          <strong>Obs:</strong> {appointment.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum tratamento realizado ainda</p>
              <p className="text-sm text-gray-500 mt-2">
                Seu histórico aparecerá aqui após completar tratamentos
              </p>
            </div>
          )}
        </div>
      </ClientLayout>
    </ProtectedRoute>
  )
}

