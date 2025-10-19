'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, Calendar, CreditCard, Sparkles, AlertCircle, Gift, Star, User, Info } from 'lucide-react'
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
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter(n => !n.read).length
  
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    // Redirecionar se tiver actionUrl
    if (notification.actionUrl) {
      setIsOpen(false)
      setShowModal(false)
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
      
      const formattedNotifications: Notification[] = data.map(n => ({
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
      if (userId !== undefined) {
        await markAllNotificationsAsRead(userId === null ? 'admin' : userId!)
        setNotifications(notifications.map(n => ({ ...n, read: true })))
      }
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
    if (confirm('Tem certeza que deseja limpar todas as notificações?')) {
      try {
        if (userId !== undefined) {
          await clearAllNotifications(userId === null ? 'admin' : userId!)
          setNotifications([])
        }
      } catch (error) {
        console.error('Erro ao limpar notificações:', error)
      }
    }
  }

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      BELL: Bell,
      CALENDAR: Calendar,
      CARD: CreditCard,
      SPARKLES: Sparkles,
      ALERT: AlertCircle,
      CHECK: Check,
      INFO: Info,
      GIFT: Gift,
      STAR: Star,
      USER: User
    }
    
    const IconComponent = iconMap[iconName] || Bell
    return <IconComponent className="w-5 h-5" />
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-600'
      case 'warning': return 'bg-yellow-100 text-yellow-600'
      case 'error': return 'bg-red-100 text-red-600'
      default: return 'bg-blue-100 text-blue-600'
    }
  }

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
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
          <div className="absolute right-0 top-16 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Notificações</h3>
                <p className="text-xs text-gray-500">{unreadCount} não lida(s)</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs text-pink-600 font-medium hover:text-pink-700"
                >
                  Expandir
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-gray-600 font-medium hover:text-gray-800"
                  >
                    Marcar todas
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 scrollbar-hide">
              {loading ? (
                <div className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-3"></div>
                  <p className="text-gray-500">Carregando...</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notif.read ? 'bg-pink-50/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notif.type)}`}>
                          {getIcon(notif.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {notif.title}
                              {!notif.read && (
                                <span className="w-2 h-2 bg-pink-600 rounded-full inline-block ml-2" />
                              )}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteNotification(notif.id)
                              }}
                              className="p-1 hover:bg-gray-200 rounded-full flex-shrink-0"
                            >
                              <X className="w-3 h-3 text-gray-500" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma notificação</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal - Expanded View */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Todas as Notificações</h2>
                <p className="text-sm text-gray-500">{unreadCount} não lida(s)</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-900" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-6 py-5 hover:bg-gray-50 transition-colors ${
                        !notif.read ? 'bg-pink-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notif.type)}`}>
                          {getIcon(notif.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-semibold text-gray-900">
                              {notif.title}
                              {!notif.read && (
                                <span className="w-2 h-2 bg-pink-600 rounded-full inline-block ml-2" />
                              )}
                            </h4>
                            <button
                              onClick={() => handleDeleteNotification(notif.id)}
                              className="p-1 hover:bg-gray-200 rounded-full"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                          <p className="text-gray-600 mb-2">{notif.message}</p>
                          <div className="flex items-center space-x-3">
                            <p className="text-xs text-gray-500">{notif.time}</p>
                            {!notif.read && (
                              <button
                                onClick={() => markAsRead(notif.id)}
                                className="text-xs text-pink-600 font-medium hover:text-pink-700"
                              >
                                Marcar como lida
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-24 text-center">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Nenhuma notificação</p>
                  <p className="text-gray-400 text-sm mt-2">Você está em dia! 🎉</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {notifications.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-gray-600 font-medium hover:text-gray-800"
                >
                  Marcar todas como lidas
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-600 font-medium hover:text-red-700"
                >
                  Limpar tudo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}


