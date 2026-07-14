import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCommercial } from '../../contexts/CommercialContext';
import { cancelAppointment } from '../../lib/api';
import { getApiErrorMessage, type Appointment } from '../../types/commercial';

export function AgendaScreen() {
  const navigation = useNavigation<any>();
  const { appointments, loading, refreshing, error, refresh } = useCommercial();
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [selected, setSelected] = useState<Appointment | null>(null);

  const now = new Date();
  const upcoming = appointments.filter((item) => !['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(item.status) && wallDate(item.startTime) >= now);
  const history = appointments.filter((item) => !upcoming.includes(item)).slice().reverse();
  const visible = selectedDate
    ? appointments.filter((item) => datePart(item.startTime) === selectedDate)
    : activeTab === 'upcoming' ? upcoming : history;

  const markedDates = useMemo(() => {
    const result = appointments.reduce<Record<string, any>>((result, item) => {
    const date = datePart(item.startTime);
    result[date] = { marked: true, dotColor: statusColor(item.status) };
    return result;
    }, {});
    if (selectedDate) result[selectedDate] = { ...(result[selectedDate] || {}), selected: true, selectedColor: '#ec4899' };
    return result;
  }, [appointments, selectedDate]);

  const handleCancel = (appointment: Appointment) => {
    Alert.alert('Cancelar agendamento', 'A regra de antecedência e eventual reembolso serão aplicados pela clínica. Deseja continuar?', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar horário', style: 'destructive', onPress: async () => {
        try {
          const result = await cancelAppointment(appointment.id, 'Cancelado pelo aplicativo');
          setSelected(null);
          await refresh();
          Alert.alert('Agendamento cancelado', result.message || 'Seu horário foi cancelado.');
        } catch (requestError) {
          Alert.alert('Não foi possível cancelar', getApiErrorMessage(requestError));
        }
      } },
    ]);
  };

  const emptyAction = () => {
    if (!selectedDate && activeTab === 'history') {
      navigation.navigate('Profile', { openScreen: 'history' });
      return;
    }
    navigation.navigate('Services');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>Minha Agenda</Text><Text style={styles.headerSubtitle}>Gerencie seus agendamentos</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ec4899" />}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('Services')}><Ionicons name="add-circle-outline" size={23} color="white" /><Text style={styles.newButtonText}>Novo Agendamento</Text></TouchableOpacity>
          <View style={styles.calendarCard}>
            <Calendar onDayPress={(day) => setSelectedDate(selectedDate === day.dateString ? '' : day.dateString)} markedDates={markedDates} theme={{ arrowColor: '#ec4899', todayTextColor: '#ec4899', selectedDayBackgroundColor: '#ec4899', dotColor: '#ec4899' }} />
          </View>
          {selectedDate ? <View style={styles.selectionHeader}><Text style={styles.sectionTitle}>{longDate(selectedDate)}</Text><TouchableOpacity onPress={() => setSelectedDate('')}><Text style={styles.clear}>Limpar</Text></TouchableOpacity></View> : (
            <View style={styles.tabs}>
              <Tab title={`Próximos (${upcoming.length})`} active={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
              <Tab title="Histórico" active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
            </View>
          )}

          {loading ? <ActivityIndicator size="large" color="#ec4899" style={{ marginTop: 45 }} /> : error && appointments.length === 0 ? <Empty icon="cloud-offline-outline" title={error} action={refresh} /> : visible.length === 0 ? <Empty icon="calendar-outline" title={selectedDate ? 'Nenhum agendamento neste dia' : activeTab === 'upcoming' ? 'Nenhum horário agendado' : 'Seu histórico aparecerá aqui'} action={emptyAction} /> : (
            <View style={styles.list}>{visible.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onPress={() => setSelected(appointment)} />)}</View>
          )}
        </View>
      </ScrollView>

      <AppointmentDetail appointment={selected} onClose={() => setSelected(null)} onCancel={handleCancel} onReschedule={(appointment) => { setSelected(null); navigation.navigate('Booking', { serviceId: appointment.serviceId, appointmentId: appointment.id }); }} />
    </SafeAreaView>
  );
}

function AppointmentCard({ appointment, onPress }: { appointment: Appointment; onPress: () => void }) {
  const date = datePart(appointment.startTime);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.dateBox}><Text style={styles.day}>{date.slice(8, 10)}</Text><Text style={styles.month}>{shortMonth(date)}</Text></View>
      <View style={styles.cardInfo}><Text style={styles.service} numberOfLines={1}>{appointment.service.name}</Text><View style={styles.meta}><Ionicons name="time-outline" size={15} color="#6b7280" /><Text style={styles.metaText}>{timePart(appointment.startTime)}</Text><View style={[styles.dot, { backgroundColor: statusColor(appointment.status) }]} /><Text style={[styles.status, { color: statusColor(appointment.status) }]}>{statusLabel(appointment.status)}</Text></View></View>
      <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
    </TouchableOpacity>
  );
}

function AppointmentDetail({ appointment, onClose, onCancel, onReschedule }: { appointment: Appointment | null; onClose: () => void; onCancel: (item: Appointment) => void; onReschedule: (item: Appointment) => void }) {
  if (!appointment) return null;
  const actionable = ['PENDING', 'CONFIRMED'].includes(appointment.status) && wallDate(appointment.startTime) > new Date();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}><TouchableOpacity style={styles.backdrop} onPress={onClose} /><View style={styles.sheet}>
        <View style={styles.handle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Detalhes do horário</Text><TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={30} color="#9ca3af" /></TouchableOpacity></View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor(appointment.status)}18` }]}><View style={[styles.dot, { backgroundColor: statusColor(appointment.status) }]} /><Text style={[styles.status, { color: statusColor(appointment.status) }]}>{statusLabel(appointment.status)}</Text></View>
        <Text style={styles.detailService}>{appointment.service.name}</Text>
        <Detail icon="calendar-outline" text={longDate(datePart(appointment.startTime))} /><Detail icon="time-outline" text={`${timePart(appointment.startTime)} • ${appointment.service.duration} minutos`} /><Detail icon="wallet-outline" text={originLabel(appointment.origin, appointment.paymentStatus)} />
        {actionable ? <View style={styles.actions}><TouchableOpacity style={styles.reschedule} onPress={() => onReschedule(appointment)}><Text style={styles.rescheduleText}>Reagendar</Text></TouchableOpacity><TouchableOpacity style={styles.cancel} onPress={() => onCancel(appointment)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity></View> : null}
      </View></View>
    </Modal>
  );
}

function Detail({ icon, text }: { icon: any; text: string }) { return <View style={styles.detailRow}><Ionicons name={icon} size={20} color="#ec4899" /><Text style={styles.detailText}>{text}</Text></View>; }
function Tab({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text></TouchableOpacity>; }
function Empty({ icon, title, action }: { icon: any; title: string; action: () => void }) { return <View style={styles.empty}><Ionicons name={icon} size={52} color="#d1d5db" /><Text style={styles.emptyText}>{title}</Text><TouchableOpacity onPress={action}><Text style={styles.clear}>Tentar/agendar agora</Text></TouchableOpacity></View>; }
function datePart(value: string) { return value.slice(0, 10); }
function timePart(value: string) { return value.slice(11, 16); }
function wallDate(value: string) { return new Date(`${datePart(value)}T${timePart(value)}:00`); }
function longDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); }
function shortMonth(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''); }
function statusColor(status: string) { return status === 'CONFIRMED' || status === 'COMPLETED' ? '#10b981' : status === 'PENDING' ? '#f59e0b' : '#ef4444'; }
function statusLabel(status: string) { return ({ PENDING: 'Pendente', CONFIRMED: 'Confirmado', COMPLETED: 'Concluído', CANCELED: 'Cancelado', NO_SHOW: 'Não compareceu' } as any)[status] || status; }
function originLabel(origin: string, payment: string | null) { if (origin === 'SUBSCRIPTION') return 'Descontado do plano'; if (origin === 'VOUCHER') return 'Voucher aplicado'; if (origin === 'SINGLE') return payment === 'PAID' ? 'Pagamento confirmado' : 'Pagamento pendente'; return 'Criado pela clínica'; }

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#f9fafb' }, header: { backgroundColor: 'white', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }, headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827' }, headerSubtitle: { fontSize: 15, color: '#6b7280', marginTop: 4 }, content: { padding: 20, paddingBottom: 38 }, newButton: { backgroundColor: '#ec4899', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }, newButtonText: { color: 'white', fontSize: 16, fontWeight: '800' }, calendarCard: { backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }, tabs: { flexDirection: 'row', backgroundColor: '#e5e7eb', padding: 4, borderRadius: 13, marginVertical: 20 }, tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 }, tabActive: { backgroundColor: 'white' }, tabText: { color: '#6b7280', fontWeight: '700' }, tabTextActive: { color: '#ec4899' }, selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 20 }, sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textTransform: 'capitalize' }, clear: { color: '#ec4899', fontWeight: '800' }, list: { gap: 12 }, card: { backgroundColor: 'white', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' }, dateBox: { width: 54, height: 58, borderRadius: 12, backgroundColor: '#fdf2f8', alignItems: 'center', justifyContent: 'center', marginRight: 13 }, day: { fontSize: 21, color: '#ec4899', fontWeight: '800' }, month: { color: '#9d174d', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, cardInfo: { flex: 1 }, service: { color: '#111827', fontSize: 16, fontWeight: '800' }, meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }, metaText: { color: '#6b7280', fontSize: 13 }, dot: { width: 7, height: 7, borderRadius: 4, marginLeft: 4 }, status: { fontSize: 12, fontWeight: '800' }, empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 }, emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginVertical: 12 }, overlay: { flex: 1, justifyContent: 'flex-end' }, backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.45)' }, sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36 }, handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 18 }, sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111827' }, statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, marginTop: 16 }, detailService: { fontSize: 23, fontWeight: '800', color: '#111827', marginVertical: 20 }, detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }, detailText: { color: '#4b5563', fontSize: 15 }, actions: { flexDirection: 'row', gap: 12, marginTop: 16 }, reschedule: { flex: 1, backgroundColor: '#ec4899', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }, rescheduleText: { color: 'white', fontWeight: '800' }, cancel: { flex: 1, borderWidth: 1, borderColor: '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }, cancelText: { color: '#ef4444', fontWeight: '800' } });
