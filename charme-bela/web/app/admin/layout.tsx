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
  Menu,
  X,
  ClipboardList,
  HomeIcon,
  CreditCard,
  Gift
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Home', href: '/admin', icon: HomeIcon },
  { name: 'Agendamentos', href: '/admin/agendamentos', icon: Calendar },
  { name: 'Clientes', href: '/admin/clientes', icon: Users },
  { name: 'Planos', href: '/admin/planos', icon: CreditCard },
  { name: 'Vouchers', href: '/admin/vouchers', icon: Gift },
  { name: 'Serviços', href: '/admin/servicos', icon: Sparkles },
  { name: 'Anamneses', href: '/admin/anamneses', icon: ClipboardList },
  { name: 'Configurações', href: '/admin/configuracoes', icon: Settings },
]

const adminNavigation = [
  { name: 'Gestão de Acessos', href: '/admin/acessos', icon: Users },
]

const marketingNavigation = [
  { name: 'Promoções', href: '/admin/promocoes', icon: Sparkles },
  { name: 'Landing Page', href: '/admin/landing', icon: LayoutDashboard },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  return (
    <ProtectedRoute requiredRole="MANAGER">
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
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
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="text-pink-600 font-semibold">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Administrador
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
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
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}

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
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}

            {/* Admin only section */}
            {user?.role === 'MANAGER' && (
              <>
                <div className="px-4 py-2 mt-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administração
                  </div>
                </div>
                {adminNavigation.map((item) => {
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
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={async () => {
                await signOut()
                window.location.href = '/'
              }}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="lg:hidden -m-2.5 p-2.5 text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex flex-1 items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {navigation.find(item => item.href === pathname)?.name || 'Admin'}
                </h1>
                
                <div className="flex items-center space-x-4">
                  <NotificationsPanel userId={null} />
                  <Link
                    href="/"
                    className="text-sm text-gray-600 hover:text-pink-600"
                  >
                    Ver site
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="py-8 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

