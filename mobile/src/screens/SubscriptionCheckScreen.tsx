import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '../theme/brand';

interface SubscriptionCheckScreenProps {
  onContinue: () => void;
  onViewPlans: () => void;
}

/** Stub: assinatura completa fica para a próxima rodada. */
export function SubscriptionCheckScreen({
  onContinue,
  onViewPlans,
}: SubscriptionCheckScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[brand.champagne, brand.background, brand.blush]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbGold]} />
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>💎</Text>
          <Text style={styles.badgeText}>Charme & Bela Club</Text>
        </View>
        <Text style={styles.title}>Sua ficha está pronta</Text>
        <Text style={styles.subtitle}>
          Você já pode explorar a clínica. Assinar um plano fica pra quando quiser — sem pressa.
        </Text>

        <View style={styles.card}>
          <Ionicons name="sparkles" size={28} color={brand.gold} />
          <Text style={styles.cardTitle}>Quer conhecer os planos?</Text>
          <Text style={styles.cardBody}>
            Sessões inclusas, economia e prioridade na agenda. Você pode ver tudo agora ou depois no perfil.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.secondary} onPress={onViewPlans} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>Ver planos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primary} onPress={onContinue} activeOpacity={0.9}>
            <Text style={styles.primaryText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color={brand.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.background },
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  orbGold: {
    top: 80,
    right: -70,
    backgroundColor: 'rgba(201, 162, 75, 0.18)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201,162,75,0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeEmoji: { fontSize: 13 },
  badgeText: { fontSize: 12, fontWeight: '500', color: '#8a5a2d' },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: brand.ink,
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: brand.muted,
    marginBottom: 28,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 22,
    gap: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: brand.ink },
  cardBody: { fontSize: 14, lineHeight: 20, color: brand.muted },
  footer: { marginTop: 'auto', gap: 12 },
  secondary: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '500', color: brand.muted },
  primary: {
    backgroundColor: brand.rose,
    borderRadius: 999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: brand.rose,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryText: { fontSize: 16, fontWeight: '600', color: brand.white },
});
