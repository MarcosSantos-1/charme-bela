import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../components/ScreenHeader';

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={styles.placeholder} />
      </ScreenHeader>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações Push</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Todas as notificações</Text>
              <Text style={styles.settingSubtitle}>Ativar todas as notificações do app</Text>
            </View>
            <Switch value={true} trackColor={{ false: '#e5e7eb', true: '#ec4899' }} />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Lembretes de agendamento</Text>
              <Text style={styles.settingSubtitle}>Notificar sobre próximos agendamentos</Text>
            </View>
            <Switch value={true} trackColor={{ false: '#e5e7eb', true: '#ec4899' }} />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Promoções e ofertas</Text>
              <Text style={styles.settingSubtitle}>Receber ofertas especiais</Text>
            </View>
            <Switch value={false} trackColor={{ false: '#e5e7eb', true: '#ec4899' }} />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Atualizações do plano</Text>
              <Text style={styles.settingSubtitle}>Informações sobre sua assinatura</Text>
            </View>
            <Switch value={true} trackColor={{ false: '#e5e7eb', true: '#ec4899' }} />
          </View>
        </View>

        {/* Email Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações por Email</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Confirmação de agendamento</Text>
              <Text style={styles.settingSubtitle}>Email de confirmação</Text>
            </View>
            <Switch value={true} trackColor={{ false: '#e5e7eb', true: '#ec4899' }} />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Lembretes por email</Text>
              <Text style={styles.settingSubtitle}>24h antes do agendamento</Text>
            </View>
            <Switch value={true} trackColor={{ false: '#e5e7eb', true: '#ec4899' }} />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Newsletter</Text>
              <Text style={styles.settingSubtitle}>Dicas de beleza e novidades</Text>
            </View>
            <Switch value={false} trackColor={{ false: '#e5e7eb', true: '#ec4899' }} />
          </View>
        </View>

        {/* SMS Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações por SMS</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Lembretes por SMS</Text>
              <Text style={styles.settingSubtitle}>2h antes do agendamento</Text>
            </View>
            <Switch value={true} trackColor={{ false: '#e5e7eb', true: '#ec4899' }} />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horário Silencioso</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Horário silencioso</Text>
              <Text style={styles.settingSubtitle}>22h às 8h</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Clear All */}
        <TouchableOpacity style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Limpar todas as notificações</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    padding: 20,
    paddingBottom: 12,
    backgroundColor: '#f9fafb',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  clearButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
