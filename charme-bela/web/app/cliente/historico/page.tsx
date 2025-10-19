'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { Clock, Calendar, Check, X, FileText, CreditCard, Filter, Trash2, AlertTriangle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'

export default function HistoricoPage() {
  const { user } = useAuth()
  const { appointments, loading, refetch } = useAppointments(user?.id)
  
  // Estados de filtro
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'canceled'>('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set()) // IDs ocultados localmente
  
  // Carrega IDs ocultados do localStorage ao montar
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`hiddenHistory_${user.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as string[]
          setHiddenIds(new Set(parsed))
          console.log('📦 IDs ocultados carregados do localStorage:', parsed.length)
        } catch (e) {
          console.error('Erro ao carregar histórico ocultado:', e)
        }
      }
    }
  }, [user])
  
  // Salva IDs ocultados no localStorage sempre que mudar
  useEffect(() => {
    if (user && hiddenIds.size > 0) {
      const idsArray = Array.from(hiddenIds)
      localStorage.setItem(`hiddenHistory_${user.id}`, JSON.stringify(idsArray))
      console.log('💾 IDs ocultados salvos no localStorage:', idsArray.length)
    }
  }, [hiddenIds, user])

  // Filtrar apenas concluídos ou cancelados (incluindo NO_SHOW)
  let pastAppointments = appointments.filter(apt => 
    ['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(apt.status) &&
    !hiddenIds.has(apt.id) // Filtra IDs ocultados localmente
  )
  
  console.log('📊 Histórico filtrado:', {
    total: appointments.length,
    historico: pastAppointments.length,
    ocultados: hiddenIds.size,
    statuses: pastAppointments.map(apt => ({ id: apt.id, status: apt.status }))
  })
  
  // Aplicar filtros
  if (statusFilter !== 'all') {
    pastAppointments = pastAppointments.filter(apt => 
      statusFilter === 'completed' ? apt.status === 'COMPLETED' : apt.status === 'CANCELED'
    )
  }
  
  if (startDateFilter) {
    const startDate = new Date(startDateFilter)
    startDate.setHours(0, 0, 0, 0)
    pastAppointments = pastAppointments.filter(apt => 
      new Date(apt.startTime) >= startDate
    )
  }
  
  if (endDateFilter) {
    const endDate = new Date(endDateFilter)
    endDate.setHours(23, 59, 59, 999)
    pastAppointments = pastAppointments.filter(apt => 
      new Date(apt.startTime) <= endDate
    )
  }
  
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    
    // Debug: mostra info do agendamento
    const appointment = appointments.find(apt => apt.id === id)
    console.log('🗑️ Tentando deletar:', {
      id,
      status: appointment?.status,
      service: appointment?.service?.name
    })
    
    try {
      await api.deleteAppointment(id)
      
      // Adiciona ao Set de IDs ocultados (state local)
      setHiddenIds(prev => new Set(prev).add(id))
      
      toast.success('Tratamento removido do histórico')
      setConfirmDelete(null)
      
      console.log('✅ Item ocultado localmente:', id)
    } catch (error: any) {
      console.error('Erro ao deletar:', error)
      const errorMessage = error?.message || 'Erro ao remover tratamento'
      toast.error(errorMessage, { duration: 5000 })
    } finally {
      setDeletingId(null)
    }
  }
  
  const clearFilters = () => {
    setStatusFilter('all')
    setStartDateFilter('')
    setEndDateFilter('')
  }
  
  const handleClearAll = async () => {
    if (!user) return
    
    setClearingAll(true)
    try {
      const result = await api.clearHistory(user.id)
      
      // Adiciona todos os IDs do histórico ao Set de ocultados
      const allHistoryIds = new Set(pastAppointments.map(apt => apt.id))
      setHiddenIds(allHistoryIds)
      
      toast.success(`${result.count || pastAppointments.length} tratamento(s) removido(s) do histórico`)
      setConfirmClearAll(false)
      
      console.log('✅ Histórico limpo localmente:', allHistoryIds.size, 'itens')
    } catch (error: any) {
      console.error('Erro ao limpar histórico:', error)
      toast.error(error?.message || 'Erro ao limpar histórico')
    } finally {
      setClearingAll(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Histórico">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Header com Ações */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Histórico de Tratamentos</h1>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border-2 rounded-xl transition-all ${
                  showFilters || statusFilter !== 'all' || startDateFilter || endDateFilter
                    ? 'bg-pink-50 border-pink-200 text-pink-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Filtros</span>
              </button>
              
              {pastAppointments.length > 0 && (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-700 rounded-xl transition-all"
                  title="Limpar todo o histórico"
                >
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Limpar Tudo</span>
                </button>
              )}
              
              <Link href="/cliente/pagamentos">
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-50 hover:bg-green-100 border-2 border-green-200 text-green-700 rounded-xl transition-all">
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Pagamentos</span>
                </button>
              </Link>
            </div>
          </div>
          
          {/* Modal de Confirmação - Limpar Tudo */}
          {confirmClearAll && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Limpar Todo o Histórico?</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Todos os tratamentos concluídos e cancelados serão removidos da sua visualização. 
                    Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmClearAll(false)}
                      disabled={clearingAll}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleClearAll}
                      disabled={clearingAll}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                      {clearingAll ? 'Limpando...' : 'Sim, limpar tudo'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Painel de Filtros */}
          {showFilters && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Filtrar Histórico</h3>
                {(statusFilter !== 'all' || startDateFilter || endDateFilter) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
              
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      statusFilter === 'all'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      statusFilter === 'completed'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    ✓ Concluídos
                  </button>
                  <button
                    onClick={() => setStatusFilter('canceled')}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      statusFilter === 'canceled'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    ✗ Cancelados
                  </button>
                </div>
              </div>
              
              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 font-medium [&::-webkit-calendar-picker-indicator]:opacity-70"
                    style={{
                      colorScheme: 'light'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 font-medium [&::-webkit-calendar-picker-indicator]:opacity-70"
                    style={{
                      colorScheme: 'light'
                    }}
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                📊 Mostrando <strong>{pastAppointments.length}</strong> tratamento(s)
              </div>
            </div>
          )}
          
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
                    className="bg-white rounded-xl p-4 border border-gray-200 relative group"
                  >
                    {/* Botão Deletar */}
                    <button
                      onClick={() => setConfirmDelete(appointment.id)}
                      className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Remover do histórico"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {/* Modal de confirmação */}
                    {confirmDelete === appointment.id && (
                      <div className="absolute inset-0 bg-white rounded-xl border-2 border-red-300 p-4 flex flex-col items-center justify-center z-10">
                        <AlertTriangle className="w-12 h-12 text-red-600 mb-3" />
                        <p className="text-sm font-semibold text-gray-900 mb-2 text-center">
                          Remover este tratamento do histórico?
                        </p>
                        <p className="text-xs text-gray-600 mb-4 text-center">
                          Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
                            disabled={deletingId === appointment.id}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleDelete(appointment.id)}
                            disabled={deletingId === appointment.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                          >
                            {deletingId === appointment.id ? 'Removendo...' : 'Sim, remover'}
                          </button>
                        </div>
                      </div>
                    )}
                    
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
                        {isCompleted ? '✓ Concluído' : appointment.canceledBy === 'admin' ? '✗ Cancelado pela Esteticista' : '✗ Cancelado'}
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

