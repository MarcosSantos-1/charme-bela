import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useCommercial } from '../../../contexts/CommercialContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import {
  creditCard3dSource,
  medalBronzeSource,
  medalGoldSource,
  medalSilverSource,
} from '../../../assets/brandAssets';
import {
  cancelSubscription,
  changePlan,
  createCheckoutSession,
  createPortalSession,
  getPaymentHistory,
  getPaymentMethods,
  reactivateSubscription,
} from '../../../lib/api';
import {
  CATEGORY_META,
  getApiErrorMessage,
  type PaymentHistoryItem,
  type PaymentMethod,
  type Plan,
  type ServiceCategory,
} from '../../../types/commercial';
import { brand } from '../../../theme/brand';

const TIER_MEDAL = {
  BRONZE: medalBronzeSource,
  SILVER: medalSilverSource,
  GOLD: medalGoldSource,
} as const;

const TIER_ACCENT = {
  BRONZE: '#b45309',
  SILVER: '#64748b',
  GOLD: brand.gold,
} as const;

export function MyPlanScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { plans, subscription, refreshing, refresh } = useCommercial();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

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

  useEffect(() => {
    void loadPayments();
  }, [loadPayments, subscription?.id]);

  useEffect(() => {
    if (subscription?.planId) {
      setExpandedPlanId(subscription.planId);
    }
  }, [subscription?.planId]);

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
      Alert.alert(
        'Confirmação em andamento',
        'Conclua o pagamento no Stripe e volte ao app. Atualizaremos seu plano após a confirmação do webhook.',
      );
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
      {
        text: 'Confirmar troca',
        onPress: () => void run(plan.id, () => changePlan(user.id, plan.id), `Seu plano agora é ${plan.name}.`),
      },
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
      {
        text: 'Cancelar assinatura',
        style: 'destructive',
        onPress: () =>
          void run('cancel', () => cancelSubscription(user.id, 'Cancelado pelo aplicativo'), 'Seu cancelamento foi registrado.'),
      },
    ]);
  };

  const active = subscription && subscription.status !== 'CANCELED';
  const usagePct = subscription
    ? Math.min(100, (subscription.currentMonthUsage.totalTreatments / subscription.plan.maxTreatmentsPerMonth) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={brand.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Plano</Text>
        <TouchableOpacity onPress={refresh} style={styles.back}>
          <Ionicons name="refresh" size={21} color={brand.rose} />
        </TouchableOpacity>
      </ScreenHeader>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={brand.rose} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {subscription ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Image source={TIER_MEDAL[subscription.plan.tier]} style={styles.heroMedal} resizeMode="contain" />
              <View style={styles.heroMeta}>
                <Text style={styles.heroEyebrow}>Charme & Bela Club</Text>
                <Text style={styles.heroName}>{subscription.plan.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: active ? 'rgba(16,185,129,0.12)' : 'rgba(43,23,33,0.08)' },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: active ? '#059669' : brand.muted },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: active ? '#059669' : brand.muted }]}>
                    {statusLabel(subscription.status)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.heroDescription}>{subscription.plan.description}</Text>

            <View style={styles.usageBlock}>
              <View style={styles.usageHeader}>
                <Text style={styles.usageLabel}>Uso neste mês</Text>
                <Text style={styles.usageCount}>
                  {subscription.currentMonthUsage.totalTreatments}/{subscription.plan.maxTreatmentsPerMonth}
                </Text>
              </View>
              <View style={styles.progress}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${usagePct}%`,
                      backgroundColor: TIER_ACCENT[subscription.plan.tier],
                    },
                  ]}
                />
              </View>
              <Text style={styles.usageRemaining}>
                {Math.max(0, subscription.remaining.thisMonth)} tratamentos restantes
              </Text>
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.price}>
                {money(subscription.plan.price)}
                <Text style={styles.perMonth}>/mês</Text>
              </Text>
              {subscription.status === 'CANCELED' && subscription.endDate ? (
                <Text style={styles.accessUntil}>
                  Acesso até {new Date(subscription.endDate).toLocaleDateString('pt-BR')}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.noPlan}>
            <Image source={medalGoldSource} style={styles.noPlanImage} resizeMode="contain" />
            <Text style={styles.noPlanTitle}>Escolha seu plano</Text>
            <Text style={styles.noPlanText}>
              Tratamentos mensais inclusos, acompanhamento pelo app e acesso ao Charme & Bela Club.
            </Text>
          </View>
        )}

        <SectionTitle title={subscription ? 'Planos disponíveis' : 'Escolha seu plano'} />
        <View style={styles.planList}>
          {plans.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              current={subscription?.planId === plan.id && subscription.status !== 'CANCELED'}
              hasActiveSub={Boolean(active)}
              loading={busy === plan.id}
              expanded={expandedPlanId === plan.id}
              onToggle={() => setExpandedPlanId((id) => (id === plan.id ? null : plan.id))}
              onSelect={() => selectPlan(plan)}
            />
          ))}
        </View>

        {subscription ? (
          <>
            <SectionTitle title="Assinatura" />
            <View style={styles.actionCard}>
              {subscription.status === 'PAUSED' ? (
                <Action
                  icon="play-circle-outline"
                  title="Reativar plano"
                  subtitle="Voltar a usar seus benefícios"
                  onPress={() =>
                    user && run('reactivate', () => reactivateSubscription(user.id), 'Seu plano está ativo novamente.')
                  }
                  loading={busy === 'reactivate'}
                />
              ) : null}
              {subscription.status === 'CANCELED' ? (
                <Action
                  icon="refresh-circle-outline"
                  title="Assinar novamente"
                  subtitle="Abrir checkout do plano atual"
                  onPress={() => openCheckout(subscription.plan)}
                  loading={busy === subscription.plan.id}
                />
              ) : null}
              {subscription.status !== 'CANCELED' ? (
                <Action
                  icon="close-circle-outline"
                  title="Cancelar assinatura"
                  subtitle="Manter acesso até o fim do período pago"
                  danger
                  onPress={requestCancel}
                  loading={busy === 'cancel'}
                />
              ) : null}
            </View>
          </>
        ) : null}

        <SectionTitle title="Forma de pagamento" />
        <View style={styles.whiteCard}>
          {loadingPayments ? (
            <ActivityIndicator color={brand.rose} />
          ) : methods.length ? (
            methods.slice(0, 2).map((method) => (
              <View key={method.id} style={styles.paymentMethod}>
                <Image source={creditCard3dSource} style={styles.card3dIcon} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodTitle}>
                    {(method.brand || 'Cartão').toUpperCase()} •••• {method.last4}
                  </Text>
                  <Text style={styles.methodSubtitle}>
                    Validade {String(method.expMonth).padStart(2, '0')}/{String(method.expYear).slice(-2)}
                    {method.isDefault ? ' • Principal' : ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.paymentMethod}>
              <Image source={creditCard3dSource} style={styles.card3dIcon} resizeMode="contain" />
              <Text style={[styles.emptyText, { flex: 1, textAlign: 'left', paddingVertical: 0 }]}>
                Nenhum cartão salvo no Stripe.
              </Text>
            </View>
          )}
          {subscription ? (
            <TouchableOpacity style={styles.portalButton} onPress={managePayment} disabled={busy === 'portal'}>
              {busy === 'portal' ? (
                <ActivityIndicator color={brand.rose} />
              ) : (
                <>
                  <Ionicons name="open-outline" size={18} color={brand.rose} />
                  <Text style={styles.portalText}>Gerenciar no portal seguro</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        <SectionTitle title="Últimos pagamentos" />
        <View style={styles.whiteCard}>
          {loadingPayments ? (
            <ActivityIndicator color={brand.rose} />
          ) : payments.length ? (
            payments.slice(0, 5).map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View
                  style={[
                    styles.paymentIcon,
                    {
                      backgroundColor:
                        payment.status === 'paid' || payment.status === 'succeeded' ? '#d1fae5' : '#fef3c7',
                    },
                  ]}
                >
                  <Ionicons
                    name={payment.status === 'paid' || payment.status === 'succeeded' ? 'checkmark' : 'time-outline'}
                    size={19}
                    color={payment.status === 'paid' || payment.status === 'succeeded' ? '#059669' : '#d97706'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodTitle}>{payment.description}</Text>
                  <Text style={styles.methodSubtitle}>
                    {new Date(payment.paidAt || payment.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <Text style={styles.paymentValue}>{money(payment.amount)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Seu histórico de pagamentos aparecerá aqui.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function PlanOption({
  plan,
  current,
  hasActiveSub,
  loading,
  expanded,
  onToggle,
  onSelect,
}: {
  plan: Plan;
  current?: boolean;
  hasActiveSub?: boolean;
  loading?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const accent = TIER_ACCENT[plan.tier];
  const services = plan.services || [];

  return (
    <View style={[styles.option, current && styles.optionCurrent]}>
      <View style={styles.optionHeader}>
        <Image source={TIER_MEDAL[plan.tier]} style={styles.optionMedal} resizeMode="contain" />
        <View style={styles.optionHeaderText}>
          <View style={styles.optionTop}>
            <Text style={styles.optionName}>{plan.name}</Text>
            {current ? <Text style={styles.current}>ATUAL</Text> : null}
          </View>
          <Text style={styles.optionDesc} numberOfLines={2}>
            {plan.description}
          </Text>
        </View>
      </View>

      <View style={styles.optionStats}>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Por mês</Text>
          <Text style={[styles.statChipValue, { color: accent }]}>{plan.maxTreatmentsPerMonth}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Serviços</Text>
          <Text style={[styles.statChipValue, { color: accent }]}>{services.length}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.statChipLabel}>Valor</Text>
          <Text style={[styles.statChipValue, { color: accent }]}>{money(plan.price)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.accordionToggle} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.accordionToggleText}>
          {expanded ? 'Ocultar' : 'Ver'} {services.length} tratamentos inclusos
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={brand.rose} />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.accordionBody}>
          {services.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum tratamento listado para este plano.</Text>
          ) : (
            services.map((service) => {
              const meta = CATEGORY_META[service.category as ServiceCategory];
              return (
                <View key={service.id} style={styles.serviceRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.serviceMeta}>
                      {meta ? (
                        <View style={[styles.categoryPill, { backgroundColor: `${meta.color}18` }]}>
                          <Text style={[styles.categoryPillText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.serviceDuration}>{service.duration} min</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : null}

      {!current ? (
        <TouchableOpacity style={styles.selectButton} onPress={onSelect} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.selectButtonText}>
              {hasActiveSub ? 'Trocar para este plano' : 'Assinar este plano'}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.currentButton}>
          <Text style={styles.currentButtonText}>Seu plano atual</Text>
        </View>
      )}
    </View>
  );
}

function Action({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.action}>
      {loading ? (
        <ActivityIndicator color={danger ? '#ef4444' : brand.rose} />
      ) : (
        <Ionicons name={icon} size={25} color={danger ? '#ef4444' : brand.rose} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, danger && { color: '#ef4444' }]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status: string) {
  return (
    (
      {
        ACTIVE: 'Ativo',
        PAUSED: 'Pausado',
        CANCELED: 'Cancelado',
        PAST_DUE: 'Pagamento pendente',
      } as Record<string, string>
    )[status] || status
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: brand.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: brand.ink },
  content: { padding: 20, paddingBottom: 44 },

  heroCard: {
    backgroundColor: brand.white,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroMedal: { width: 88, height: 88 },
  heroMeta: { flex: 1, gap: 4 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: brand.roseDeep,
  },
  heroName: { fontSize: 24, fontWeight: '800', color: brand.ink },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  heroDescription: { color: brand.muted, marginTop: 16, lineHeight: 20, fontSize: 14 },
  usageBlock: {
    marginTop: 20,
    backgroundColor: brand.blush,
    borderRadius: 16,
    padding: 14,
  },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageLabel: { color: brand.ink, fontSize: 13, fontWeight: '600' },
  usageCount: { color: brand.ink, fontSize: 13, fontWeight: '800' },
  progress: {
    height: 8,
    backgroundColor: 'rgba(43,23,33,0.08)',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  usageRemaining: { color: brand.muted, fontSize: 12, marginTop: 8 },
  heroFooter: { marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price: { color: brand.ink, fontWeight: '900', fontSize: 26 },
  perMonth: { fontSize: 13, fontWeight: '600', color: brand.muted },
  accessUntil: { color: brand.muted, fontSize: 12 },

  noPlan: {
    backgroundColor: brand.white,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 24,
    alignItems: 'center',
    padding: 28,
  },
  noPlanImage: { width: 88, height: 88, marginBottom: 8 },
  noPlanTitle: { fontSize: 22, fontWeight: '800', color: brand.ink, marginTop: 8 },
  noPlanText: { color: brand.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: brand.ink, marginTop: 28, marginBottom: 12 },
  planList: { gap: 14 },

  option: {
    backgroundColor: brand.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: brand.border,
  },
  optionCurrent: {
    borderColor: brand.rose,
    backgroundColor: '#fffafc',
  },
  optionHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  optionMedal: { width: 56, height: 56 },
  optionHeaderText: { flex: 1 },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  optionName: { fontSize: 17, fontWeight: '800', color: brand.ink, flex: 1 },
  current: {
    color: brand.rose,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  optionDesc: { color: brand.muted, lineHeight: 19, marginTop: 6, fontSize: 13 },
  optionStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statChip: {
    flex: 1,
    backgroundColor: brand.champagne,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statChipLabel: { fontSize: 10, fontWeight: '600', color: brand.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statChipValue: { fontSize: 13, fontWeight: '800', marginTop: 4, textAlign: 'center' },

  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
  },
  accordionToggleText: { color: brand.rose, fontWeight: '700', fontSize: 13 },
  accordionBody: {
    gap: 8,
    paddingBottom: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: brand.background,
    borderRadius: 12,
    padding: 12,
  },
  serviceInfo: { flex: 1 },
  serviceName: { color: brand.ink, fontWeight: '600', fontSize: 14 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  categoryPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  categoryPillText: { fontSize: 10, fontWeight: '700' },
  serviceDuration: { fontSize: 11, color: brand.muted },

  selectButton: {
    marginTop: 14,
    backgroundColor: brand.rose,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  selectButtonText: { color: brand.white, fontWeight: '800', fontSize: 15 },
  currentButton: {
    marginTop: 14,
    backgroundColor: brand.blush,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  currentButtonText: { color: brand.roseDeep, fontWeight: '800', fontSize: 14 },

  actionCard: { backgroundColor: brand.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: brand.border },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  actionTitle: { color: brand.ink, fontWeight: '800' },
  actionSubtitle: { color: brand.muted, fontSize: 12, marginTop: 3 },

  whiteCard: {
    backgroundColor: brand.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: brand.border,
  },
  paymentMethod: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  card3dIcon: { width: 52, height: 36 },
  methodTitle: { color: brand.ink, fontWeight: '700' },
  methodSubtitle: { color: brand.muted, fontSize: 12, marginTop: 3 },
  portalButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
    paddingTop: 14,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  portalText: { color: brand.rose, fontWeight: '800' },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  paymentIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  paymentValue: { color: brand.ink, fontWeight: '800' },
  emptyText: { color: brand.muted, textAlign: 'center', paddingVertical: 12 },
});
