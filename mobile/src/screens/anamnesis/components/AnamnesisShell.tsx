import { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '../../../theme/brand';

interface AnamnesisShellProps {
  badge: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  stepIndex: number;
  stepTotal: number;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  hideBack?: boolean;
  scrollable?: boolean;
}

export function AnamnesisShell({
  badge,
  emoji,
  title,
  subtitle,
  stepIndex,
  stepTotal,
  children,
  onBack,
  onNext,
  nextLabel = 'Continuar',
  nextDisabled = false,
  nextLoading = false,
  hideBack = false,
  scrollable = false,
}: AnamnesisShellProps) {
  const insets = useSafeAreaInsets();
  const progress = Math.max(0.08, (stepIndex + 1) / stepTotal);

  const body = (
    <View style={styles.content}>
      <View style={styles.badge}>
        {emoji ? <Text style={styles.badgeEmoji}>{emoji}</Text> : null}
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.fields}>{children}</View>
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[brand.blush, brand.background, brand.champagne]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbRose]} />
      <View style={[styles.orb, styles.orbGold]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.inner, { paddingTop: insets.top + 16 }]}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {stepIndex + 1} de {stepTotal}
          </Text>

          {scrollable ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {body}
            </ScrollView>
          ) : (
            <View style={styles.flex}>{body}</View>
          )}

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
            <View style={styles.actions}>
              {!hideBack && onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  style={styles.backBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={onNext}
                disabled={nextDisabled || nextLoading}
                style={[
                  styles.nextBtn,
                  (nextDisabled || nextLoading) && styles.nextDisabled,
                ]}
                activeOpacity={0.9}
              >
                {nextLoading ? (
                  <ActivityIndicator color={brand.white} />
                ) : (
                  <>
                    <Text style={styles.nextText}>{nextLabel}</Text>
                    <Ionicons name="arrow-forward" size={20} color={brand.white} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.background },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28 },
  orb: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  orbRose: {
    top: -60,
    right: -80,
    backgroundColor: 'rgba(236, 73, 152, 0.14)',
  },
  orbGold: {
    bottom: 120,
    left: -100,
    backgroundColor: 'rgba(230, 201, 138, 0.22)',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(236, 73, 152, 0.15)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: brand.rose,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: brand.muted,
    marginBottom: 20,
  },
  content: { flexGrow: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 12 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brand.blush,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  badgeEmoji: { fontSize: 13 },
  badgeText: { fontSize: 12, fontWeight: '500', color: brand.ink },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: brand.ink,
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: brand.muted,
    marginBottom: 22,
  },
  fields: { gap: 14 },
  footer: { paddingTop: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  backText: { fontSize: 14, fontWeight: '500', color: brand.muted },
  nextBtn: {
    flex: 1,
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
  nextDisabled: { opacity: 0.45 },
  nextText: { fontSize: 16, fontWeight: '600', color: brand.white },
});
