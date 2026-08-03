import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationsPanel } from '../../components/NotificationsPanel';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCommercial } from '../../contexts/CommercialContext';
import { CATEGORY_META, type ServiceCategory } from '../../types/commercial';
import { displayUserFirstName } from '../../lib/userDisplay';

const { width } = Dimensions.get('window');

/**
 * TODO(promo-carousel): este card será um carrossel/slide de promoções nas próximas
 * atualizações. Enquanto isso, exibe o CTA de assinatura quando não há plano ativo.
 */
const NO_PLAN_CARD = {
  gradientColors: ['#ec4899', '#be185d'] as const,
};

function nextBillingLabel(startDate: string) {
  const start = new Date(startDate);
  const dayOfMonth = start.getDate();
  const next = new Date();
  next.setHours(12, 0, 0, 0);
  next.setDate(dayOfMonth);
  if (new Date().getDate() >= dayOfMonth) {
    next.setMonth(next.getMonth() + 1);
  }
  return next.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

export function ClientHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { services, appointments, subscription, refreshing, refresh } = useCommercial();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const firstName = displayUserFirstName(user);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollToTop();
      const unsubscribe = navigation.addListener('tabPress', scrollToTop);
      return unsubscribe;
    }, [navigation, scrollToTop])
  );
  const activePlan = subscription && (subscription.status !== 'CANCELED' || Boolean(subscription.endDate && new Date(subscription.endDate) > new Date())) ? {
    hasActivePlan: true,
    planName: subscription.plan.name,
    planEmoji: subscription.plan.tier === 'GOLD' ? '🥇' : subscription.plan.tier === 'SILVER' ? '🥈' : '🥉',
    usedTreatments: subscription.currentMonthUsage.totalTreatments,
    totalTreatments: subscription.plan.maxTreatmentsPerMonth,
    status: subscription.status,
    nextPayment:
      subscription.status === 'CANCELED' && subscription.endDate
        ? new Date(subscription.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
        : subscription.startDate
          ? nextBillingLabel(subscription.startDate)
          : '—',
    gradientColors: subscription.plan.tier === 'GOLD' ? ['#8b5cf6', '#7c3aed'] : subscription.plan.tier === 'SILVER' ? ['#64748b', '#475569'] : ['#d97706', '#b45309'],
  } : null;
  const categories = (Object.keys(CATEGORY_META) as ServiceCategory[]).map((category) => ({
    id: category,
    name: CATEGORY_META[category].label,
    icon: CATEGORY_META[category].icon,
    count: services.filter((service) => service.category === category).length,
    color: CATEGORY_META[category].color,
    included: Boolean(subscription?.plan.services.some((service) => service.category === category)),
  })).filter((category) => category.count > 0);
  const nextAppointments = appointments
    .filter((item) => ['PENDING', 'CONFIRMED'].includes(item.status) && new Date(`${item.startTime.slice(0, 10)}T${item.startTime.slice(11, 16)}:00`) > new Date())
    .slice(0, 3)
    .map((item) => ({ id: item.id, service: item.service.name, date: item.startTime.slice(8, 10), month: new Date(`${item.startTime.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), time: item.startTime.slice(11, 16), paymentType: item.origin === 'SUBSCRIPTION' ? 'plan' : item.origin === 'ADMIN_CREATED' ? 'clinic' : 'cash', status: item.status === 'CONFIRMED' ? 'confirmed' : 'pending' }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView ref={scrollRef} style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ec4899" />}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Olá,</Text>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{firstName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => setNotificationsVisible(true)}
          >
            <Ionicons name="notifications-outline" size={24} color="#111827" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Plan Card */}
        {activePlan ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Plan')}><ActivePlanCard plan={activePlan} /></TouchableOpacity>
        ) : (
          <NoPlanCard onPress={() => navigation.navigate('Plan')} />
        )}

        {/* Procedimentos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Procedimentos</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Services')}>
              <Text style={styles.seeAllLink}>ver todos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map(category => (
              <CategoryCard key={category.id} category={category} hasPlan={category.included} onPress={() => navigation.navigate('Services', { category: category.id })} />
            ))}
          </View>
        </View>

        {/* Próximos Agendamentos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos Agendamentos</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Agenda')}>
              <Text style={styles.seeAllLink}>ver todos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.appointmentsList}>
            {nextAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
            {nextAppointments.length === 0 ? <Text style={{ color: '#6b7280', textAlign: 'center', paddingVertical: 18 }}>Nenhum agendamento futuro</Text> : null}
          </View>

          <TouchableOpacity style={styles.newAppointmentButton} onPress={() => navigation.navigate('Services')}>
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.newAppointmentButtonText}>Novo Agendamento</Text>
          </TouchableOpacity>
        </View>

        {/* Ações Rápidas */}
        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: '#fce7f3' }]}
              onPress={() => navigation.navigate('Profile', { openScreen: 'anamnesis' })}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="clipboard-outline" size={32} color="#ec4899" />
              </View>
              <Text style={styles.quickActionTitle}>Minha Anamnese</Text>
              <Text style={styles.quickActionSubtitle}>Histórico médico</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: '#e0e7ff' }]} onPress={() => navigation.navigate('Plan')}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="card-outline" size={32} color="#6366f1" />
              </View>
              <Text style={styles.quickActionTitle}>Meu Plano</Text>
              <Text style={styles.quickActionSubtitle}>Gerenciar assinatura</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Notifications Panel */}
      <NotificationsPanel 
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </SafeAreaView>
  );
}

function ActivePlanCard({ plan }: { plan: any }) {
  const progress = (plan.usedTreatments / plan.totalTreatments) * 100;
  const remaining = plan.totalTreatments - plan.usedTreatments;

  return (
    <View style={styles.planCardContainer}>
      <LinearGradient
        colors={plan.gradientColors}
        style={styles.planCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.planCardHeader}>
          <View>
            <Text style={styles.planName}>
              {plan.planEmoji} {plan.planName}
            </Text>
            <Text style={styles.planNextPayment}>
              {plan.status === 'CANCELED' ? 'Acesso até' : 'Próxima cobrança'}: {plan.nextPayment}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{plan.status === 'CANCELED' ? 'CANCELADO' : plan.status === 'PAUSED' ? 'PAUSADO' : plan.status === 'PAST_DUE' ? 'PENDENTE' : 'ATIVO'}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>Tratamentos usados este mês</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {plan.usedTreatments}/{plan.totalTreatments}
            </Text>
          </View>
          <Text style={styles.remainingText}>
            Restam: {remaining} {remaining === 1 ? 'tratamento' : 'tratamentos'}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function NoPlanCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.planCardContainer}>
      <LinearGradient
        colors={[...NO_PLAN_CARD.gradientColors]}
        style={styles.planCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.planCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>Sem Plano Ativo</Text>
            <Text style={styles.planNextPayment}>
              Assine e economize até 60% em tratamentos
            </Text>
          </View>
        </View>

        <View style={styles.noPlanContent}>
          <Text style={styles.noPlanText}>
            Até 6 procedimentos por mês{'\n'}
            Valor fixo e previsível{'\n'}
            Sem taxas ocultas
          </Text>
          <TouchableOpacity style={styles.subscribeCTA} onPress={onPress}>
            <Text style={styles.subscribeCTAText}>Assinar Agora</Text>
            <Ionicons name="arrow-forward" size={20} color="#be185d" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

function CategoryCard({ category, hasPlan, onPress }: { category: any; hasPlan: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
      <View style={[styles.categoryIconContainer, { backgroundColor: `${category.color}20` }]}>
        <MaterialCommunityIcons
          name={category.icon as any}
          size={28}
          color={category.color}
        />
      </View>
      <Text style={styles.categoryName}>{category.name}</Text>
      <Text style={styles.categoryCount}>
        {hasPlan ? '✓ Inclusos no plano' : `${category.count} serviços`}
      </Text>
    </TouchableOpacity>
  );
}

function AppointmentCard({ appointment }: { appointment: any }) {
  const getPaymentInfo = () => {
    switch (appointment.paymentType) {
      case 'plan':
        return { icon: 'checkmark-circle', color: '#10b981', text: 'Plano' };
      case 'cash':
        return { icon: 'cash', color: '#f59e0b', text: 'Pago' };
      case 'clinic':
        return { icon: 'card', color: '#6366f1', text: 'Pagar na clínica' };
      default:
        return { icon: 'help-circle', color: '#6b7280', text: 'N/A' };
    }
  };

  const payment = getPaymentInfo();

  return (
    <TouchableOpacity style={styles.appointmentCard}>
      <View style={styles.appointmentDate}>
        <Text style={styles.appointmentDay}>{appointment.date}</Text>
        <Text style={styles.appointmentMonth}>{appointment.month}</Text>
      </View>

      <View style={styles.appointmentInfo}>
        <Text style={styles.appointmentService}>{appointment.service}</Text>
        <View style={styles.appointmentMeta}>
          <View style={styles.appointmentTime}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={styles.appointmentTimeText}>{appointment.time}</Text>
          </View>
          <View style={[styles.appointmentPayment, { backgroundColor: `${payment.color}15` }]}>
            <Ionicons name={payment.icon as any} size={14} color={payment.color} />
            <Text style={[styles.appointmentPaymentText, { color: payment.color }]}>
              {payment.text}
            </Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  planCardContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  planCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  planNextPayment: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  progressSection: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  remainingText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginTop: 12,
  },
  noPlanContent: {
    marginTop: 8,
  },
  noPlanText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 16,
  },
  subscribeCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  subscribeCTAText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#be185d',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ec4899',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  appointmentsList: {
    gap: 12,
    marginBottom: 16,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  appointmentDate: {
    width: 56,
    height: 56,
    backgroundColor: '#fce7f3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  appointmentDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  appointmentMonth: {
    fontSize: 12,
    color: '#ec4899',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentService: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appointmentTimeText: {
    fontSize: 13,
    color: '#6b7280',
  },
  appointmentPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appointmentPaymentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  newAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  newAppointmentButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  quickActionIcon: {
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
