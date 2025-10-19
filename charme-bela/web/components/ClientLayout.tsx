'use client'

import { ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import NotificationsPanel from '@/components/NotificationsPanel'
import { 
  Calendar, 
  User, 
  FileText, 
  CreditCard, 
  Home, 
  Sparkles
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

interface ClientLayoutProps {
  children: ReactNode
  title?: string
}

export function ClientLayout({ children, title }: ClientLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { subscription, hasSubscription } = useSubscription(user?.id)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const handleSwitchAccount = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const menuItems = [
    { icon: Home, label: 'Início', href: '/cliente', active: pathname === '/cliente' },
    { icon: Sparkles, label: 'Serviços', href: '/cliente/servicos', active: pathname === '/cliente/servicos' },
    { icon: Calendar, label: 'Agenda', href: '/cliente/agenda', active: pathname === '/cliente/agenda' },
    { icon: CreditCard, label: 'Meu Plano', href: '/cliente/plano', active: pathname === '/cliente/plano' },
    { icon: User, label: 'Perfil', href: '/cliente/perfil', active: pathname === '/cliente/perfil' },
    { icon: FileText, label: 'Histórico', href: '/cliente/historico', active: pathname === '/cliente/historico' },
  ]

  const mobileMenuItems = [
    { icon: Home, label: 'Início', href: '/cliente', active: pathname === '/cliente' },
    { icon: Calendar, label: 'Agenda', href: '/cliente/agenda', active: pathname === '/cliente/agenda' },
    { icon: Sparkles, label: 'Serviços', href: '/cliente/servicos', active: pathname === '/cliente/servicos' },
    { icon: FileText, label: 'Histórico', href: '/cliente/historico', active: pathname === '/cliente/historico' },
  ]

  // Verificar se é mês grátis
  const isFreeMonth = subscription && !subscription.stripeSubscriptionId
  
  // Formatar data de próxima cobrança
  const getNextBillingDate = () => {
    if (!subscription?.startDate) return '-'
    
    // Se for mês grátis, mostrar data de expiração
    if (isFreeMonth && subscription.endDate) {
      return new Date(subscription.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    }
    
    const start = new Date(subscription.startDate)
    const next = new Date(start)
    next.setMonth(next.getMonth() + 1)
    return next.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:ml-64">
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 z-30 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-200">
          <Image
            src="/images/logo.png"
            alt="Charme & Bela"
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <h2 className="font-bold text-gray-900">Charme & Bela</h2>
            <p className="text-xs text-gray-500">Área do Cliente</p>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="space-y-2 mb-4">
          {menuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                item.active ? 'bg-pink-50 text-pink-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </div>

        {/* User Info */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center space-x-3 mb-3">
            {user?.profileImageUrl ? (
              <Image
                src={user.profileImageUrl}
                alt={user.name || 'User'}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-pink-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
          </div>
          
          {/* Subscription Status */}
          {hasSubscription && subscription && (
            <Link href="/cliente/plano">
              <div className={`mb-3 p-3 border-l-4 rounded cursor-pointer transition-colors ${
                isFreeMonth 
                  ? 'bg-green-50 border-green-500 hover:bg-green-100' 
                  : 'bg-green-50 border-green-500 hover:bg-green-100'
              }`}>
                <div className="text-xs text-green-600 font-medium">
                  {isFreeMonth ? '🎁 Mês Grátis Ativo' : 'Status da Assinatura'}
                </div>
                <div className="text-sm font-bold text-green-700">{subscription.plan.name} ✓</div>
                <div className="text-xs text-green-600 mt-1">
                  {isFreeMonth ? `Válido até: ${getNextBillingDate()}` : `Próx. cobrança: ${getNextBillingDate()}`}
                </div>
              </div>
            </Link>
          )}
          
          <button
            onClick={async () => {
              await signOut()
              window.location.href = '/'
            }}
            className="w-full text-sm text-red-600 hover:bg-red-50 py-2 px-4 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Mobile Top Bar - SEMPRE VISÍVEL */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/images/logo.png"
              alt="Charme & Bela"
              width={32}
              height={32}
              className="object-contain"
            />
            <div>
              <h1 className="font-bold text-gray-900">Charme & Bela</h1>
              <p className="text-xs text-gray-500">
                {title || 'Área do Cliente'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <NotificationsPanel userId={user?.id || null} />

            {/* Profile Button */}
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="relative"
            >
              {user?.profileImageUrl ? (
                <Image
                  src={user.profileImageUrl}
                  alt={user.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-pink-200"
                />
              ) : (
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center border-2 border-pink-200">
                  <User className="w-5 h-5 text-pink-600" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Profile Dropdown Menu - Mobile */}
        {showProfileMenu && (
          <div className="absolute right-4 top-16 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="font-medium text-gray-900">{user?.name}</div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
            
            <Link href="/cliente/perfil" className="block px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
              <User className="w-4 h-4 inline mr-2" />
              Meu Perfil
            </Link>
            <Link href="/cliente/plano" className="block px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
              <Sparkles className="w-4 h-4 inline mr-2" />
              Gerenciar Plano
            </Link>
            <Link href="/cliente/pagamentos" className="block px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
              <CreditCard className="w-4 h-4 inline mr-2" />
              Pagamentos
            </Link>
            
            {hasSubscription && subscription && (
              <Link href="/cliente/plano" className="block px-4 py-3 bg-green-50 border-l-4 border-green-500 hover:bg-green-100 transition-colors">
                <div className="text-xs text-green-600 font-medium">
                  {isFreeMonth ? '🎁 Mês Grátis Ativo' : 'Status da Assinatura'}
                </div>
                <div className="text-sm font-bold text-green-700">{subscription.plan.name} ✓</div>
                <div className="text-xs text-green-600 mt-1">
                  {isFreeMonth ? `Válido até: ${getNextBillingDate()}` : `Próx. cobrança: ${getNextBillingDate()}`}
                </div>
              </Link>
            )}
            
            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={handleSwitchAccount}
                className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700"
              >
                Trocar de conta
              </button>
              <button
                onClick={async () => {
                  await signOut()
                  window.location.href = '/'
                }}
                className="block w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600"
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {children}

      {/* Mobile Bottom Navigation - SEMPRE VISÍVEL */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 gap-1 p-2">
          {mobileMenuItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center py-3 rounded-lg transition-colors ${
                item.active ? 'bg-pink-50 text-pink-600' : 'text-gray-600'
              }`}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

