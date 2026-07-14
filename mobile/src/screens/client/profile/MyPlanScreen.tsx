import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { useCommercial } from '../../../contexts/CommercialContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import {
  cancelSubscription,
  changePlan,
  createCheckoutSession,
  createPortalSession,
  getPaymentHistory,
  getPaymentMethods,
  pauseSubscription,
  reactivateSubscription,
} from '../../../lib/api';
import { getApiErrorMessage, type PaymentHistoryItem, type PaymentMethod, type Plan } from '../../../types/commercial';

export function MyPlanScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { plans, subscription, refreshing, refresh } = useCommercial();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    if (!user) return;
    setLoadingPayments(true);
    try {
      const [nextMethods, nextPayments] = await Promise.all([getPaymentMethods(user.id), getPaymentHistory(user.id)]);
      setMethods(nextMethods);
      setPayments(nextPayments);
    } catch {
      // A tela de plano continua funcional mesmo se o Stripe estiver indisponível.
    } finally {
      setLoadingPayments(false);
    }
  }, [user]);

  useEffect(() => { void loadPayments(); }, [loadPayments, subscription?.id]);

  const run = async (key: string, action: () => Promise<any>, success: string) => {
    setBusy(key);
    try {
      await action();
      await refresh();
      await loadPayments();
      Alert.alert('Tudo certo', success);
    } catch (error) {
      Alert.alert('Não foi possível concluir', getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const openCheckout = async (plan: Plan) => {
    if (!user) return;
    setBusy(plan.id);
    try {
      const result = await createCheckoutSession(user.id, plan.id);
      await Linking.openURL(result.url);
      Alert.alert('Confirmação em andamento', 'Conclua o pagamento no Stripe e volte ao app. Atualizaremos seu plano após a confirmação do webhook.');
      await refresh();
    } catch (error) {
      Alert.alert('Checkout indisponível', getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const selectPlan = (plan: Plan) => {
    if (!user) return;
    if (!subscription || subscription.status === 'CANCELED') return void openCheckout(plan);
    if (subscription.planId === plan.id) return;
    Alert.alert('Trocar plano', `Deseja mudar de ${subscription.plan.name} para ${plan.name}?`, [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Confirmar troca', onPress: () => void run(plan.id, () => changePlan(user.id, plan.id), `Seu plano agora é ${plan.name}.`) },
    ]);
  };

  const managePayment = async () => {
    if (!user) return;
    setBusy('portal');
    try {
      const result = await createPortalSession(user.id);
      await Linking.openURL(result.url);
      await loadPayments();
    } catch (error) {
      Alert.alert('Portal indisponível', getApiErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const requestCancel = () => {
    if (!user) return;
    Alert.alert('Cancelar plano', 'Seu acesso permanece até o fim do período já pago. Deseja continuar?', [
      { text: 'Manter plano', style: 'cancel' },
      { text: 'Cancelar assinatura', style: 'destructive', onPress: () => void run('cancel', () => cancelSubscription(user.id, 'Cancelado pelo aplicativo'), 'Seu cancelamento foi registrado.') },
    ]);
  };

  const active = subscription && subscription.status !== 'CANCELED';
  const colors = subscription?.plan.tier === 'GOLD' ? ['#8b5cf6', '#7c3aed'] : subscription?.plan.tier === 'SILVER' ? ['#64748b', '#475569'] : ['#d97706', '#b45309'];

  return (
    <View style={styles.container}>
      <ScreenHeader><TouchableOpacity onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity><Text style={styles.headerTitle}>Meu Plano</Text><TouchableOpacity onPress={refresh} style={styles.back}><Ionicons name="refresh" size={21} color="#ec4899" /></TouchableOpacity></ScreenHeader>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ec4899" />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {subscription ? (
          <LinearGradient colors={colors as [string, string]} style={styles.planCard}>
            <View style={styles.planHeader}><Text style={styles.planName}>{tierEmoji(subscription.plan.tier)} {subscription.plan.name}</Text><View style={styles.badge}><Text style={styles.badgeText}>{statusLabel(subscription.status)}</Text></View></View>
            <Text style={styles.planDescription}>{subscription.plan.description}</Text>
            <Text style={styles.usageLabel}>Tratamentos usados neste mês</Text>
            <View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(100, subscription.currentMonthUsage.totalTreatments / subscription.plan.maxTreatmentsPerMonth * 100)}%` }]} /></View>
            <View style={styles.usageRow}><Text style={styles.usage}>{subscription.currentMonthUsage.totalTreatments}/{subscription.plan.maxTreatmentsPerMonth} usados</Text><Text style={styles.usage}>{Math.max(0, subscription.remaining.thisMonth)} restantes</Text></View>
            <Text style={styles.price}>{money(subscription.plan.price)}<Text style={styles.perMonth}>/mês</Text></Text>
            {subscription.status === 'CANCELED' && subscription.endDate ? <Text style={styles.accessUntil}>Acesso até {new Date(subscription.endDate).toLocaleDateString('pt-BR')}</Text> : null}
          </LinearGradient>
        ) : (
          <View style={styles.noPlan}><Ionicons name="sparkles-outline" size={44} color="#ec4899" /><Text style={styles.noPlanTitle}>Escolha seu plano ideal</Text><Text style={styles.noPlanText}>Tenha tratamentos mensais e acompanhe tudo pelo app.</Text></View>
        )}

        <SectionTitle title={subscription ? 'Gerenciar assinatura' : 'Planos disponíveis'} />
        <View style={styles.planList}>{plans.map((plan) => <PlanOption key={plan.id} plan={plan} current={subscription?.planId === plan.id && subscription.status !== 'CANCELED'} loading={busy === plan.id} onPress={() => selectPlan(plan)} />)}</View>

        {subscription ? <>
          <SectionTitle title="Assinatura" />
          <View style={styles.actionCard}>
            {subscription.status === 'PAUSED' ? <Action icon="play-circle-outline" title="Reativar plano" subtitle="Voltar a usar seus benefícios" onPress={() => user && run('reactivate', () => reactivateSubscription(user.id), 'Seu plano está ativo novamente.')} loading={busy === 'reactivate'} /> : null}
            {subscription.status === 'ACTIVE' ? <Action icon="pause-circle-outline" title="Pausar plano" subtitle="Interromper temporariamente" onPress={() => user && run('pause', () => pauseSubscription(user.id), 'Seu plano foi pausado.')} loading={busy === 'pause'} /> : null}
            {subscription.status === 'CANCELED' ? <Action icon="refresh-circle-outline" title="Assinar novamente" subtitle="Abrir checkout do plano atual" onPress={() => openCheckout(subscription.plan)} loading={busy === subscription.plan.id} /> : null}
            {subscription.status !== 'CANCELED' ? <Action icon="close-circle-outline" title="Cancelar assinatura" subtitle="Manter acesso até o fim do período pago" danger onPress={requestCancel} loading={busy === 'cancel'} /> : null}
          </View>
        </> : null}

        <SectionTitle title="Forma de pagamento" />
        <View style={styles.whiteCard}>
          {loadingPayments ? <ActivityIndicator color="#ec4899" /> : methods.length ? methods.slice(0, 2).map((method) => <View key={method.id} style={styles.paymentMethod}><Ionicons name="card" size={28} color="#6366f1" /><View style={{ flex: 1 }}><Text style={styles.methodTitle}>{(method.brand || 'Cartão').toUpperCase()} •••• {method.last4}</Text><Text style={styles.methodSubtitle}>Validade {String(method.expMonth).padStart(2, '0')}/{String(method.expYear).slice(-2)}{method.isDefault ? ' • Principal' : ''}</Text></View></View>) : <Text style={styles.emptyText}>Nenhum cartão salvo no Stripe.</Text>}
          {subscription ? <TouchableOpacity style={styles.portalButton} onPress={managePayment} disabled={busy === 'portal'}>{busy === 'portal' ? <ActivityIndicator color="#ec4899" /> : <><Ionicons name="open-outline" size={18} color="#ec4899" /><Text style={styles.portalText}>Gerenciar no portal seguro</Text></>}</TouchableOpacity> : null}
        </View>

        <SectionTitle title="Últimos pagamentos" />
        <View style={styles.whiteCard}>{loadingPayments ? <ActivityIndicator color="#ec4899" /> : payments.length ? payments.slice(0, 5).map((payment) => <View key={payment.id} style={styles.paymentItem}><View style={[styles.paymentIcon, { backgroundColor: payment.status === 'paid' || payment.status === 'succeeded' ? '#d1fae5' : '#fef3c7' }]}><Ionicons name={payment.status === 'paid' || payment.status === 'succeeded' ? 'checkmark' : 'time-outline'} size={19} color={payment.status === 'paid' || payment.status === 'succeeded' ? '#059669' : '#d97706'} /></View><View style={{ flex: 1 }}><Text style={styles.methodTitle}>{payment.description}</Text><Text style={styles.methodSubtitle}>{new Date(payment.paidAt || payment.createdAt).toLocaleDateString('pt-BR')}</Text></View><Text style={styles.paymentValue}>{money(payment.amount)}</Text></View>) : <Text style={styles.emptyText}>Seu histórico de pagamentos aparecerá aqui.</Text>}</View>
      </ScrollView>
    </View>
  );
}

function PlanOption({ plan, current, loading, onPress }: { plan: Plan; current?: boolean; loading?: boolean; onPress: () => void }) { return <TouchableOpacity disabled={current || loading} style={[styles.option, current && styles.optionCurrent]} onPress={onPress}><View style={styles.optionTop}><Text style={styles.optionName}>{tierEmoji(plan.tier)} {plan.name}</Text>{current ? <Text style={styles.current}>ATUAL</Text> : null}</View><Text style={styles.optionDesc} numberOfLines={2}>{plan.description}</Text><View style={styles.optionBottom}><Text style={styles.optionLimit}>Até {plan.maxTreatmentsPerMonth} tratamentos/mês</Text>{loading ? <ActivityIndicator color="#ec4899" /> : <Text style={styles.optionPrice}>{money(plan.price)}</Text>}</View></TouchableOpacity>; }
function Action({ icon, title, subtitle, onPress, danger, loading }: { icon: any; title: string; subtitle: string; onPress: () => void; danger?: boolean; loading?: boolean }) { return <TouchableOpacity onPress={onPress} style={styles.action}>{loading ? <ActivityIndicator color={danger ? '#ef4444' : '#ec4899'} /> : <Ionicons name={icon} size={25} color={danger ? '#ef4444' : '#ec4899'} />}<View style={{ flex: 1 }}><Text style={[styles.actionTitle, danger && { color: '#ef4444' }]}>{title}</Text><Text style={styles.actionSubtitle}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={20} color="#d1d5db" /></TouchableOpacity>; }
function SectionTitle({ title }: { title: string }) { return <Text style={styles.sectionTitle}>{title}</Text>; }
function money(value: number) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function tierEmoji(tier: string) { return tier === 'GOLD' ? '🥇' : tier === 'SILVER' ? '🥈' : '🥉'; }
function statusLabel(status: string) { return ({ ACTIVE: 'ATIVO', PAUSED: 'PAUSADO', CANCELED: 'CANCELADO', PAST_DUE: 'PAGAMENTO PENDENTE' } as any)[status] || status; }

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#f9fafb' }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 19, fontWeight: '800', color: '#111827' }, content: { padding: 20, paddingBottom: 44 }, planCard: { borderRadius: 22, padding: 22 }, planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, planName: { color: 'white', fontWeight: '800', fontSize: 21, flex: 1 }, badge: { backgroundColor: 'rgba(255,255,255,.22)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }, badgeText: { color: 'white', fontSize: 10, fontWeight: '900' }, planDescription: { color: 'rgba(255,255,255,.82)', marginTop: 10, lineHeight: 19 }, usageLabel: { color: 'white', fontSize: 12, marginTop: 22 }, progress: { height: 8, backgroundColor: 'rgba(255,255,255,.25)', borderRadius: 4, marginTop: 8 }, progressFill: { height: 8, backgroundColor: 'white', borderRadius: 4 }, usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }, usage: { color: 'white', fontSize: 11 }, price: { color: 'white', fontWeight: '900', fontSize: 25, marginTop: 20 }, perMonth: { fontSize: 13, fontWeight: '600' }, accessUntil: { color: 'white', fontSize: 12, marginTop: 6 }, noPlan: { backgroundColor: '#fdf2f8', borderWidth: 1, borderColor: '#fbcfe8', borderRadius: 20, alignItems: 'center', padding: 26 }, noPlanTitle: { fontSize: 21, fontWeight: '800', color: '#111827', marginTop: 12 }, noPlanText: { color: '#6b7280', textAlign: 'center', marginTop: 7 }, sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 26, marginBottom: 12 }, planList: { gap: 12 }, option: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' }, optionCurrent: { borderColor: '#ec4899', backgroundColor: '#fdf2f8' }, optionTop: { flexDirection: 'row', justifyContent: 'space-between' }, optionName: { fontSize: 17, fontWeight: '800', color: '#111827', flex: 1 }, current: { color: '#ec4899', fontSize: 11, fontWeight: '900' }, optionDesc: { color: '#6b7280', lineHeight: 19, marginTop: 7 }, optionBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13 }, optionLimit: { fontSize: 12, color: '#6b7280' }, optionPrice: { fontSize: 17, color: '#ec4899', fontWeight: '900' }, actionCard: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' }, action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }, actionTitle: { color: '#111827', fontWeight: '800' }, actionSubtitle: { color: '#6b7280', fontSize: 12, marginTop: 3 }, whiteCard: { backgroundColor: 'white', borderRadius: 16, padding: 16 }, paymentMethod: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }, methodTitle: { color: '#111827', fontWeight: '700' }, methodSubtitle: { color: '#6b7280', fontSize: 12, marginTop: 3 }, portalButton: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb', paddingTop: 14, marginTop: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, portalText: { color: '#ec4899', fontWeight: '800' }, paymentItem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }, paymentIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, paymentValue: { color: '#111827', fontWeight: '800' }, emptyText: { color: '#6b7280', textAlign: 'center', paddingVertical: 12 } });
