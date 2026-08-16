import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../../contexts/AuthContext';
import { useCommercial } from '../../../contexts/CommercialContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { creditCard3dSource, logoSource } from '../../../assets/brandAssets';
import {
  cancelSubscription,
  changePlan,
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
import type { ClientStackParamList } from '../../../navigation/ClientNavigator';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TIER_LABEL = {
  BRONZE: 'Essencial',
  SILVER: 'Plus',
  GOLD: 'Premium',
} as const;

export function MyPlanScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { plans, subscription, refreshing, refresh } = useCommercial();
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();
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
      // A tela de plano continua funcional mesmo se o Asaas estiver indisponível.
    } finally {
      setLoadingPayments(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments, subscription?.id]);

  const orderedPlans = useMemo(() => {
    const currentId = subscription?.status !== 'CANCELED' ? subscription?.planId : undefined;
    if (!currentId) return plans;
    const current = plans.find((plan) => plan.id === currentId);
    const rest = plans.filter((plan) => plan.id !== currentId);
    return current ? [current, ...rest] : plans;
  }, [plans, subscription?.planId, subscription?.status]);

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
    navigation.navigate('Checkout', {
      planId: plan.id,
      amount: plan.price,
      description: `Assinatura ${plan.name}`,
    });
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
      await WebBrowser.openBrowserAsync(result.url);
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

  const togglePlan = (planId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPlanId((id) => (id === planId ? null : planId));
  };

  const active = subscription && subscription.status !== 'CANCELED';
  const used = subscription?.currentMonthUsage.totalTreatments ?? 0;
  const max = subscription?.plan.maxTreatmentsPerMonth ?? 1;
  const usagePct = subscription ? Math.min(100, (used / max) * 100) : 0;
  const remaining = subscription ? Math.max(0, subscription.remaining.thisMonth) : 0;

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
          <LinearGradient
            colors={['#3a2230', '#2b1721', '#1c0f16']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.memberCard}
          >
            <View style={styles.memberOrb} />
            <View style={styles.memberTop}>
              <View>
                <Text style={styles.memberEyebrow}>Charme & Bela Club</Text>
                <Text style={styles.memberName}>{subscription.plan.name}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: active ? 'rgba(236,73,152,0.22)' : 'rgba(255,255,255,0.1)' },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: active ? brand.rose : '#c4a8b2' }]} />
                <Text style={[styles.statusPillText, { color: active ? '#ffb6d9' : '#c4a8b2' }]}>
                  {statusLabel(subscription.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.memberDesc} numberOfLines={2}>
              {subscription.plan.description}
            </Text>

            <View style={styles.usageRow}>
              <View style={styles.usageRing}>
                <Text style={styles.usageRingValue}>{remaining}</Text>
                <Text style={styles.usageRingLabel}>restantes</Text>
              </View>
              <View style={styles.usageCopy}>
                <Text style={styles.usageTitle}>Uso neste mês</Text>
                <Text style={styles.usageDetail}>
                  {used} de {max} tratamentos utilizados
                </Text>
                <View style={styles.usageTrack}>
                  <View style={[styles.usageFill, { width: `${usagePct}%` }]} />
                </View>
                <Text style={styles.memberPrice}>
                  {money(subscription.plan.price)}
                  <Text style={styles.memberPerMonth}> /mês</Text>
                </Text>
                {subscription.status === 'CANCELED' && subscription.endDate ? (
                  <Text style={styles.accessUntil}>
                    Acesso até {new Date(subscription.endDate).toLocaleDateString('pt-BR')}
                  </Text>
                ) : null}
              </View>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={['#ffffff', '#f9fafb', '#f3f4f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.noPlanCard}
          >
            <View style={styles.noPlanOrb} />
            <View style={styles.noPlanTop}>
              <View style={styles.noPlanBrand}>
                <Image source={logoSource} style={styles.noPlanLogo} resizeMode="contain" />
                <Text style={styles.noPlanEyebrow}>Charme & Bela Club</Text>
              </View>
              <View style={styles.noPlanPill}>
                <Ionicons name="sparkles" size={12} color={brand.roseDeep} />
                <Text style={styles.noPlanPillText}>Sem plano</Text>
              </View>
            </View>

            <Text style={styles.noPlanTitle}>
              Seu cuidado,{'\n'}
              <Text style={styles.noPlanTitleAccent}>todo mês.</Text>
            </Text>
            <Text style={styles.noPlanText}>
              Tratamentos inclusos, benefícios exclusivos e acompanhamento pelo app.
            </Text>

            <View style={styles.noPlanBenefits}>
              {[
                'Até 6 tratamentos por mês',
                'Prioridade no agendamento',
                'Descontos em serviços avulsos',
              ].map((item) => (
                <View key={item} style={styles.noPlanBenefit}>
                  <View style={styles.noPlanCheck}>
                    <Ionicons name="checkmark" size={12} color={brand.roseDeep} />
                  </View>
                  <Text style={styles.noPlanBenefitText}>{item}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{subscription ? 'Trocar ou conhecer' : 'Escolha seu plano'}</Text>
          <Text style={styles.sectionHint}>{plans.length} opções</Text>
        </View>

        <View style={styles.planList}>
          {orderedPlans.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              current={subscription?.planId === plan.id && subscription.status !== 'CANCELED'}
              hasActiveSub={Boolean(active)}
              loading={busy === plan.id}
              expanded={expandedPlanId === plan.id}
              onToggle={() => togglePlan(plan.id)}
              onSelect={() => selectPlan(plan)}
            />
          ))}
        </View>

        {subscription ? (
          <>
            <Text style={styles.sectionTitleSpaced}>Assinatura</Text>
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

        <Text style={styles.sectionTitleSpaced}>Forma de pagamento</Text>
        <View style={styles.whiteCard}>
          {loadingPayments ? (
            <ActivityIndicator color={brand.rose} />
          ) : methods.length ? (
            methods.map((method) => (
              <View key={method.id} style={styles.paymentMethod}>
                <Image source={creditCard3dSource} style={styles.card3dIcon} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodTitle}>
                    {(method.brand || 'Cartão').toUpperCase()} •••• {method.last4}
                  </Text>
                  <Text style={styles.methodSubtitle}>
                    {method.isDefault ? 'Principal · salvo para um toque' : 'Salvo para um toque'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.paymentMethod}>
              <Image source={creditCard3dSource} style={styles.card3dIcon} resizeMode="contain" />
              <Text style={[styles.emptyText, { flex: 1, textAlign: 'left', paddingVertical: 0 }]}>
                Nenhum cartão salvo ainda. O cartão fica só no Asaas — o app não armazena os dados.
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

        <Text style={styles.sectionTitleSpaced}>Últimos pagamentos</Text>
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
                        payment.status === 'paid' || payment.status === 'succeeded' ? '#fce7f3' : '#fef3c7',
                    },
                  ]}
                >
                  <Ionicons
                    name={payment.status === 'paid' || payment.status === 'succeeded' ? 'checkmark' : 'time-outline'}
                    size={19}
                    color={payment.status === 'paid' || payment.status === 'succeeded' ? brand.roseDeep : '#d97706'}
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
  const services = plan.services || [];
  const tierLabel = TIER_LABEL[plan.tier];

  return (
    <View style={[styles.option, current && styles.optionCurrent, expanded && styles.optionExpanded]}>
      <View style={styles.optionAccent} />
      <View style={styles.optionBody}>
        <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
          <View style={styles.optionTop}>
            <View style={styles.optionTitleBlock}>
              <View style={styles.tierRow}>
                <Ionicons name="diamond-outline" size={14} color={brand.rose} />
                <Text style={styles.tierLabel}>{tierLabel}</Text>
                {current ? (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Seu plano</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.optionName}>{plan.name}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.optionPrice}>{money(plan.price)}</Text>
              <Text style={styles.optionPerMonth}>/mês</Text>
            </View>
          </View>

          <Text style={styles.optionDesc} numberOfLines={expanded ? undefined : 2}>
            {plan.description}
          </Text>

          <View style={styles.benefitRow}>
            <View style={styles.benefitChip}>
              <Text style={styles.benefitValue}>{plan.maxTreatmentsPerMonth}</Text>
              <Text style={styles.benefitLabel}>por mês</Text>
            </View>
            <View style={styles.benefitDivider} />
            <View style={styles.benefitChip}>
              <Text style={styles.benefitValue}>{services.length}</Text>
              <Text style={styles.benefitLabel}>serviços</Text>
            </View>
            <View style={styles.benefitDivider} />
            <View style={styles.expandHint}>
              <Text style={styles.expandHintText}>{expanded ? 'Ocultar' : 'Ver inclusos'}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={brand.rose} />
            </View>
          </View>
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
                    <Ionicons name="flower-outline" size={16} color={brand.rose} />
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
            <Ionicons name="checkmark-circle" size={18} color={brand.roseDeep} />
            <Text style={styles.currentButtonText}>Plano ativo</Text>
          </View>
        )}
      </View>
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: brand.ink },
  content: { padding: 20, paddingBottom: 44 },

  noPlanCard: {
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(236,73,152,0.16)',
  },
  noPlanOrb: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(236,73,152,0.12)',
    top: -36,
    right: -28,
  },
  noPlanTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  noPlanBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  noPlanLogo: { width: 28, height: 28 },
  noPlanEyebrow: {
    color: brand.roseDeep,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  noPlanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  noPlanPillText: {
    color: brand.roseDeep,
    fontSize: 11,
    fontWeight: '700',
  },
  noPlanTitle: {
    marginTop: 18,
    fontSize: 26,
    fontWeight: '800',
    color: brand.ink,
    lineHeight: 32,
  },
  noPlanTitleAccent: {
    color: brand.rose,
  },
  noPlanText: {
    marginTop: 8,
    color: brand.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  noPlanBenefits: {
    marginTop: 18,
    gap: 10,
  },
  noPlanBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noPlanCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPlanBenefitText: {
    color: brand.ink,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  memberCard: {
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
  },
  memberOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(236,73,152,0.18)',
    top: -40,
    right: -30,
  },
  memberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  memberEyebrow: {
    color: '#ffb6d9',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  memberName: {
    color: brand.white,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  memberDesc: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 10,
    lineHeight: 20,
    fontSize: 13,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  usageRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(236,73,152,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236,73,152,0.12)',
  },
  usageRingValue: { color: brand.white, fontSize: 22, fontWeight: '900' },
  usageRingLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  usageCopy: { flex: 1 },
  usageTitle: { color: brand.white, fontWeight: '700', fontSize: 14 },
  usageDetail: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4 },
  usageTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  usageFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: brand.rose,
  },
  memberPrice: {
    color: brand.white,
    fontWeight: '900',
    fontSize: 20,
    marginTop: 12,
  },
  memberPerMonth: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  accessUntil: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },

  sectionHead: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: brand.ink },
  sectionTitleSpaced: { fontSize: 18, fontWeight: '800', color: brand.ink, marginTop: 28, marginBottom: 12 },
  sectionHint: { fontSize: 12, fontWeight: '600', color: brand.muted },
  planList: { gap: 12 },

  option: {
    backgroundColor: brand.white,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(236,73,152,0.12)',
  },
  optionCurrent: {
    borderColor: brand.rose,
    backgroundColor: '#ffffff',
  },
  optionExpanded: {
    shadowColor: brand.roseDeep,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  optionAccent: {
    width: 4,
    backgroundColor: brand.rose,
  },
  optionBody: {
    flex: 1,
    padding: 16,
  },
  optionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  optionTitleBlock: { flex: 1 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: brand.roseDeep,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  currentBadge: {
    marginLeft: 4,
    backgroundColor: brand.rose,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  optionName: { fontSize: 17, fontWeight: '800', color: brand.ink },
  priceBlock: { alignItems: 'flex-end' },
  optionPrice: { fontSize: 16, fontWeight: '900', color: brand.ink },
  optionPerMonth: { fontSize: 11, color: brand.muted, fontWeight: '600' },
  optionDesc: { color: brand.muted, lineHeight: 19, marginTop: 8, fontSize: 13 },

  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  benefitChip: { flex: 1, alignItems: 'center' },
  benefitValue: { fontSize: 15, fontWeight: '800', color: brand.ink },
  benefitLabel: { fontSize: 10, color: brand.muted, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  benefitDivider: { width: 1, height: 28, backgroundColor: 'rgba(236,73,152,0.15)' },
  expandHint: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  expandHintText: { color: brand.rose, fontWeight: '700', fontSize: 12 },

  accordionBody: {
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(236,73,152,0.15)',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f9fafb',
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  currentButtonText: { color: brand.roseDeep, fontWeight: '800', fontSize: 14 },

  actionCard: {
    backgroundColor: brand.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(236,73,152,0.12)',
  },
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
    borderColor: 'rgba(236,73,152,0.12)',
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
