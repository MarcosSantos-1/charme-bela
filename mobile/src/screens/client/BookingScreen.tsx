import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCommercial } from '../../contexts/CommercialContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  createAppointment,
  createPaymentSession,
  getAvailableSlots,
  rescheduleAppointment,
} from '../../lib/api';
import { CATEGORY_META, getApiErrorMessage } from '../../types/commercial';

type Props = NativeStackScreenProps<ClientStackParamList, 'Booking'>;
type Step = 'details' | 'date' | 'time' | 'review';

export function BookingScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { services, subscription, vouchers, refresh } = useCommercial();
  const service = services.find((item) => item.id === route.params.serviceId);
  const isRescheduling = Boolean(route.params.appointmentId);
  const [step, setStep] = useState<Step>(isRescheduling ? 'date' : 'details');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchingVoucher = useMemo(() => vouchers.find((voucher) => {
    if (voucher.type === 'FREE_MONTH') return false;
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) return false;
    return voucher.type === 'DISCOUNT' || voucher.anyService || voucher.serviceId === service?.id;
  }), [service?.id, vouchers]);

  const includedInPlan = Boolean(
    subscription?.status === 'ACTIVE' &&
    subscription.remaining.thisMonth > 0 &&
    subscription.plan.services.some((item) => item.id === service?.id),
  );

  const bookingOrigin = matchingVoucher ? 'VOUCHER' : includedInPlan ? 'SUBSCRIPTION' : 'SINGLE';
  const finalPrice = useMemo(() => {
    if (!service) return 0;
    if (matchingVoucher?.type === 'FREE_TREATMENT') return 0;
    if (matchingVoucher?.discountPercent) return Math.max(0, service.price * (1 - matchingVoucher.discountPercent / 100));
    if (matchingVoucher?.discountAmount) return Math.max(0, service.price - matchingVoucher.discountAmount);
    return service.price;
  }, [matchingVoucher, service]);

  useEffect(() => {
    if (!date || !service) return;
    setLoadingSlots(true);
    setError(null);
    setTime('');
    getAvailableSlots(date, service.id)
      .then((result) => {
        setSlots(result.slots || []);
        setBookedSlots(result.bookedSlots || []);
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'Erro ao buscar horários')))
      .finally(() => setLoadingSlots(false));
  }, [date, service]);

  if (!service) {
    return <CenteredMessage title="Serviço indisponível" action={() => navigation.goBack()} />;
  }

  const allSlots = Array.from(new Set([...slots, ...bookedSlots])).sort();
  const minDate = localDateKey(new Date());
  const lastNextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().slice(0, 10);

  const submit = async () => {
    if (!user || !date || !time) return;
    setSubmitting(true);
    setError(null);
    const startTime = `${date}T${time}:00.000Z`;
    try {
      if (route.params.appointmentId) {
        await rescheduleAppointment(route.params.appointmentId, startTime);
        await refresh();
        Alert.alert('Horário alterado', 'Seu agendamento voltou para confirmação da clínica.', [
          { text: 'Ver agenda', onPress: () => navigation.navigate('ClientTabs', { screen: 'Agenda' }) },
        ]);
        return;
      }

      const appointment = await createAppointment({
        userId: user.id,
        serviceId: service.id,
        startTime,
        origin: bookingOrigin,
        voucherId: bookingOrigin === 'VOUCHER' ? matchingVoucher?.id : undefined,
        paymentAmount: bookingOrigin === 'SINGLE' ? finalPrice : undefined,
        notes: '',
      });

      if (bookingOrigin === 'SINGLE' || (bookingOrigin === 'VOUCHER' && finalPrice > 0)) {
        const checkout = await createPaymentSession(
          user.id,
          service.id,
          appointment.id,
          finalPrice,
          finalPrice < service.price ? 'Voucher aplicado no app' : undefined,
        );
        await Linking.openURL(checkout.url);
        await refresh();
        Alert.alert(
          'Pagamento em confirmação',
          'Ao concluir no Stripe, volte ao app. A agenda será atualizada assim que o pagamento for confirmado.',
          [{ text: 'Ver agenda', onPress: () => navigation.navigate('ClientTabs', { screen: 'Agenda' }) }],
        );
        return;
      }

      await refresh();
      Alert.alert('Agendamento solicitado', 'A clínica confirmará seu horário em breve.', [
        { text: 'Ver agenda', onPress: () => navigation.navigate('ClientTabs', { screen: 'Agenda' }) },
      ]);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Não foi possível agendar');
      if (message.toLowerCase().includes('anamnese')) {
        navigation.navigate('AnamnesisBridge', { serviceId: service.id });
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader style={{ borderBottomWidth: 0, paddingHorizontal: 16, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => step === 'details' || isRescheduling ? navigation.goBack() : setStep(previousStep(step))} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isRescheduling ? 'Reagendar' : 'Agendar horário'}</Text>
          <Text style={styles.headerStep}>{stepLabel(step)}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
      </ScreenHeader>
      <View style={styles.progress}><View style={[styles.progressFill, { width: `${progress(step)}%` }]} /></View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'details' && (
          <>
            <View style={styles.heroIcon}><Ionicons name="sparkles" size={34} color="#ec4899" /></View>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.category}>{CATEGORY_META[service.category].label}</Text>
            <Text style={styles.description}>{service.description}</Text>
            <View style={styles.summaryRow}>
              <Summary icon="time-outline" label="Duração" value={`${service.duration} min`} />
              <Summary icon="cash-outline" label="Valor" value={bookingOrigin === 'SUBSCRIPTION' ? 'Incluso' : finalPrice === 0 ? 'Grátis' : currency(finalPrice)} />
            </View>
            <View style={styles.benefitBox}>
              <Ionicons name={bookingOrigin === 'SUBSCRIPTION' ? 'ribbon-outline' : bookingOrigin === 'VOUCHER' ? 'gift-outline' : 'card-outline'} size={22} color="#ec4899" />
              <Text style={styles.benefitText}>{originLabel(bookingOrigin)}</Text>
            </View>
            <PrimaryButton title="Escolher data" onPress={() => setStep('date')} />
          </>
        )}

        {step === 'date' && (
          <>
            <Text style={styles.sectionTitle}>Escolha o melhor dia</Text>
            <View style={styles.calendarCard}>
              <Calendar
                minDate={minDate}
                maxDate={lastNextMonth}
                onDayPress={(day) => { setDate(day.dateString); setStep('time'); }}
                markedDates={date ? { [date]: { selected: true, selectedColor: '#ec4899' } } : {}}
                theme={{ arrowColor: '#ec4899', todayTextColor: '#ec4899', selectedDayBackgroundColor: '#ec4899' }}
              />
            </View>
          </>
        )}

        {step === 'time' && (
          <>
            <Text style={styles.sectionTitle}>Horários de {formatDate(date)}</Text>
            {loadingSlots ? <ActivityIndicator size="large" color="#ec4899" style={{ marginTop: 48 }} /> : allSlots.length === 0 ? (
              <CenteredMessage title="Nenhum horário disponível" action={() => setStep('date')} compact />
            ) : (
              <View style={styles.slots}>
                {allSlots.map((slot) => {
                  const booked = bookedSlots.includes(slot) || !slots.includes(slot);
                  return (
                    <TouchableOpacity key={slot} disabled={booked} onPress={() => setTime(slot)} style={[styles.slot, booked && styles.slotDisabled, time === slot && styles.slotSelected]}>
                      <Text style={[styles.slotText, booked && styles.slotTextDisabled, time === slot && styles.slotTextSelected]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {time ? <PrimaryButton title="Revisar agendamento" onPress={() => setStep('review')} /> : null}
          </>
        )}

        {step === 'review' && (
          <>
            <Text style={styles.sectionTitle}>Revise antes de confirmar</Text>
            <View style={styles.reviewCard}>
              <ReviewRow icon="sparkles-outline" label="Tratamento" value={service.name} />
              <ReviewRow icon="calendar-outline" label="Data" value={formatDate(date)} />
              <ReviewRow icon="time-outline" label="Horário" value={time} />
              {!isRescheduling && <ReviewRow icon="wallet-outline" label="Pagamento" value={originLabel(bookingOrigin)} />}
              {!isRescheduling && bookingOrigin !== 'SUBSCRIPTION' && <ReviewRow icon="cash-outline" label="Total" value={currency(finalPrice)} />}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton title={isRescheduling ? 'Confirmar novo horário' : bookingOrigin === 'SINGLE' || finalPrice > 0 && bookingOrigin === 'VOUCHER' ? 'Ir para pagamento' : 'Confirmar agendamento'} onPress={submit} loading={submitting} />
          </>
        )}
        {error && step !== 'review' ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

function PrimaryButton({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  return <TouchableOpacity disabled={loading} style={[styles.primaryButton, loading && { opacity: 0.7 }]} onPress={onPress}>{loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{title}</Text>}</TouchableOpacity>;
}
function Summary({ icon, label, value }: { icon: any; label: string; value: string }) { return <View style={styles.summary}><Ionicons name={icon} size={22} color="#ec4899" /><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>; }
function ReviewRow({ icon, label, value }: { icon: any; label: string; value: string }) { return <View style={styles.reviewRow}><Ionicons name={icon} size={21} color="#ec4899" /><View style={{ flex: 1 }}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value}</Text></View></View>; }
function CenteredMessage({ title, action, compact }: { title: string; action: () => void; compact?: boolean }) { return <View style={[styles.centered, compact && { minHeight: 180 }]}><Ionicons name="calendar-outline" size={50} color="#d1d5db" /><Text style={styles.centeredText}>{title}</Text><TouchableOpacity onPress={action}><Text style={styles.link}>Voltar</Text></TouchableOpacity></View>; }
function previousStep(step: Step): Step { return step === 'review' ? 'time' : step === 'time' ? 'date' : 'details'; }
function progress(step: Step) { return ({ details: 25, date: 50, time: 75, review: 100 })[step]; }
function stepLabel(step: Step) { return ({ details: 'Detalhes', date: 'Escolha a data', time: 'Escolha o horário', review: 'Confirmação' })[step]; }
function originLabel(origin: string) { return origin === 'SUBSCRIPTION' ? 'Incluso no seu plano' : origin === 'VOUCHER' ? 'Voucher aplicado' : 'Pagamento avulso'; }
function currency(value: number) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatDate(value: string) { if (!value) return ''; return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' }); }
function localDateKey(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' }, iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }, headerCenter: { flex: 1, alignItems: 'center' }, headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' }, headerStep: { fontSize: 12, color: '#6b7280', marginTop: 2 }, progress: { height: 4, backgroundColor: '#fce7f3' }, progressFill: { height: 4, backgroundColor: '#ec4899' }, content: { padding: 22, paddingBottom: 44 }, heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fce7f3', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 20 }, serviceName: { fontSize: 25, fontWeight: '800', textAlign: 'center', color: '#111827', marginTop: 18 }, category: { color: '#ec4899', fontWeight: '700', textAlign: 'center', marginTop: 5 }, description: { fontSize: 15, lineHeight: 23, color: '#4b5563', textAlign: 'center', marginVertical: 22 }, summaryRow: { flexDirection: 'row', gap: 12 }, summary: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6' }, summaryLabel: { fontSize: 12, color: '#6b7280', marginTop: 8 }, summaryValue: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 3 }, benefitBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fdf2f8', borderRadius: 14, padding: 15, marginTop: 14 }, benefitText: { color: '#9d174d', fontWeight: '700' }, primaryButton: { backgroundColor: '#ec4899', borderRadius: 14, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, primaryButtonText: { color: 'white', fontWeight: '800', fontSize: 16 }, sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 18 }, calendarCard: { backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', padding: 6, borderWidth: 1, borderColor: '#e5e7eb' }, slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, slot: { width: '30%', flexGrow: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }, slotSelected: { backgroundColor: '#ec4899', borderColor: '#ec4899' }, slotDisabled: { backgroundColor: '#f3f4f6' }, slotText: { fontWeight: '700', color: '#111827' }, slotTextSelected: { color: 'white' }, slotTextDisabled: { color: '#c4c8ce', textDecorationLine: 'line-through' }, reviewCard: { backgroundColor: 'white', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e5e7eb' }, reviewRow: { flexDirection: 'row', gap: 13, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }, reviewLabel: { fontSize: 12, color: '#6b7280' }, reviewValue: { fontSize: 15, color: '#111827', fontWeight: '700', marginTop: 2 }, error: { color: '#b91c1c', backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginTop: 16, textAlign: 'center' }, centered: { minHeight: 500, alignItems: 'center', justifyContent: 'center', padding: 24 }, centeredText: { fontSize: 18, color: '#6b7280', marginTop: 12, marginBottom: 10 }, link: { color: '#ec4899', fontWeight: '800' },
});
