import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useCommercial } from '../../contexts/CommercialContext';
import {
  abandonCheckout,
  createCheckoutSession,
  createPaymentSession,
  getPaymentStatus,
} from '../../lib/api';
import { getApiErrorMessage } from '../../types/commercial';
import { brand } from '../../theme/brand';

type Props = NativeStackScreenProps<ClientStackParamList, 'Checkout'>;
type Phase = 'loading' | 'awaiting' | 'paid' | 'expired' | 'error';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00';
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CheckoutScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { refresh } = useCommercial();
  const params = route.params;
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [pixCopy, setPixCopy] = useState<string | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [amount, setAmount] = useState(params.amount || 0);
  const [description, setDescription] = useState(params.description || 'Charme & Bela');
  const [expiresAt, setExpiresAt] = useState<number>(
    params.expiresAt ? new Date(params.expiresAt).getTime() : Date.now() + 5 * 60 * 1000,
  );
  const [remaining, setRemaining] = useState(0);
  const abandoning = useRef(false);

  const loadCheckout = useCallback(async () => {
    if (!user) return;
    setPhase('loading');
    setError(null);
    try {
      const checkout = params.planId
        ? await createCheckoutSession(user.id, params.planId)
        : await createPaymentSession(
            user.id,
            params.serviceId || '',
            params.appointmentId,
            params.amount,
            params.customDescription,
            params.packagePurchaseId,
          );
      setPaymentId(checkout.paymentId);
      setInvoiceUrl(checkout.invoiceUrl || checkout.url);
      setPixCopy(checkout.pixCopyPaste);
      setPixQr(checkout.pixQrBase64);
      setAmount(checkout.amount);
      setDescription(checkout.description);
      if (checkout.expiresAt) setExpiresAt(new Date(checkout.expiresAt).getTime());
      setPhase('awaiting');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível abrir o pagamento'));
      setPhase('error');
    }
  }, [params.amount, params.appointmentId, params.customDescription, params.packagePurchaseId, params.planId, params.serviceId, user]);

  useEffect(() => {
    void loadCheckout();
  }, [loadCheckout]);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (phase !== 'awaiting' || remaining > 0) return;
    setPhase('expired');
  }, [phase, remaining]);

  useEffect(() => {
    if (phase !== 'awaiting' || !paymentId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getPaymentStatus(paymentId);
        if (cancelled) return;
        if (status.paid) {
          setPhase('paid');
          await refresh();
        }
      } catch {
        // webhook continua sendo a fonte da verdade
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, paymentId, refresh]);

  const qrSource = useMemo(() => {
    if (!pixQr) return null;
    const uri = pixQr.startsWith('data:') ? pixQr : `data:image/png;base64,${pixQr}`;
    return { uri };
  }, [pixQr]);

  const leave = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('ClientTabs', { screen: 'Agenda' });
  }, [navigation]);

  const handleAbandon = async () => {
    if (abandoning.current) return leave();
    if (phase === 'paid') return leave();
    abandoning.current = true;
    try {
      await abandonCheckout({
        userId: user?.id,
        appointmentId: params.appointmentId,
        packagePurchaseId: params.packagePurchaseId,
        paymentId: paymentId || undefined,
      });
      await refresh();
    } catch {
      // hold expira sozinho
    } finally {
      leave();
    }
  };

  const copyPix = async () => {
    if (!pixCopy) return;
    try {
      await Share.share({ message: pixCopy, title: 'Pix copia e cola' });
    } catch {
      Alert.alert('Pix', pixCopy);
    }
  };

  const openCard = async () => {
    if (!invoiceUrl) {
      Alert.alert('Cartão', 'Link de pagamento indisponível no momento.');
      return;
    }
    await WebBrowser.openBrowserAsync(invoiceUrl);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={() => void handleAbandon()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={brand.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
        <TouchableOpacity onPress={() => void handleAbandon()} style={styles.iconButton}>
          <Ionicons name="close" size={24} color={brand.ink} />
        </TouchableOpacity>
      </ScreenHeader>

      {phase === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={brand.rose} size="large" />
          <Text style={styles.muted}>Gerando Pix seguro…</Text>
        </View>
      ) : null}

      {phase === 'error' ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={48} color={brand.rose} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => void loadCheckout()}>
            <Text style={styles.primaryButtonText}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'paid' ? (
        <View style={styles.centered}>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark" size={36} color="white" />
          </View>
          <Text style={styles.successTitle}>Pagamento confirmado</Text>
          <Text style={styles.muted}>Seu horário está reservado. A clínica confirma em seguida.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('ClientTabs', { screen: 'Agenda' })}
          >
            <Text style={styles.primaryButtonText}>Ver agenda</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'expired' ? (
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={48} color="#c2410c" />
          <Text style={styles.successTitle}>Tempo esgotado</Text>
          <Text style={styles.muted}>O horário foi liberado. Escolha outro horário para gerar um novo Pix.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={leave}>
            <Text style={styles.primaryButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'awaiting' ? (
        <View style={styles.body}>
          <LinearGradient colors={[brand.rose, brand.roseDeep]} style={styles.hero}>
            <Text style={styles.heroLabel}>Valor a pagar</Text>
            <Text style={styles.heroAmount}>{formatMoney(amount)}</Text>
            <Text style={styles.heroDesc} numberOfLines={2}>
              {description}
            </Text>
            <View style={styles.timerPill}>
              <Ionicons name="hourglass-outline" size={16} color="white" />
              <Text style={styles.timerText}>Reserva expira em {formatCountdown(remaining)}</Text>
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pague com Pix</Text>
            <Text style={styles.cardHint}>O pagamento cai na hora. Não compartilhe este QR fora do app.</Text>
            {qrSource ? (
              <Image source={qrSource} style={styles.qr} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <ActivityIndicator color={brand.rose} />
                <Text style={styles.muted}>Carregando QR…</Text>
              </View>
            )}
            {pixCopy ? (
              <TouchableOpacity style={styles.copyButton} onPress={() => void copyPix()}>
                <Ionicons name="copy-outline" size={18} color={brand.roseDeep} />
                <Text style={styles.copyText}>Copiar código Pix</Text>
              </TouchableOpacity>
            ) : null}
            <Text selectable style={styles.pixPayload} numberOfLines={2}>
              {pixCopy || 'QR disponível no link do cartão se o Pix ainda não carregou.'}
            </Text>
          </View>

          <TouchableOpacity style={styles.cardButton} onPress={() => void openCard()}>
            <Ionicons name="card-outline" size={22} color={brand.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardButtonTitle}>Pagar com cartão</Text>
              <Text style={styles.cardHint}>Abre o checkout seguro do Asaas. Não digitamos dados do cartão no app.</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={brand.muted} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: brand.ink },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  body: { padding: 16, gap: 14 },
  muted: { color: brand.muted, textAlign: 'center', lineHeight: 20 },
  errorText: { color: brand.ink, textAlign: 'center', fontWeight: '600' },
  hero: { borderRadius: 24, padding: 22, gap: 6 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 13 },
  heroAmount: { color: 'white', fontSize: 34, fontWeight: '800' },
  heroDesc: { color: 'rgba(255,255,255,0.92)', fontSize: 14 },
  timerPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
  },
  timerText: { color: 'white', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: brand.white,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brand.border,
    gap: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: brand.ink },
  cardHint: { color: brand.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  qr: { width: 220, height: 220, borderRadius: 16, backgroundColor: 'white' },
  qrPlaceholder: { height: 220, width: 220, alignItems: 'center', justifyContent: 'center', gap: 8 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brand.blush,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  copyText: { color: brand.roseDeep, fontWeight: '800' },
  pixPayload: { fontSize: 11, color: brand.muted, textAlign: 'center' },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: brand.border,
  },
  cardButtonTitle: { fontWeight: '800', color: brand.ink, fontSize: 15 },
  primaryButton: {
    marginTop: 8,
    backgroundColor: brand.rose,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  primaryButtonText: { color: 'white', fontWeight: '800' },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: brand.ink, textAlign: 'center' },
});
