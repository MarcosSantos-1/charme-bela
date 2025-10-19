'use client'

import { Gift, Sparkles, Calendar, AlertCircle } from 'lucide-react'
import type { Voucher } from '@/lib/api'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import { useState } from 'react'

interface VoucherBannerProps {
  vouchers: Voucher[]
  onSelectVoucher?: (voucher: Voucher) => void
  onVoucherActivated?: () => void
}

export function VoucherBanner({ vouchers, onSelectVoucher, onVoucherActivated }: VoucherBannerProps) {
  const [activating, setActivating] = useState<string | null>(null)
  
  if (!vouchers || vouchers.length === 0) return null
  
  const handleActivateFreeMonth = async (voucher: Voucher, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Usar toast personalizado ao invés de confirm()
    const activateToast = toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-semibold text-gray-900">Ativar Mês Grátis?</p>
            <p className="text-sm text-gray-600 mt-1">Você terá acesso completo ao plano por 1 mês!</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id)
                try {
      setActivating(voucher.id)
      
      // Mostrar loading toast
      const loadingToast = toast.loading('Ativando seu plano...', {
        position: 'top-center'
      })
      
      await api.activateFreeMonthVoucher(voucher.id)
      
      toast.dismiss(loadingToast)
      
      // Toast de sucesso com confetti visual
      toast.success(
        (t) => (
          <div className="flex flex-col items-center gap-2">
            <div className="text-4xl animate-bounce">🎉</div>
            <div className="font-bold text-gray-900">Plano Ativado!</div>
            <div className="text-sm text-gray-600">Aproveite seu mês grátis!</div>
          </div>
        ),
        {
          duration: 3000,
          position: 'top-center',
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '20px'
          }
        }
      )
      
      // Redirecionar para home após 1 segundo
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/cliente'
        }
      }, 1000)
                } catch (error: any) {
                  toast.error(error.message || 'Erro ao ativar voucher')
                  setActivating(null)
                }
              }}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 transition-colors"
            >
              Sim, Ativar!
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: 'top-center',
        style: {
          minWidth: '350px'
        }
      }
    )
  }

  const getVoucherIcon = (type: string) => {
    switch (type) {
      case 'FREE_TREATMENT': return <Gift className="w-6 h-6" />
      case 'DISCOUNT': return <Sparkles className="w-6 h-6" />
      case 'FREE_MONTH': return <Calendar className="w-6 h-6" />
      default: return <Gift className="w-6 h-6" />
    }
  }

  const getVoucherColor = (type: string) => {
    switch (type) {
      case 'FREE_TREATMENT': return 'from-green-500 to-emerald-600'
      case 'DISCOUNT': return 'from-blue-500 to-cyan-600'
      case 'FREE_MONTH': return 'from-purple-500 to-pink-600'
      default: return 'from-pink-500 to-rose-600'
    }
  }

  const getVoucherTitle = (voucher: Voucher) => {
    switch (voucher.type) {
      case 'FREE_TREATMENT':
        return 'Tratamento Grátis!'
      case 'DISCOUNT':
        if (voucher.discountPercent) return `${voucher.discountPercent}% de Desconto!`
        if (voucher.discountAmount) return `R$ ${voucher.discountAmount.toFixed(2).replace('.', ',')} de Desconto!`
        return 'Desconto Especial!'
      case 'FREE_MONTH':
        return 'Mês Grátis de Plano!'
      default:
        return 'Voucher Especial!'
    }
  }

  return (
    <div className="space-y-3 mb-6">
      {vouchers.map((voucher) => {
        const isExpiring = voucher.expiresAt && 
          new Date(voucher.expiresAt).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000

        return (
        <div
          key={voucher.id}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getVoucherColor(voucher.type)} p-1 cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl ${
            activating === voucher.id ? 'animate-pulse scale-105' : ''
          }`}
          onClick={() => onSelectVoucher && onSelectVoucher(voucher)}
        >
            <div className="bg-white rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getVoucherColor(voucher.type)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <div className="text-white">
                    {getVoucherIcon(voucher.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        {getVoucherTitle(voucher)}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {voucher.description}
                      </p>
                    </div>
                    {isExpiring && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex items-center gap-1 flex-shrink-0 ml-2">
                        <AlertCircle className="w-3 h-3" />
                        Expira em breve
                      </span>
                    )}
                  </div>
                  
                  {voucher.expiresAt && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Válido até {new Date(voucher.expiresAt).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  
                  <div className="mt-3 flex items-center gap-2">
                    <button 
                      onClick={(e) => voucher.type === 'FREE_MONTH' ? handleActivateFreeMonth(voucher, e) : undefined}
                      disabled={activating === voucher.id}
                      className="px-4 py-2 bg-gradient-to-r from-pink-600 to-pink-700 text-white text-sm font-medium rounded-lg hover:from-pink-700 hover:to-pink-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {activating === voucher.id ? 'Ativando...' : 
                        voucher.type === 'FREE_MONTH' ? 'Ativar Agora' : 'Usar Voucher'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {voucher.type === 'FREE_MONTH' ? 'Ative seu plano gratuito' : 'Clique para usar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

