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
import { CardNicknameModal } from '../../../components/CardNicknameModal';
import { creditCard3dSource, logoSource } from '../../../assets/brandAssets';
import {
  cancelPendingPlanChange,
  cancelSubscription,
  changePlan,
  deleteSavedCard,
  getPaymentHistory,
  getPaymentMethods,
  reactivateSubscription,
  updateSavedCard,
} from '../../../lib/api';
import {
  CATEGORY_META,
  cardBrandLabel,
  getApiErrorMessage,
  savedCardLabel,
  type PaymentHistoryItem,
  type PaymentMethod,
  type Plan,
  type ServiceCategory,
} from '../../../types/commercial';
import { brand } from '../../../theme/brand';
import type { ClientStackParamList } from '../../../navigation/ClientNavigator';

function isCancelInProgress(sub?: { status?: string; endDate?: string | null; cancelInProgress?: boolean } | null) {
  if (!sub) return false;
  if (sub.cancelInProgress) return true;
  return sub.status === 'CANCELED' && Boolean(sub.endDate && new Date(sub.endDate) > new Date());
}

function accessUntilLabel(endDate?: string | null) {
  if (!endDate) return 'o fim do período pago';
  return new Date(endDate).toLocaleDateString('pt-BR');
}

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
  const [nicknameCard, setNicknameCard] = useState<PaymentMethod | null>(null);

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
    const cancelPending = isCancelInProgress(subscription);
    const currentId = subscription && (subscription.status !== 'CANCELED' || cancelPending) ? subscription.planId : undefined;
    if (!currentId) return plans;
    const current = plans.find((plan) => plan.id === currentId);
    const rest = plans.filter((plan) => plan.id !== currentId);
    return current ? [current, ...rest] : plans;
  }, [plans, subscription?.planId, subscription?.status, subscription?.endDate, subscription?.cancelInProgress]);

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

  const openCheckout = async (plan: Plan, upgrade = false) => {
    if (!user) return;
    const difference = upgrade && subscription ? Math.max(0, plan.price - subscription.plan.price) : plan.price;
    navigation.navigate('Checkout', {
      planId: plan.id,
      amount: difference,
      description: upgrade ? `Upgrade para ${plan.name}` : `Assinatura ${plan.name}`,
      upgrade,
    });
  };

  const selectPlan = (plan: Plan) => {
    if (!user) return;
    if (!subscription || (subscription.status === 'CANCELED' && !isCancelInProgress(subscription))) {
      return void openCheckout(plan);
    }
    if (isCancelInProgress(subscription)) {
      Alert.alert(
        'Cancelamento em andamento',
        'Desfaça o cancelamento para trocar de plano. Você não precisa pagar de novo.',
      );
      return;
    }
    if (subscription.planId === plan.id) return;
    const isUpgrade = plan.price > subscription.plan.price;
    const nextDue = subscription.nextDueDate
      ? new Date(subscription.nextDueDate).toLocaleDateString('pt-BR')
      : 'a próxima cobrança';
    if (isUpgrade && subscription.asaasSubscriptionId) {
      const difference = plan.price - subscription.plan.price;
      Alert.alert(
        'Upgrade de plano',
        `Vamos cobrar agora a diferença de ${money(difference)}. Se o pagamento for aprovado, seu plano passa a ser ${plan.name} na hora.`,
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Pagar diferença', onPress: () => void openCheckout(plan, true) },
        ],
      );
      return;
    }
    Alert.alert(
      'Trocar plano',
      isUpgrade
        ? `Deseja mudar de ${subscription.plan.name} para ${plan.name}?`
        : `Você continua no ${subscription.plan.name} até ${nextDue}. A partir daí passa para ${plan.name}.`,
      [
        { text: 'Agora não', style: 'cancel' },
        {
          text: 'Confirmar troca',
          onPress: () =>
            void run(
              plan.id,
              () => changePlan(user.id, plan.id),
              isUpgrade
                ? `Seu plano agora é ${plan.name}.`
                : `Troca agendada. Você continua no ${subscription.plan.name} até ${nextDue}.`,
            ),
        },
      ],
    );
  };

  const undoPendingChange = () => {
    if (!user) return;
    Alert.alert('Desfazer troca', 'Você permanece no plano atual.', [
      { text: 'Manter agendado', style: 'cancel' },
      {
        text: 'Desfazer',
        onPress: () =>
          void run('undo-pending', () => cancelPendingPlanChange(user.id), 'Você permanece no plano atual.'),
      },
    ]);
  };

  const setDefaultCard = (card: PaymentMethod) => {
    if (!user) return;
    if (card.kind === 'debit') {
      Alert.alert(
        'Débito automático',
        'Cartão de débito não renova a assinatura. Escolha um cartão de crédito para o débito automático.',
      );
      return;
    }
    void run(
      `default-${card.id}`,
      () => updateSavedCard(card.id, { userId: user.id, isDefault: true }),
      `${savedCardLabel(card)} passa a ser debitado automaticamente.`,
    );
  };

  const removeCard = (card: PaymentMethod) => {
    if (!user) return;
    Alert.alert('Remover cartão', `Tirar ${savedCardLabel(card)} dos cartões salvos?`, [
      { text: 'Manter', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          void run(`delete-${card.id}`, () => deleteSavedCard(card.id, user.id), 'Cartão removido deste aparelho.'),
      },
    ]);
  };

  const openReceipt = async (payment: PaymentHistoryItem) => {
    const url = payment.receiptUrl || payment.hostedInvoiceUrl;
    if (!url) {
      Alert.alert('Comprovante', 'O comprovante ainda não está disponível para este pagamento.');
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  };

  const requestCancel = () => {
    if (!user) return;
    Alert.alert('Cancelar plano', 'Seu acesso permanece até o fim do período já pago. Depois você pode desfazer sem pagar de novo.', [
      { text: 'Manter plano', style: 'cancel' },
      {
        text: 'Cancelar assinatura',
        style: 'destructive',
        onPress: async () => {
          setBusy('cancel');
          try {
            const updated = await cancelSubscription(user.id, 'Cancelado pelo aplicativo');
            await refresh();
            await loadPayments();
            Alert.alert(
              'Sobre o cancelamento da assinatura',
              `Não se preocupe, você tem até o dia ${accessUntilLabel(updated.endDate || subscription?.endDate)} para aproveitar seu plano.`,
            );
          } catch (error) {
            Alert.alert('Não foi possível concluir', getApiErrorMessage(error));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const undoCancel = () => {
    if (!user) return;
    Alert.alert(
      'Desfazer cancelamento',
      'Você continua no plano atual. A próxima cobrança será na data da recorrência — sem pagar agora.',
      [
        { text: 'Manter cancelamento', style: 'cancel' },
        {
          text: 'Desfazer',
          onPress: () =>
            void run(
              'reactivate',
              () => reactivateSubscription(user.id),
              'Cancelamento desfeito. A próxima cobrança segue na data da recorrência, sem pagar agora.',
            ),
        },
      ],
    );
  };

  const togglePlan = (planId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPlanId((id) => (id === planId ? null : planId));
  };

  const cancelPending = isCancelInProgress(subscription);
  const active = Boolean(subscription && (subscription.status === 'ACTIVE' || cancelPending));
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
                  {statusLabel(subscription.status, cancelPending)}
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
                ) : subscription.nextDueDate && subscription.status === 'ACTIVE' ? (
                  <Text style={styles.accessUntil}>
                    Próxima cobrança em {new Date(subscription.nextDueDate).toLocaleDateString('pt-BR')}
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
                <Ionicons name="flower" size={12} color={brand.roseDeep} />
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

        {subscription?.pendingPlan ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Downgrade agendado</Text>
            <Text style={styles.pendingText}>
              Você continua no {subscription.plan.name} até{' '}
              {subscription.nextDueDate
                ? new Date(subscription.nextDueDate).toLocaleDateString('pt-BR')
                : 'a próxima cobrança'}
              . Depois passa para {subscription.pendingPlan.name} ({money(subscription.pendingPlan.price)}/mês).
            </Text>
            <TouchableOpacity style={styles.pendingButton} onPress={undoPendingChange} disabled={busy === 'undo-pending'}>
              {busy === 'undo-pending' ? (
                <ActivityIndicator color={brand.roseDeep} />
              ) : (
                <Text style={styles.pendingButtonText}>Desfazer troca</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{subscription ? 'Trocar ou conhecer' : 'Escolha seu plano'}</Text>
          <Text style={styles.sectionHint}>{plans.length} opções</Text>
        </View>

        <View style={styles.planList}>
          {orderedPlans.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              current={subscription?.planId === plan.id && Boolean(active)}
              pending={subscription?.pendingPlanId === plan.id}
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
              {cancelPending ? (
                <Action
                  icon="refresh-circle-outline"
                  title="Desfazer cancelamento"
                  subtitle="Continuar no plano sem pagar de novo"
                  onPress={undoCancel}
                  loading={busy === 'reactivate'}
                />
              ) : null}
              {subscription.status === 'PAUSED' && !cancelPending ? (
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
              {subscription.status === 'CANCELED' && !cancelPending ? (
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
          <Text style={styles.cardSectionHint}>
            Débito automático da assinatura usa crédito. Débito entra nas compras avulsas. O apelido aparece na hora de
            pagar.
          </Text>
          {loadingPayments ? (
            <ActivityIndicator color={brand.rose} />
          ) : methods.length ? (
            methods.map((method) => {
              const settingDefault = busy === `default-${method.id}`;
              const deleting = busy === `delete-${method.id}`;
              return (
                <View key={method.id} style={styles.cardBlock}>
                  <View style={styles.paymentMethod}>
                    <Image source={creditCard3dSource} style={styles.card3dIcon} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodTitle}>{savedCardLabel(method)}</Text>
                      <Text style={styles.methodSubtitle}>
                        {method.kind === 'debit' ? 'Débito' : 'Crédito'}
                        {method.nickname
                          ? ` · ${cardBrandLabel(method.brand)}${method.last4 ? ` •••• ${method.last4}` : ''}`
                          : method.last4
                            ? ` · ${cardBrandLabel(method.brand)} •••• ${method.last4}`
                            : ''}
                        {method.isDefault ? ' · débito automático' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    {method.kind !== 'debit' && !method.isDefault ? (
                      <TouchableOpacity
                        style={styles.cardAction}
                        onPress={() => setDefaultCard(method)}
                        disabled={Boolean(busy)}
                      >
                        {settingDefault ? (
                          <ActivityIndicator color={brand.roseDeep} />
                        ) : (
                          <Text style={styles.cardActionText}>Usar no débito automático</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.cardAction}
                      onPress={() => setNicknameCard(method)}
                      disabled={Boolean(busy)}
                    >
                      <Text style={styles.cardActionText}>{method.nickname ? 'Editar apelido' : 'Dar apelido'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cardAction}
                      onPress={() => removeCard(method)}
                      disabled={Boolean(busy)}
                    >
                      {deleting ? (
                        <ActivityIndicator color={brand.roseDeep} />
                      ) : (
                        <Text style={[styles.cardActionText, styles.cardActionDanger]}>Remover</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.paymentMethod}>
              <Image source={creditCard3dSource} style={styles.card3dIcon} resizeMode="contain" />
              <Text style={[styles.emptyText, { flex: 1, textAlign: 'left', paddingVertical: 0 }]}>
                Nenhum cartão salvo ainda. Pague uma vez no checkout seguro (crédito ou débito) e ele aparece aqui.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitleSpaced}>Últimos pagamentos</Text>
        <View style={styles.whiteCard}>
          {loadingPayments ? (
            <ActivityIndicator color={brand.rose} />
          ) : payments.length ? (
            payments.slice(0, 12).map((payment) => {
              const paid = payment.status === 'paid' || payment.status === 'succeeded';
              const receiptUrl = payment.receiptUrl || payment.hostedInvoiceUrl;
              return (
                <View key={payment.id} style={styles.paymentBlock}>
                  <View style={styles.paymentItem}>
                    <View
                      style={[
                        styles.paymentIcon,
                        {
                          backgroundColor: paid ? '#fce7f3' : '#fef3c7',
                        },
                      ]}
                    >
                      <Ionicons
                        name={paid ? 'checkmark' : 'time-outline'}
                        size={19}
                        color={paid ? brand.roseDeep : '#d97706'}
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
                  {paid && receiptUrl ? (
                    <TouchableOpacity style={styles.receiptButton} onPress={() => void openReceipt(payment)}>
                      <Ionicons name="document-text-outline" size={16} color={brand.roseDeep} />
                      <Text style={styles.receiptText}>Ver comprovante</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Seu histórico de pagamentos aparecerá aqui.</Text>
          )}
        </View>
      </ScrollView>

      <CardNicknameModal
        visible={Boolean(nicknameCard)}
        brandName={nicknameCard?.brand}
        last4={nicknameCard?.last4}
        initialValue={nicknameCard?.nickname}
        onSkip={() => setNicknameCard(null)}
        onSave={(nickname) => {
          const card = nicknameCard;
          setNicknameCard(null);
          if (!user || !card) return;
          void updateSavedCard(card.id, { userId: user.id, nickname })
            .then((next) => setMethods(next))
            .catch((error) => Alert.alert('Apelido', getApiErrorMessage(error)));
        }}
      />
    </View>
  );
}

function PlanOption({
  plan,
  current,
  pending,
  hasActiveSub,
  loading,
  expanded,
  onToggle,
  onSelect,
}: {
  plan: Plan;
  current?: boolean;
  pending?: boolean;
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
                ) : pending ? (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Agendado</Text>
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
                {pending ? 'Já agendado' : hasActiveSub ? 'Trocar para este plano' : 'Assinar este plano'}
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

function statusLabel(status: string, cancelPending = false) {
  if (cancelPending) return 'Em cancelamento';
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
  pendingCard: {
    marginTop: 16,
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  pendingTitle: { fontSize: 15, fontWeight: '800', color: '#9a3412' },
  pendingText: { fontSize: 13, color: '#9a3412', marginTop: 6, lineHeight: 18 },
  pendingButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffedd5',
  },
  pendingButtonText: { color: '#9a3412', fontWeight: '800', fontSize: 13 },

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
  cardSectionHint: { color: brand.muted, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  cardBlock: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  paymentMethod: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  card3dIcon: { width: 52, height: 36 },
  methodTitle: { color: brand.ink, fontWeight: '700' },
  methodSubtitle: { color: brand.muted, fontSize: 12, marginTop: 3 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 64 },
  cardAction: {
    backgroundColor: brand.blush,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cardActionText: { color: brand.roseDeep, fontWeight: '700', fontSize: 12 },
  cardActionDanger: { color: '#b42318' },
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
  paymentBlock: {
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginLeft: 47,
    marginBottom: 6,
    backgroundColor: brand.blush,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  receiptText: { color: brand.roseDeep, fontWeight: '800', fontSize: 12 },
  paymentIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  paymentValue: { color: brand.ink, fontWeight: '800' },
  emptyText: { color: brand.muted, textAlign: 'center', paddingVertical: 12 },
});
