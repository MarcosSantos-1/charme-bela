import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  type: 'appointment' | 'payment' | 'plan' | 'promo';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'appointment',
    title: 'Lembrete de Agendamento',
    message: 'Você tem um agendamento amanhã às 14:00 - Limpeza de Pele',
    time: '2h atrás',
    read: false
  },
  {
    id: '2',
    type: 'payment',
    title: 'Pagamento Confirmado',
    message: 'Seu pagamento de R$ 300,00 foi confirmado com sucesso',
    time: '1 dia atrás',
    read: false
  },
  {
    id: '3',
    type: 'plan',
    title: 'Plano Renovado',
    message: 'Seu plano Premium Experience foi renovado automaticamente',
    time: '3 dias atrás',
    read: true
  },
  {
    id: '4',
    type: 'promo',
    title: 'Promoção Especial! 🎉',
    message: 'Ganhe 20% de desconto em tratamentos faciais este mês',
    time: '5 dias atrás',
    read: true
  },
];

interface NotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ visible, onClose }: NotificationsPanelProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment': return { name: 'calendar', color: '#3b82f6', bg: '#dbeafe' };
      case 'payment': return { name: 'card', color: '#10b981', bg: '#d1fae5' };
      case 'plan': return { name: 'star', color: '#f59e0b', bg: '#fef3c7' };
      case 'promo': return { name: 'pricetag', color: '#ec4899', bg: '#fce7f3' };
      default: return { name: 'notifications', color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Notificações</Text>
              {unreadCount > 0 && (
                <Text style={styles.unreadText}>
                  {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
            {MOCK_NOTIFICATIONS.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>
                  Nenhuma notificação
                </Text>
              </View>
            ) : (
              MOCK_NOTIFICATIONS.map(notification => {
                const icon = getIcon(notification.type);
                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.notificationItemUnread
                    ]}
                  >
                    <View style={[styles.notificationIcon, { backgroundColor: icon.bg }]}>
                      <Ionicons name={icon.name as any} size={24} color={icon.color} />
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                        {!notification.read && <View style={styles.unreadDot} />}
                      </Text>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTime}>{notification.time}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Actions */}
          {MOCK_NOTIFICATIONS.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerButton}>
                <Text style={styles.footerButtonText}>Marcar todas como lidas</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  unreadText: {
    fontSize: 13,
    color: '#6b7280',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notificationItemUnread: {
    backgroundColor: '#fef3f8',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ec4899',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ec4899',
  },
});



