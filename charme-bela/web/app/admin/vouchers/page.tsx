'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useState, useEffect } from 'react'
import { ArrowLeft, Gift, Check, X, Calendar, Sparkles, Filter, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as api from '@/lib/api'
import { formatTimeAgo } from '@/lib/timeUtils'

interface VoucherDisplay {
  id: string
  userName: string
  userEmail: string
  type: string
  description: string
  isUsed: boolean
  usedAt?: string
  expiresAt?: string
  createdAt: string
  grantedReason?: string
  // Detalhes específicos por tipo
  serviceName?: string
  discountPercent?: number
  discountAmount?: number
  planName?: string
}

export default function VouchersPage() {
  const router = useRouter()
  const [vouchers, setVouchers] = useState<VoucherDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadVouchers()
  }, [])

  const loadVouchers = async () => {
    try {
      setLoading(true)
      const vouchersData = await api.getVouchers({})
      
      // Mapear vouchers com informações do usuário
      const mapped: VoucherDisplay[] = vouchersData.map((v: any) => ({
        id: v.id,
        userName: v.user?.name || 'Cliente',
        userEmail: v.user?.email || '',
        type: v.type,
        description: v.description,
        isUsed: v.isUsed,
        usedAt: v.usedAt,
        expiresAt: v.expiresAt,
        createdAt: v.createdAt,
        grantedReason: v.grantedReason,
        discountPercent: v.discountPercent,
        discountAmount: v.discountAmount
      }))
      
      setVouchers(mapped)
    } catch (error) {
      console.error('Erro ao carregar vouchers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar vouchers
  const filteredVouchers = vouchers.filter(v => {
    // Filtro de status
    const now = new Date()
    const isExpired = v.expiresAt && new Date(v.expiresAt) < now
    
    if (filter === 'used' && !v.isUsed) return false
    if (filter === 'expired' && !isExpired) return false
    if (filter === 'active' && (v.isUsed || isExpired)) return false
    
    // Filtro de busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        v.userName.toLowerCase().includes(search) ||
        v.userEmail.toLowerCase().includes(search) ||
        v.description.toLowerCase().includes(search)
      )
    }
    
    return true
  })

  const getVoucherTypeColor = (type: string) => {
    switch (type) {
      case 'FREE_TREATMENT': return 'bg-green-100 text-green-700 border-green-200'
      case 'DISCOUNT': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'FREE_MONTH': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getVoucherTypeName = (type: string) => {
    switch (type) {
      case 'FREE_TREATMENT': return 'Tratamento Grátis'
      case 'DISCOUNT': return 'Desconto'
      case 'FREE_MONTH': return 'Mês Grátis'
      default: return type
    }
  }

  const getStatusBadge = (voucher: VoucherDisplay) => {
    const now = new Date()
    const isExpired = voucher.expiresAt && new Date(voucher.expiresAt) < now
    
    if (voucher.isUsed) {
      return (
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
          ✓ Usado
        </span>
      )
    }
    
    if (isExpired) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full border border-red-200">
          ✗ Expirado
        </span>
      )
    }
    
    return (
      <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full border border-green-200">
        ● Ativo
      </span>
    )
  }

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este voucher?')) return
    
    try {
      await api.deleteVoucher(id)
      setVouchers(vouchers.filter(v => v.id !== id))
    } catch (error: any) {
      alert(error.message || 'Erro ao remover voucher')
    }
  }

  return (
    <ProtectedRoute requiredRole="MANAGER">
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Vouchers</h1>
                <p className="text-gray-600">Gerencie todos os vouchers e presentes concedidos</p>
              </div>
              <button
                onClick={() => router.push('/admin/clientes')}
                className="px-6 py-3 bg-pink-600 text-white rounded-xl font-medium hover:bg-pink-700 transition-colors"
              >
                + Dar Voucher
              </button>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Filtros */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all' 
                      ? 'bg-pink-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'active' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setFilter('used')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'used' 
                      ? 'bg-gray-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Usados
                </button>
                <button
                  onClick={() => setFilter('expired')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'expired' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Expirados
                </button>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, email ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Estatísticas - Grid 2x2 mobile, 4 colunas desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Gift className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">{vouchers.length}</div>
              <div className="text-xs sm:text-sm font-medium text-blue-600">Total</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-green-700 mb-1">
                {vouchers.filter(v => !v.isUsed && (!v.expiresAt || new Date(v.expiresAt) > new Date())).length}
              </div>
              <div className="text-xs sm:text-sm font-medium text-green-600">Ativos</div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-700 mb-1">
                {vouchers.filter(v => v.isUsed).length}
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-600">Usados</div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-red-700 mb-1">
                {vouchers.filter(v => !v.isUsed && v.expiresAt && new Date(v.expiresAt) < new Date()).length}
              </div>
              <div className="text-xs sm:text-sm font-medium text-red-600">Expirados</div>
            </div>
          </div>

          {/* Lista de Vouchers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-3"></div>
                <p className="text-gray-500">Carregando vouchers...</p>
              </div>
            ) : filteredVouchers.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredVouchers.map((voucher) => {
                  const isExpired = voucher.expiresAt && new Date(voucher.expiresAt) < new Date()
                  
                  return (
                    <div
                      key={voucher.id}
                      className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Gift className="w-6 h-6 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                                {voucher.userName}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVoucherTypeColor(voucher.type)}`}>
                                {getVoucherTypeName(voucher.type)}
                              </span>
                              {getStatusBadge(voucher)}
                              </div>
                            </div>
                            
                            <p className="text-sm sm:text-base text-gray-600 mb-2">{voucher.description}</p>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                              <span className="truncate">{voucher.userEmail}</span>
                              {voucher.discountPercent && (
                                <span className="text-blue-600 font-medium text-xs sm:text-sm">
                                  {voucher.discountPercent}% desconto
                                </span>
                              )}
                              {voucher.discountAmount && (
                                <span className="text-blue-600 font-medium text-xs sm:text-sm">
                                  R$ {voucher.discountAmount.toFixed(2).replace('.', ',')} desconto
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500 mt-2">
                              <span>Criado: {formatTimeAgo(voucher.createdAt)}</span>
                              {voucher.expiresAt && (
                                <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                                  {isExpired ? '✗ Expirou' : '⏰ Expira'}: {new Date(voucher.expiresAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                              {voucher.usedAt && (
                                <span className="text-green-600">
                                  ✓ Usado: {new Date(voucher.usedAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            
                            {voucher.grantedReason && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                Motivo: {voucher.grantedReason}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Ações */}
                        <div className="flex sm:flex-col items-center gap-2 sm:ml-4">
                          {!voucher.isUsed && !isExpired && (
                            <button
                              onClick={() => handleDeleteVoucher(voucher.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remover voucher"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm 
                    ? 'Nenhum voucher encontrado com essa busca' 
                    : filter === 'all'
                      ? 'Nenhum voucher criado ainda'
                      : `Nenhum voucher ${
                          filter === 'active' ? 'ativo' :
                          filter === 'used' ? 'usado' :
                          'expirado'
                        }`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

