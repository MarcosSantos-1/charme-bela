'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useState, useEffect } from 'react'
import {
  RiArrowLeftLine,
  RiGiftFill,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiCalendar2Fill,
  RiSparklingFill,
  RiFilter3Fill,
  RiSearchLine,
  RiDeleteBin5Fill,
  RiLoader4Line,
} from 'react-icons/ri'
import { useRouter } from 'next/navigation'
import { DarVoucherModal } from '@/components/admin/DarVoucherModal'
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
  remainingAmount?: number
  planName?: string
}

function hasReusableBalance(v: Pick<VoucherDisplay, 'remainingAmount' | 'discountPercent'>) {
  return (v.remainingAmount ?? 0) > 0.009 && !(Number(v.discountPercent) > 0)
}

function isEffectivelyUsed(v: Pick<VoucherDisplay, 'isUsed' | 'remainingAmount' | 'discountPercent'>) {
  return v.isUsed && !hasReusableBalance(v)
}

export default function VouchersPage() {
  const router = useRouter()
  const [vouchers, setVouchers] = useState<VoucherDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showVoucherModal, setShowVoucherModal] = useState(false)

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
        discountAmount: v.discountAmount,
        remainingAmount: v.remainingAmount,
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
    const now = new Date()
    const isExpired = Boolean(v.expiresAt && new Date(v.expiresAt) < now)

    if (filter === 'used' && !isEffectivelyUsed(v)) return false
    if (filter === 'expired' && !isExpired) return false
    if (filter === 'active' && (isEffectivelyUsed(v) || isExpired)) return false
    
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
      case 'FREE_TREATMENT': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'DISCOUNT': return 'bg-sky-100 text-sky-800 border-sky-200'
      case 'FREE_MONTH': return 'bg-violet-100 text-violet-800 border-violet-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
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
    
    if (isEffectivelyUsed(voucher)) {
      return (
        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
          ✓ Usado
        </span>
      )
    }
    
    if (isExpired) {
      return (
        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
          ✗ Expirado
        </span>
      )
    }
    
    return (
      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
            >
              <RiArrowLeftLine className="w-4 h-4 mr-1" />
              Voltar
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Histórico de Vouchers</h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">Gerencie todos os vouchers, créditos e presentes concedidos</p>
          </div>
          <button
            onClick={() => setShowVoucherModal(true)}
            className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-rose-700 transition-colors shadow-xs self-start sm:self-auto touch-manipulation cursor-pointer"
          >
            + Conceder Voucher
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-3 sm:p-4 shadow-xs">
          <div className="grid md:grid-cols-2 gap-3">
            {/* Filtros */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <RiFilter3Fill className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 mr-1">Status:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filter === 'all' 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filter === 'active' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setFilter('used')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filter === 'used' 
                      ? 'bg-slate-700 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Usados
                </button>
                <button
                  onClick={() => setFilter('expired')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filter === 'expired' 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Expirados
                </button>
              </div>

              {/* Busca */}
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, email ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-400 text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white touch-manipulation"
                />
              </div>
            </div>
          </div>

          {/* Estatísticas - Grid 2x2 mobile, 4 colunas desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-4 text-white shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <RiGiftFill className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mb-0.5">{vouchers.length}</div>
              <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide">Total</div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <RiCheckboxCircleFill className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mb-0.5">
                {vouchers.filter(v => !isEffectivelyUsed(v) && (!v.expiresAt || new Date(v.expiresAt) > new Date())).length}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide">Ativos</div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-4 text-white shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <RiSparklingFill className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mb-0.5">
                {vouchers.filter(v => isEffectivelyUsed(v)).length}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide">Usados</div>
            </div>
            
            <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-4 text-white shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <RiCloseLine className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mb-0.5">
                {vouchers.filter(v => !isEffectivelyUsed(v) && v.expiresAt && new Date(v.expiresAt) < new Date()).length}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide">Expirados</div>
            </div>
          </div>

          {/* Lista de Vouchers */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-bold">Carregando vouchers...</p>
              </div>
            ) : filteredVouchers.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredVouchers.map((voucher) => {
                  const isExpired = voucher.expiresAt && new Date(voucher.expiresAt) < new Date()
                  
                  return (
                    <div
                      key={voucher.id}
                      className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center shrink-0 text-white shadow-xs">
                            <RiGiftFill className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mb-1">
                              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                                {voucher.userName}
                              </h3>
                              <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getVoucherTypeColor(voucher.type)}`}>
                                {getVoucherTypeName(voucher.type)}
                              </span>
                              {getStatusBadge(voucher)}
                              </div>
                            </div>
                            
                            <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-2">{voucher.description}</p>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-500">
                              <span className="truncate">{voucher.userEmail}</span>
                              {voucher.discountPercent && (
                                <span className="text-sky-700 font-bold">
                                  {voucher.discountPercent}% desconto
                                </span>
                              )}
                              {voucher.discountAmount && (
                                <span className="text-sky-700 font-bold">
                                  {voucher.remainingAmount != null && voucher.remainingAmount !== voucher.discountAmount
                                    ? `Saldo R$ ${voucher.remainingAmount.toFixed(2).replace('.', ',')} de R$ ${voucher.discountAmount.toFixed(2).replace('.', ',')}`
                                    : `R$ ${voucher.discountAmount.toFixed(2).replace('.', ',')} desconto`}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[11px] font-semibold text-slate-400 mt-2">
                              <span>Criado: {formatTimeAgo(voucher.createdAt)}</span>
                              {voucher.expiresAt && (
                                <span className={isExpired ? 'text-rose-600 font-bold' : ''}>
                                  {isExpired ? '✗ Expirou' : '⏰ Expira'}: {new Date(voucher.expiresAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                              {voucher.usedAt && (
                                <span className="text-emerald-600 font-bold">
                                  ✓ Usado: {new Date(voucher.usedAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            
                            {voucher.grantedReason && (
                              <p className="text-[11px] text-slate-400 font-medium mt-1.5 italic">
                                Motivo: {voucher.grantedReason}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Ações */}
                        <div className="flex sm:flex-col items-center gap-2 sm:ml-4 self-end sm:self-start">
                          {!isEffectivelyUsed(voucher) && !isExpired && (
                            <button
                              onClick={() => handleDeleteVoucher(voucher.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Remover voucher"
                            >
                              <RiDeleteBin5Fill className="w-4 h-4" />
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
                <RiGiftFill className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-bold">
                  {searchTerm 
                    ? 'Nenhum voucher encontrado com essa busca' 
                    : filter === 'all'
                      ? 'Nenhum voucher concedido ainda'
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

        {/* Modal de Conceder Voucher */}
        <DarVoucherModal
          isOpen={showVoucherModal}
          onClose={() => setShowVoucherModal(false)}
          onVoucherCreated={loadVouchers}
        />
      </ProtectedRoute>
    )
  }

