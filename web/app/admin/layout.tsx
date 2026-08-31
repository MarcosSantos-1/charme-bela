'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import NotificationsPanel from '@/components/NotificationsPanel'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  RiHome5Fill,
  RiCalendar2Fill,
  RiSparklingFill,
  RiSettings4Fill,
  RiTeamFill,
  RiVipCrownFill,
  RiGiftFill,
  RiFileList3Fill,
  RiMegaphoneFill,
  RiLayoutMasonryFill,
  RiShieldUserFill,
  RiLogoutBoxRFill,
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiApps2Fill,
  RiCloseLine,
  RiExternalLinkLine,
  RiHandHeartFill,
} from 'react-icons/ri'
import { useState, useRef, useEffect } from 'react'

const navigation = [
  { name: 'Home', href: '/admin', icon: RiHome5Fill },
  { name: 'Agendamentos', href: '/admin/agendamentos', icon: RiCalendar2Fill },
  { name: 'Serviços', href: '/admin/servicos', icon: RiHandHeartFill },
  { name: 'Configurações', href: '/admin/configuracoes', icon: RiSettings4Fill },
]

const clientesDropdown = [
  { name: 'Clientes', href: '/admin/clientes', icon: RiTeamFill },
  { name: 'Planos', href: '/admin/planos', icon: RiVipCrownFill },
  { name: 'Vouchers', href: '/admin/vouchers', icon: RiGiftFill },
  { name: 'Anamneses', href: '/admin/anamneses', icon: RiFileList3Fill },
]

const marketingNavigation = [
  { name: 'Promoções', href: '/admin/promocoes', icon: RiMegaphoneFill },
  { name: 'Landing Page', href: '/admin/landing', icon: RiLayoutMasonryFill },
]

// Bottom nav items for mobile
const mobileBottomNav = [
  { name: 'Home', href: '/admin', icon: RiHome5Fill },
  { name: 'Agenda', href: '/admin/agendamentos', icon: RiCalendar2Fill },
  { name: 'Clientes', href: '/admin/clientes', icon: RiTeamFill },
  { name: 'Serviços', href: '/admin/servicos', icon: RiHandHeartFill },
  { name: 'Mais', href: '#', icon: RiApps2Fill },
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
      <div className="min-h-screen bg-[#faf5f7] font-sans">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-slate-100 bg-white">
            <div className="flex items-center space-x-3">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 flex-shrink-0">
                <Image
                  src="/images/logo.png"
                  alt="Charme & Bela"
                  width={36}
                  height={36}
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900">Charme & Bela</span>
                <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">Painel Admin</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/25'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
                  }`} />
                  {item.name}
                </Link>
              )
            })}

            {/* Clientes dropdown section */}
            <div className="pt-2">
              <button
                onClick={() => setClientesDropdownOpen(!clientesDropdownOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  isClientesActive
                    ? 'bg-rose-50 text-rose-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center">
                  <RiTeamFill className={`w-5 h-5 mr-3 ${isClientesActive ? 'text-rose-600' : 'text-slate-500'}`} />
                  <span>Clientes & Planos</span>
                </div>
                <RiArrowRightSLine className={`w-4 h-4 transition-transform duration-200 ${clientesDropdownOpen ? 'rotate-90 text-rose-600' : 'text-slate-400'}`} />
              </button>
              
              {/* Dropdown items */}
              {clientesDropdownOpen && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 space-y-1">
                  {clientesDropdown.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                          isActive
                            ? 'bg-rose-600 text-white font-semibold shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 mr-2.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Marketing section */}
            <div className="pt-4 px-3.5 pb-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Marketing & Site
              </div>
            </div>
            {marketingNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/25'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
                  }`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content wrapper */}
        <div className="lg:pl-64 flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 shadow-xs">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile logo on top left */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-xs ring-1 ring-black/5 flex-shrink-0">
                  <Image
                    src="/images/logo.png"
                    alt="Charme & Bela"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
              </div>

              <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                {navigation.find(item => item.href === pathname)?.name || 
                 marketingNavigation.find(item => item.href === pathname)?.name ||
                 clientesDropdown.find(item => item.href === pathname)?.name ||
                 (pathname === '/admin/acessos' ? 'Gestão de Acessos' : 'Admin')}
              </h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationsPanel userId={null} />
              
              <Link
                href="/"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                title="Abrir site público"
              >
                <span>Ver site</span>
                <RiExternalLinkLine className="w-3.5 h-3.5" />
              </Link>

              {/* User menu dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 sm:px-2 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-8 sm:h-8 bg-gradient-to-tr from-rose-600 to-pink-500 rounded-full flex items-center justify-center shadow-xs text-white">
                    <span className="font-bold text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {user?.name || 'Administradora'}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">
                      Gestão Clínica
                    </p>
                  </div>
                  <RiArrowDownSLine className={`hidden md:block w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180 text-slate-700' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user?.name || 'Administradora'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {user?.email || 'admin@charmebela.com'}
                      </p>
                    </div>

                    <Link
                      href="/"
                      target="_blank"
                      className="sm:hidden flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <RiExternalLinkLine className="w-4 h-4 mr-2.5 text-slate-500" />
                      Ver site público
                    </Link>

                    {user?.role === 'MANAGER' && (
                      <Link
                        href="/admin/acessos"
                        className="flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <RiShieldUserFill className="w-4 h-4 mr-2.5 text-slate-500" />
                        Gestão de Acessos
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={async () => {
                        setUserMenuOpen(false)
                        await signOut()
                        window.location.href = '/'
                      }}
                      className="w-full flex items-center px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <RiLogoutBoxRFill className="w-4 h-4 mr-2.5" />
                      Sair do Sistema
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content - Reduced padding for mobile */}
          <main className="flex-1 py-3 sm:py-6 px-2.5 sm:px-6 lg:px-8 pb-24 lg:pb-8">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-5 h-16 px-1">
            {mobileBottomNav.map((item) => {
              const isActive = item.href === '#' ? false : pathname === item.href
              const isMore = item.name === 'Mais'
              
              if (isMore) {
                return (
                  <button
                    key={item.name}
                    onClick={() => setMobileMoreMenuOpen(true)}
                    className="flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition-all active:scale-95 touch-manipulation"
                  >
                    <div className={`p-1 rounded-xl transition-colors ${mobileMoreMenuOpen ? 'bg-rose-100 text-rose-600' : 'text-slate-500'}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={`mt-0.5 text-[10px] font-bold ${mobileMoreMenuOpen ? 'text-rose-600' : 'text-slate-600'}`}>{item.name}</span>
                  </button>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center py-1 text-[11px] font-semibold transition-all active:scale-95 touch-manipulation"
                >
                  <div className={`p-1 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-rose-600 text-white shadow-xs' 
                      : 'text-slate-500'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`mt-0.5 text-[10px] font-bold ${isActive ? 'text-rose-600' : 'text-slate-600'}`}>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Mobile "Mais" Menu Bottom Sheet */}
        {mobileMoreMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] lg:hidden animate-in fade-in duration-150"
              onClick={() => setMobileMoreMenuOpen(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-[95] bg-white rounded-t-3xl shadow-2xl lg:hidden max-h-[82vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200">
              {/* Sheet Header */}
              <div className="shrink-0 bg-white border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                    <h3 className="text-base font-bold text-slate-900">Mais Opções</h3>
                  </div>
                  <button
                    onClick={() => setMobileMoreMenuOpen(false)}
                    aria-label="Fechar"
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <RiCloseLine className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sheet Content */}
              <div className="p-4 space-y-4 overflow-y-auto pb-8">
                {/* Gestão de Clientes */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    Clientes & Benefícios
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {clientesDropdown.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMoreMenuOpen(false)}
                          className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                            isActive
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-slate-50/80 border-slate-200/80 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-rose-600'}`} />
                          <span className="text-xs font-bold leading-tight">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Marketing & Landing */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    Marketing & Divulgação
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {marketingNavigation.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMoreMenuOpen(false)}
                          className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                            isActive
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-slate-50/80 border-slate-200/80 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-rose-600'}`} />
                          <span className="text-xs font-bold leading-tight">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Configurações */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    Geral
                  </div>
                  <Link
                    href="/admin/configuracoes"
                    onClick={() => setMobileMoreMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <RiSettings4Fill className="w-5 h-5 text-slate-600" />
                      <span className="text-sm font-bold">Configurações da Clínica</span>
                    </div>
                    <RiArrowRightSLine className="w-5 h-5 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}

