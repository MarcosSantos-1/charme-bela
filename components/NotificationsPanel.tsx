'use client'

import { useState } from 'react'
import { Bell, X, Check, Calendar, CreditCard, Sparkles, AlertCircle } from 'lucide-react'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
  time: string
  read: boolean
  icon: 'calendar' | 'card' | 'sparkles' | 'alert'
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'info',
    title: 'Consulta Confirmada',
    message: 'Sua consulta de Drenagem Linfática foi confirmada para 16/Out às 14:00',
    time: 'Há 2 horas',
    read: false,
    icon: 'calendar'
  },
  {
    id: '2',
    type: 'success',
    title: 'Pagamento Aprovado',
    message: 'Pagamento de R$ 249,90 processado com sucesso. Próxima cobrança: 15/Nov',
    time: 'Ontem',
    read: false,
    icon: 'card'
  },
  {
    id: '3',
    type: 'warning',
    title: 'Lembrete de Consulta',
    message: 'Você tem uma consulta amanhã às 15:30. Massagem Modeladora',
    time: 'Há 1 dia',
    read: true,
    icon: 'alert'
  },
  {
    id: '4',
    type: 'info',
    title: 'Novo Tratamento Disponível',
    message: 'Agora oferecemos Jato de Plasma! Incluído no seu plano Plus Care',
    time: 'Há 3 dias',
    read: true,
    icon: 'sparkles'
  }
]

export default function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [showModal, setShowModal] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'calendar': return <Calendar className="w-5 h-5" />
      case 'card': return <CreditCard className="w-5 h-5" />
      case 'sparkles': return <Sparkles className="w-5 h-5" />
      case 'alert': return <AlertCircle className="w-5 h-5" />
      default: return <Bell className="w-5 h-5" />
    }
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
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                        !notif.read ? 'bg-pink-50/30' : ''
                      }`}
                      onClick={() => markAsRead(notif.id)}
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
                                deleteNotification(notif.id)
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
                              onClick={() => deleteNotification(notif.id)}
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
                  onClick={() => {
                    if (confirm('Tem certeza que deseja limpar todas as notificações?')) {
                      setNotifications([])
                    }
                  }}
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


