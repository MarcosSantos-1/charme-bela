'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import NotificationsPanel from '@/components/NotificationsPanel'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Settings,
  LogOut,
  X,
  ClipboardList,
  HomeIcon,
  CreditCard,
  Gift,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const navigation = [
  { name: 'Home', href: '/admin', icon: HomeIcon },
  { name: 'Agendamentos', href: '/admin/agendamentos', icon: Calendar },
  { name: 'Serviços', href: '/admin/servicos', icon: Sparkles },
  { name: 'Configurações', href: '/admin/configuracoes', icon: Settings },
]

const clientesDropdown = [
  { name: 'Clientes', href: '/admin/clientes', icon: Users },
  { name: 'Planos', href: '/admin/planos', icon: CreditCard },
  { name: 'Vouchers', href: '/admin/vouchers', icon: Gift },
  { name: 'Anamneses', href: '/admin/anamneses', icon: ClipboardList },
]

const marketingNavigation = [
  { name: 'Promoções', href: '/admin/promocoes', icon: Sparkles },
  { name: 'Landing Page', href: '/admin/landing', icon: LayoutDashboard },
]

// Bottom nav items for mobile
const mobileBottomNav = [
  { name: 'Home', href: '/admin', icon: HomeIcon },
  { name: 'Agenda', href: '/admin/agendamentos', icon: Calendar },
  { name: 'Clientes', href: '/admin/clientes', icon: Users },
  { name: 'Serviços', href: '/admin/servicos', icon: Sparkles },
  { name: 'Mais', href: '#', icon: MoreHorizontal },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [clientesDropdownOpen, setClientesDropdownOpen] = useState(false)
  const [mobileMoreMenuOpen, setMobileMoreMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check if current path is in clientes dropdown
  const isClientesActive = clientesDropdown.some(item => pathname === item.href)

  // Auto-open clientes dropdown if on one of its pages
  useEffect(() => {
    if (isClientesActive) {
      setClientesDropdownOpen(true)
    }
  }, [isClientesActive])

  return (
    <ProtectedRoute requiredRole="MANAGER">
      <div className="min-h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Image
                src="/images/logo.png"
                alt="Charme & Bela"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="text-xl font-bold text-gray-900">Charme & Bela</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto mt-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-pink-50 text-pink-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}

            {/* Clientes dropdown section */}
            <div className="space-y-1">
              <button
                onClick={() => setClientesDropdownOpen(!clientesDropdownOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isClientesActive
                    ? 'bg-pink-50 text-pink-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-3" />
                  Clientes
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${clientesDropdownOpen ? 'rotate-90' : ''}`} />
              </button>
              
              {/* Dropdown items */}
              {clientesDropdownOpen && (
                <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                  {clientesDropdown.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-pink-50 text-pink-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Marketing section */}
            <div className="px-4 py-2 mt-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Marketing
              </div>
            </div>
            {marketingNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-pink-50 text-pink-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex flex-1 items-center justify-between">
                <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {navigation.find(item => item.href === pathname)?.name || 
                   marketingNavigation.find(item => item.href === pathname)?.name ||
                   clientesDropdown.find(item => item.href === pathname)?.name ||
                   (pathname === '/admin/acessos' ? 'Gestão de Acessos' : 'Admin')}
                </h1>
                
                <div className="flex items-center gap-2 sm:gap-4">
                  <NotificationsPanel userId={null} />
                  
                  <Link
                    href="/"
                    className="hidden sm:block text-sm text-gray-600 hover:text-pink-600 transition-colors"
                  >
                    Ver site
                  </Link>

                  {/* User menu dropdown */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-pink-100 rounded-full flex items-center justify-center">
                        <span className="text-pink-600 font-semibold text-sm">
                          {user?.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Administrador
                        </p>
                      </div>
                      <ChevronDown className={`hidden lg:block w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown menu */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        {/* User info on mobile */}
                        <div className="lg:hidden px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {user?.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Administrador
                          </p>
                        </div>

                        {/* Ver site on mobile */}
                        <Link
                          href="/"
                          className="sm:hidden flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <HomeIcon className="w-4 h-4 mr-3 text-gray-400" />
                          Ver site
                        </Link>

                        {/* Gestão de Acessos */}
                        {user?.role === 'MANAGER' && (
                          <Link
                            href="/admin/acessos"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Users className="w-4 h-4 mr-3 text-gray-400" />
                            Gestão de Acessos
                          </Link>
                        )}

                        {/* Sair */}
                        <button
                          onClick={async () => {
                            setUserMenuOpen(false)
                            await signOut()
                            window.location.href = '/'
                          }}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sair
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <nav className="flex justify-around items-center h-16 px-2">
            {mobileBottomNav.map((item) => {
              const isActive = item.href === '#' ? false : pathname === item.href
              const isMore = item.name === 'Mais'
              
              if (isMore) {
                return (
                  <button
                    key={item.name}
                    onClick={() => setMobileMoreMenuOpen(true)}
                    className="flex flex-col items-center justify-center flex-1 py-2 text-xs font-medium transition-colors hover:bg-gray-50 rounded-lg"
                  >
                    <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'text-pink-600' : 'text-gray-500'}`} />
                    <span className={isActive ? 'text-pink-600' : 'text-gray-600'}>{item.name}</span>
                  </button>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center flex-1 py-2 text-xs font-medium transition-colors hover:bg-gray-50 rounded-lg"
                >
                  <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'text-pink-600' : 'text-gray-500'}`} />
                  <span className={isActive ? 'text-pink-600' : 'text-gray-600'}>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Mobile "Mais" Menu Modal */}
        {mobileMoreMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75 z-[60] lg:hidden"
              onClick={() => setMobileMoreMenuOpen(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl shadow-2xl lg:hidden max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Menu</h3>
                  <button
                    onClick={() => setMobileMoreMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Menu items */}
              <div className="px-4 py-4 space-y-2">
                {/* Configurações */}
                <Link
                  href="/admin/configuracoes"
                  className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setMobileMoreMenuOpen(false)}
                >
                  <Settings className="w-5 h-5 mr-3 text-gray-400" />
                  Configurações
                </Link>

                {/* Clientes Dropdown */}
                <div className="border-t border-gray-100 pt-2">
                  <div className="px-4 py-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Gestão de Clientes
                    </div>
                  </div>
                  {clientesDropdown.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setMobileMoreMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                      {item.name}
                    </Link>
                  ))}
                </div>

                {/* Marketing */}
                <div className="border-t border-gray-100 pt-2">
                  <div className="px-4 py-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Marketing
                    </div>
                  </div>
                  {marketingNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setMobileMoreMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}

