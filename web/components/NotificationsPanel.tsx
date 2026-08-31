'use client'

import { useState, useEffect } from 'react'
import {
  RiNotification3Fill,
  RiCloseLine,
  RiCheckFill,
  RiCalendar2Fill,
  RiBankCardFill,
  RiSparklingFill,
  RiAlertFill,
  RiGiftFill,
  RiStarFill,
  RiTeamFill,
  RiInformationFill,
} from 'react-icons/ri'
import { useRouter } from 'next/navigation'
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  clearAllNotifications,
  type Notification as ApiNotification 
} from '@/lib/api'
import { formatTimeAgo } from '@/lib/timeUtils'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
  time: string
  read: boolean
  icon: string
  actionUrl?: string
  actionLabel?: string
}

interface NotificationsPanelProps {
  userId?: string | null // null = notificações do admin
}

export default function NotificationsPanel({ userId }: NotificationsPanelProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.read).length
  
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    // Redirecionar se tiver actionUrl
    if (notification.actionUrl) {
      setIsOpen(false)
      router.push(notification.actionUrl)
    }
  }

  // Mapear tipo de notificação da API para tipo de estilo
  const mapNotificationType = (apiType: string): 'success' | 'warning' | 'info' | 'error' => {
    if (apiType.includes('SUCCEEDED') || apiType.includes('COMPLETED') || apiType.includes('CONFIRMED')) return 'success'
    if (apiType.includes('FAILED') || apiType.includes('CANCELED')) return 'error'
    if (apiType.includes('REMINDER') || apiType.includes('EXPIRING') || apiType.includes('LIMIT')) return 'warning'
    return 'info'
  }

  // Carregar notificações
  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await getNotifications({
        userId: userId === null ? 'admin' : (userId || undefined),
        limit: 50
      })
      
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      const formattedNotifications: Notification[] = sorted.map(n => ({
        id: n.id,
        type: mapNotificationType(n.type),
        title: n.title,
        message: n.message,
        time: formatTimeAgo(n.createdAt),
        read: n.read,
        icon: n.icon,
        actionUrl: n.actionUrl,
        actionLabel: n.actionLabel
      }))
      
      setNotifications(formattedNotifications)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
      // Não quebrar o componente se o backend estiver offline
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId !== undefined) {
      loadNotifications()
      
      // Atualizar a cada 30 segundos
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ))
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(userId === null ? 'admin' : userId!)
      setNotifications(notifications.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id)
      setNotifications(notifications.filter(n => n.id !== id))
    } catch (error) {
      console.error('Erro ao deletar notificação:', error)
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllNotifications(userId === null ? 'admin' : userId!)
      setNotifications([])
    } catch (error) {
      console.error('Erro ao limpar notificações:', error)
    }
  }

  const handleVerTodas = () => {
    setIsOpen(true)
  }

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      CALENDAR: RiCalendar2Fill,
      CARD: RiBankCardFill,
      SPARKLES: RiSparklingFill,
      ALERT: RiAlertFill,
      CHECK: RiCheckFill,
      INFO: RiInformationFill,
      GIFT: RiGiftFill,
      BELL: RiNotification3Fill,
      STAR: RiStarFill,
      USER: RiTeamFill
    }
    
    const IconComponent = iconMap[iconName] || RiNotification3Fill
    return <IconComponent className="w-5 h-5" />
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-600 text-white'
      case 'warning': return 'bg-amber-500 text-white'
      case 'error': return 'bg-rose-600 text-white'
      default: return 'bg-blue-600 text-white'
    }
  }

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors active:scale-95 touch-manipulation"
        title="Notificações"
      >
        <RiNotification3Fill className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-14 sm:top-16 w-96 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 max-h-[500px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Notificações</h3>
                <p className="text-[11px] font-semibold text-slate-500">{unreadCount} não lida(s)</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleVerTodas}
                  className="text-xs text-rose-600 font-bold hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Ver todas
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-slate-600 font-bold hover:text-slate-900 px-2 py-1"
                  >
                    Marcar lidas
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {loading ? (
                <div className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-3"></div>
                  <p className="text-xs font-bold text-slate-500">Carregando...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 sm:px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !notif.read ? 'bg-rose-50/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${getIconColor(notif.type)}`}>
                        {getIcon(notif.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {notif.title}
                            {!notif.read && (
                              <span className="w-2 h-2 bg-rose-600 rounded-full inline-block ml-1.5 align-middle" />
                            )}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNotification(notif.id)
                            }}
                            className="p-1 hover:bg-slate-200 rounded-lg flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="Excluir notificação"
                          >
                            <RiCloseLine className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-1.5">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <RiNotification3Fill className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Nenhuma notificação</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={handleVerTodas}
                  className="font-bold text-rose-600 hover:text-rose-700"
                >
                  Histórico completo →
                </button>
                <button
                  onClick={handleClearAll}
                  className="font-bold text-slate-500 hover:text-rose-600"
                >
                  Limpar todas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
