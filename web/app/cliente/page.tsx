'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { Button } from '@/components/Button'
import { useConfirm } from '@/hooks/useConfirm'
import NotificationsPanel from '@/components/NotificationsPanel'
import Link from 'next/link'
import { Calendar, Clock, Sparkles, ChevronRight, FileText, FileHeart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import * as api from '@/lib/api'
import type { Banner } from '@/lib/api'
import { Service } from '@/types'
import { isAppointmentUpcoming } from '@/lib/timeUtils'
import { BannerSlider } from '@/components/BannerSlider'

export default function ClientePage() {
  const { user } = useAuth()
  const router = useRouter()
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const { subscription, hasSubscription, remainingTreatments, loading: subscriptionLoading } = useSubscription(user?.id)
  const { appointments, loading: appointmentsLoading } = useAppointments(user?.id)
  const [allServices, setAllServices] = useState<Service[]>([])
  const [promoBanners, setPromoBanners] = useState<Banner[]>([])
  
  // Buscar todos os serviços para contar
  useEffect(() => {
    async function loadServices() {
      try {
        const services = await api.getServices()
        setAllServices(services)
      } catch (error) {
        console.error('Erro ao carregar serviços:', error)
      }
    }
    loadServices()
  }, [])

  useEffect(() => {
    async function loadBanners() {
      try {
        const banners = await api.getBanners({ location: 'CLIENT', activeOnly: true })
        setPromoBanners(Array.isArray(banners) ? banners : [])
      } catch (error) {
        console.error('Erro ao carregar banners:', error)
        setPromoBanners([])
      }
    }
    void loadBanners()
  }, [])
  
  // Filtrar próximos: hora de parede (mesmo critério do admin), não UTC real
  const upcomingAppointments = appointments
    .filter(apt =>
      ['PENDING', 'CONFIRMED'].includes(apt.status) &&
      isAppointmentUpcoming(apt.startTime)
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3) // Mostrar apenas os 3 próximos
  
  // Cores por tier do plano
  const getPlanColors = () => {
    if (!subscription) return { from: 'from-gray-400', to: 'to-gray-500' }
    
    switch (subscription.plan.tier) {
      case 'GOLD':
        return { from: 'from-purple-500', to: 'to-pink-600' }
      case 'SILVER':
        return { from: 'from-pink-500', to: 'to-purple-600' }
      case 'BRONZE':
        return { from: 'from-blue-500', to: 'to-cyan-600' }
      default:
        return { from: 'from-gray-400', to: 'to-gray-500' }
    }
  }

  // Categorias dinâmicas baseadas no plano OU todos os serviços
  const procedureCategories = [
    {
      title: 'Combos',
      icon: '🎁',
      category: 'COMBO',
      count: hasSubscription 
        ? subscription?.plan.services.filter(s => s.category === 'COMBO').length || 0
        : allServices.filter(s => s.category === 'COMBO').length || 0,
      color: 'from-yellow-100 to-orange-200',
      available: hasSubscription ? 'Incluído no seu plano' : ''
    },
    {
      title: 'Tratamentos Faciais',
      icon: '💆‍♀️',
      category: 'FACIAL',
      count: hasSubscription 
        ? subscription?.plan.services.filter(s => s.category === 'FACIAL').length || 0
        : allServices.filter(s => s.category === 'FACIAL').length || 0,
      color: 'from-pink-100 to-pink-200',
      available: hasSubscription ? 'Incluído no seu plano' : ''
    },
    {
      title: 'Tratamentos Corporais',
      icon: '🧘',
      category: 'CORPORAL',
      count: hasSubscription 
        ? subscription?.plan.services.filter(s => s.category === 'CORPORAL').length || 0
        : allServices.filter(s => s.category === 'CORPORAL').length || 0,
      color: 'from-blue-100 to-blue-200',
      available: hasSubscription ? 'Incluído no seu plano' : ''
    },
    {
      title: 'Massagens',
      icon: '💆‍♀️',
      category: 'MASSAGEM',
      count: hasSubscription 
        ? subscription?.plan.services.filter(s => s.category === 'MASSAGEM').length || 0
        : allServices.filter(s => s.category === 'MASSAGEM').length || 0,
      color: 'from-purple-100 to-purple-200',
      available: hasSubscription ? 'Incluído no seu plano' : ''
    }
  ]

  return (
    <ProtectedRoute requiredRole="CLIENT">
      {ConfirmDialogComponent}
      <ClientLayout title={`Olá, ${user?.name?.split(' ')[0]}!`}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Notificações - Visível apenas no Desktop */}
          <div className="hidden md:flex justify-end">
            <NotificationsPanel userId={user?.id || null} />
          </div>
          
          {/* Card principal: plano + promoções no mesmo carrossel */}
          {subscriptionLoading ? (
            <div className="bg-gray-200 rounded-2xl animate-pulse aspect-[2/1]" />
          ) : (
            <BannerSlider
              banners={promoBanners}
              onBannerClick={(banner) => {
                if (banner.machineKind) {
                  router.push(`/cliente/servicos?machine=${banner.machineKind}`)
                  return
                }
                if (banner.linkPath) {
                  router.push(banner.linkPath.startsWith('/') ? banner.linkPath : `/${banner.linkPath}`)
                }
              }}
              planSlide={
                hasSubscription && subscription ? (
                  <Link href="/cliente/plano" className="block h-full">
                    <div className={`h-full bg-gradient-to-br ${getPlanColors().from} ${getPlanColors().to} text-white p-6 flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Sparkles className="w-7 h-7" />
                          <span className={`px-3 py-1 backdrop-blur-sm rounded-full text-xs font-medium ${
                            subscription.status === 'ACTIVE' ? 'bg-green-500/30' : 'bg-red-500/30'
                          }`}>
                            {subscription.status === 'ACTIVE' ? 'Ativo' : subscription.status}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold mb-1">{subscription.plan.name}</h3>
                        <p className="text-pink-100 text-sm">R$ {subscription.plan.price.toFixed(2)} / mês</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-sm text-pink-100 mb-2">Tratamentos usados este mês</div>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all"
                              style={{
                                width: `${((subscription.currentMonthUsage?.totalTreatments || 0) / subscription.plan.maxTreatmentsPerMonth) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="text-xl font-bold">
                            {subscription.currentMonthUsage?.totalTreatments || 0}/{subscription.plan.maxTreatmentsPerMonth}
                          </div>
                        </div>
                        <div className="text-xs text-pink-200 mt-2">
                          Restam: {remainingTreatments} tratamentos
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <Link href="/cliente/plano" className="block h-full">
                    <div className="h-full bg-gradient-to-br from-gray-400 to-gray-500 text-white p-6 flex flex-col justify-between hover:brightness-105 transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <FileHeart className="w-7 h-7" />
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                            Sem Plano
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold mb-1">Assine um Plano</h3>
                        <p className="text-gray-100 text-sm">A partir de R$ 200,00 / mês</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <p className="text-sm">
                          ✨ Até 6 tratamentos por mês<br />
                          💆 Acesso a diversos tratamentos<br />
                          🎯 Preço fixo mensal
                        </p>
                        <div className="mt-3 text-sm font-semibold">Toque para ver os planos →</div>
                      </div>
                    </div>
                  </Link>
                )
              }
            />
          )}

              {/* Categorias de Procedimentos */}
              <div>
                <div className="flex items-center justify-between mt-7 mb-3">
                  <h2 className="text-lg font-bold text-gray-900">Procedimentos</h2>
                  <Link href="/cliente/servicos" className="text-sm text-pink-600 font-medium">
                    Ver todos
                  </Link>
                </div>

            <div className="grid grid-cols-2 gap-3">
              {procedureCategories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => router.push(`/cliente/servicos?category=${category.category}`)}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all text-left"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center text-2xl mb-3`}>
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    {category.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">{category.count} opções</p>
                  {category.available && (
                    <p className="text-xs text-pink-600 font-medium">{category.available}</p>
                  )}
                </button>
              ))}
            </div>
              </div>

          {/* Próximos Agendamentos - DINÂMICO */}
              <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Próximos Agendamentos</h2>
              <Link href="/cliente/agenda" className="text-sm text-pink-600 font-medium">
                Ver todos
              </Link>
            </div>
            
            {appointmentsLoading ? (
              <div className="bg-white rounded-xl p-6 animate-pulse h-24"></div>
            ) : upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                {upcomingAppointments.map((appointment) => {
                  const date = new Date(appointment.startTime)
                  const day = date.getUTCDate().toString().padStart(2, '0')
                  const month = date.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
                  // IMPORTANTE: Usa UTC para evitar conversão de timezone
                  const time = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`
                  
                  // Determinar tipo de agendamento
                  const isAdminCreated = appointment.origin === 'ADMIN_CREATED'
                  const isAdminPending = isAdminCreated && (appointment.paymentStatus === 'PENDING' || !appointment.paymentStatus)
                  const isSubscription = appointment.origin === 'SUBSCRIPTION'
                  const isSingle = appointment.origin === 'SINGLE'
                  
                  // Definir cores
                  let cardBorder = 'border-gray-200'
                  let dateBg = 'text-pink-600'
                  
                  if (isAdminCreated) {
                    cardBorder = 'border-yellow-300 bg-yellow-50/30'
                    dateBg = 'text-yellow-600'
                  } else if (isSubscription) {
                    cardBorder = 'border-purple-300 bg-purple-50/30'
                    dateBg = 'text-purple-600'
                  } else if (isSingle) {
                    cardBorder = 'border-blue-300 bg-blue-50/30'
                    dateBg = 'text-blue-600'
                  }
                  
                  return (
                    <div
                      key={appointment.id}
                      className={`bg-white rounded-xl p-4 border-2 hover:shadow-md transition-all cursor-pointer ${cardBorder}`}
                      onClick={() => router.push('/cliente/agenda')}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${dateBg}`}>
                              {day}
                            </div>
                            <div className="text-xs text-gray-600 capitalize">
                              {month}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {appointment.service?.name || 'Carregando...'}
                            </h4>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Clock className="w-4 h-4 mr-1" />
                              {time}
                            </div>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {isAdminPending ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                  💰 Pagar na Clínica
                                </span>
                              ) : isAdminCreated ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                  📋 Agendado pela Esteticista
                                </span>
                              ) : isSubscription ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                                  ✨ Plano
                                </span>
                              ) : isSingle ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                  💳 Pagamento Único
                                </span>
                              ) : null}
                              
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                appointment.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {appointment.status === 'CONFIRMED' ? '✓ Confirmado' :
                                 appointment.status === 'PENDING' ? '⏳ Pendente' :
                                 appointment.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Nenhum agendamento futuro</p>
                      <Button
                  variant="primary"
                        size="sm"
                  className="mt-4"
                  onClick={() => router.push('/cliente/servicos')}
                >
                  Agendar Agora
                      </Button>
                    </div>
            )}

            {upcomingAppointments.length > 0 && (
                <Button
                  variant="primary"
                  className="w-full mt-4"
                onClick={() => router.push('/cliente/servicos')}
              >
                Novo Agendamento
                </Button>
          )}
        </div>

          {/* Quick Actions */}
            <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Ações Rápidas</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/cliente/anamnese/visualizar">
                <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all text-center">
                  <FileText className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Minha Anamnese</p>
              </div>
                      </Link>
              <Link href="/cliente/plano">
                <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all text-center">
                  <FileHeart className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Meu Plano</p>
                </div>
                    </Link>
              </div>
            </div>
          </div>
      </ClientLayout>
    </ProtectedRoute>
  )
}
