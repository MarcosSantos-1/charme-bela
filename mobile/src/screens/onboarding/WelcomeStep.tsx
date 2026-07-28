import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brand } from '../../theme/brand';
import { logoSource } from '../../assets/brandAssets';
import { PageIndicator } from './PageIndicator';

interface WelcomeStepProps {
  total: number;
  current: number;
  onNext: () => void;
  onSelect: (i: number) => void;
  width: number;
}

export function WelcomeStep({ total, current, onNext, onSelect, width }: WelcomeStepProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={[brand.blush, brand.background, brand.champagne]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbLeft]} />
      <View style={[styles.orb, styles.orbRight]} />

      <View style={[styles.center, { paddingTop: insets.top }]}>
        <View style={styles.logoBox}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.eyebrow}>Bem-vinda</Text>
        <Text style={styles.title}>
          Charme <Text style={styles.titleAccent}>&</Text> Bela
        </Text>
        <Text style={styles.body}>
          Sua beleza, nosso cuidado. Agende tratamentos, gerencie sua assinatura e muito mais —
          tudo em um só lugar.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
        <PageIndicator total={total} current={current} onSelect={onSelect} />
        <TouchableOpacity style={styles.primaryBtn} onPress={onNext} activeOpacity={0.9}>
          <Text style={styles.primaryBtnText}>Começar</Text>
          <Ionicons name="arrow-forward" size={20} color={brand.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  orbLeft: {
    top: -40,
    left: -60,
    width: 220,
    height: 220,
    backgroundColor: brand.rose,
  },
  orbRight: {
    top: 160,
    right: -80,
    width: 260,
    height: 260,
    backgroundColor: brand.goldSoft,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoBox: {
    width: 128,
    height: 128,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: brand.rose,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logo: {
    width: 92,
    height: 92,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 5.5,
    textTransform: 'uppercase',
    color: 'rgba(183, 39, 110, 0.7)',
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '600',
    color: brand.ink,
    textAlign: 'center',
  },
  titleAccent: {
    color: brand.rose,
  },
  body: {
    marginTop: 16,
    maxWidth: 260,
    fontSize: 15,
    lineHeight: 22,
    color: brand.muted,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brand.rose,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: brand.rose,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryBtnText: {
    color: brand.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
