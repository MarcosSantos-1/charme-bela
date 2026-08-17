import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../navigation/ClientNavigator';
import { ScreenHeader } from '../../components/ScreenHeader';
import { CardNicknameModal } from '../../components/CardNicknameModal';
import { useAuth } from '../../contexts/AuthContext';
import { useCommercial } from '../../contexts/CommercialContext';
import {
  abandonCheckout,
  chargeSavedCard,
  createCheckoutSession,
  createPaymentSession,
  getPaymentMethods,
  getPaymentStatus,
  updateSavedCard,
} from '../../lib/api';
import {
  cardBrandLabel,
  getApiErrorMessage,
  savedCardLabel,
  unnamedSavedCard,
  type PaymentMethod,
} from '../../types/commercial';
import { brand } from '../../theme/brand';
import { isValidCpf, maskCpf } from '../../lib/cpf';
import { creditCard3dSource } from '../../assets/brandAssets';

type Props = NativeStackScreenProps<ClientStackParamList, 'Checkout'>;
type Phase = 'need_cpf' | 'loading' | 'awaiting' | 'paid' | 'expired' | 'error';

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
  const isPlan = Boolean(params.planId);
  const [phase, setPhase] = useState<Phase>(() =>
    isValidCpf(user?.cpf) ? 'loading' : 'need_cpf',
  );
  const [error, setError] = useState<string | null>(null);
  const [cpf, setCpf] = useState(() => maskCpf(user?.cpf || ''));
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [pixCopy, setPixCopy] = useState<string | null>(null);
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [amount, setAmount] = useState(params.amount || 0);
  const [description, setDescription] = useState(params.description || 'Charme & Bela');
  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    if (params.planId) return null;
    return params.expiresAt ? new Date(params.expiresAt).getTime() : Date.now() + 5 * 60 * 1000;
  });
  const [remaining, setRemaining] = useState(0);
  const [savedCards, setSavedCards] = useState<PaymentMethod[]>([]);
  const [chargingSavedId, setChargingSavedId] = useState<string | null>(null);
  const [nicknameCard, setNicknameCard] = useState<PaymentMethod | null>(null);
  const abandoning = useRef(false);
  const startedRef = useRef(false);
  const cpfRef = useRef(cpf);
  const browserOpenRef = useRef(false);
  cpfRef.current = cpf;

  const offerNicknameIfNeeded = useCallback(async () => {
    if (!user || browserOpenRef.current) return;
    try {
      const methods = await getPaymentMethods(user.id);
      const unnamed = unnamedSavedCard(methods);
      if (unnamed) setNicknameCard(unnamed);
    } catch {
      // apelido pode ser dado depois em Meu Plano
    }
  }, [user]);

  const loadCheckout = useCallback(async () => {
    if (!user) return;
    const document = cpfRef.current.replace(/\D/g, '');
    if (!isValidCpf(document)) {
      setPhase('need_cpf');
      setError(cpfRef.current.replace(/\D/g, '').length === 11 ? 'CPF inválido. Confira os dígitos.' : null);
      return;
    }
    setPhase('loading');
    setError(null);
    try {
      const checkout = params.planId
        ? await createCheckoutSession(user.id, params.planId, document)
        : await createPaymentSession(
            user.id,
            params.serviceId || '',
            params.appointmentId,
            params.amount,
            params.customDescription,
            params.packagePurchaseId,
            document,
          );
      setPaymentId(checkout.paymentId);
      setInvoiceUrl(checkout.invoiceUrl || checkout.url);
      setPixCopy(isPlan ? null : checkout.pixCopyPaste);
      setPixQr(isPlan ? null : checkout.pixQrBase64);
      setAmount(checkout.amount);
      setDescription(checkout.description);
      if (checkout.expiresAt && !isPlan) setExpiresAt(new Date(checkout.expiresAt).getTime());
      try {
        const methods = await getPaymentMethods(user.id);
        setSavedCards(
          methods.filter((method) => method.last4 && (!isPlan || method.kind !== 'debit')),
        );
      } catch {
        setSavedCards([]);
      }
      setPhase('awaiting');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível abrir o pagamento'));
      setPhase('error');
    }
  }, [params.amount, params.appointmentId, params.customDescription, params.packagePurchaseId, params.planId, params.serviceId, user?.id]);

  useEffect(() => {
    if (!user) return;
    if (!isValidCpf(user.cpf) && !isValidCpf(cpfRef.current)) {
      setPhase('need_cpf');
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    void loadCheckout();
  }, [loadCheckout, user]);

  useEffect(() => {
    const tick = () => {
      if (expiresAt == null) {
        setRemaining(0);
        return;
      }
      setRemaining(Math.max(0, expiresAt - Date.now()));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (isPlan || expiresAt == null) return;
    if (phase !== 'awaiting' || remaining > 0) return;
    setPhase('expired');
  }, [expiresAt, isPlan, phase, remaining]);

  useEffect(() => {
    if (phase !== 'awaiting' || !paymentId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getPaymentStatus(paymentId);
        if (cancelled) return;
        if (status.pixQrBase64 && !isPlan) setPixQr(status.pixQrBase64);
        if (status.pixCopyPaste && !isPlan) setPixCopy(status.pixCopyPaste);
        if (status.invoiceUrl) {
          setInvoiceUrl((current) => {
            if (current && /checkoutSession/i.test(current) && !/checkoutSession/i.test(status.invoiceUrl || '')) {
              return current;
            }
            return status.invoiceUrl;
          });
        }
        if (status.paid) {
          setPhase('paid');
          if (!browserOpenRef.current) {
            await refresh();
            await offerNicknameIfNeeded();
          }
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
  }, [isPlan, phase, paymentId, refresh, offerNicknameIfNeeded]);

  const qrSource = useMemo(() => {
    if (!pixQr) return null;
    const uri = pixQr.startsWith('data:') ? pixQr : `data:image/png;base64,${pixQr}`;
    return { uri };
  }, [pixQr]);

  const leave = useCallback(() => {
    setNicknameCard(null);
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
    browserOpenRef.current = true;
    try {
      await WebBrowser.openBrowserAsync(invoiceUrl);
    } finally {
      browserOpenRef.current = false;
    }
    try {
      if (paymentId) {
        const status = await getPaymentStatus(paymentId);
        if (status.paid) {
          setPhase('paid');
          await refresh();
        }
      }
      await offerNicknameIfNeeded();
    } catch {
      // webhook continua sendo a fonte da verdade
    }
  };

  const payWithSaved = async (card: PaymentMethod) => {
    if (!user || !paymentId || chargingSavedId) return;
    setChargingSavedId(card.id);
    try {
      const result = await chargeSavedCard({
        userId: user.id,
        paymentId,
        appointmentId: params.appointmentId,
        packagePurchaseId: params.packagePurchaseId,
        savedCardId: card.id,
        planId: params.planId,
      });
      if (result.paid) {
        setPhase('paid');
        await refresh();
        await offerNicknameIfNeeded();
        return;
      }
      Alert.alert(
        'Cartão em análise',
        'Estamos confirmando a cobrança. Se não atualizar em alguns segundos, use o checkout seguro.',
      );
    } catch (requestError) {
      Alert.alert(
        'Não cobramos este cartão',
        getApiErrorMessage(
          requestError,
          isPlan
            ? 'Use outro cartão salvo ou o checkout seguro. Débito não assina o plano.'
            : 'Pague no checkout seguro ou com Pix.',
        ),
        [
          { text: 'Ok', style: 'cancel' },
          { text: 'Usar outro cartão', onPress: () => void openCard() },
        ],
      );
    } finally {
      setChargingSavedId(null);
    }
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

      {phase === 'need_cpf' ? (
        <View style={styles.centered}>
          <Ionicons name="id-card-outline" size={48} color={brand.rose} />
          <Text style={styles.successTitle}>CPF do pagador</Text>
          <Text style={styles.muted}>
            {isPlan
              ? 'O cartão no Asaas exige o CPF de quem vai pagar. Usamos só para emitir a assinatura.'
              : 'O Pix e o cartão no Asaas exigem o CPF de quem vai pagar. Usamos só para emitir a cobrança.'}
          </Text>
          <TextInput
            value={cpf}
            onChangeText={(value) => setCpf(maskCpf(value))}
            placeholder="000.000.000-00"
            placeholderTextColor={brand.muted}
            keyboardType="number-pad"
            style={styles.cpfInput}
            maxLength={14}
          />
          {cpf.replace(/\D/g, '').length === 11 && !isValidCpf(cpf) ? (
            <Text style={styles.errorText}>CPF inválido. Confira os dígitos.</Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.primaryButton, !isValidCpf(cpf) && styles.primaryButtonDisabled]}
            disabled={!isValidCpf(cpf)}
            onPress={() => void loadCheckout()}
          >
            <Text style={styles.primaryButtonText}>
              {isPlan ? 'Continuar para o cartão' : 'Continuar para o pagamento'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={brand.rose} size="large" />
          <Text style={styles.muted}>{isPlan ? 'Preparando o cartão…' : 'Gerando Pix seguro…'}</Text>
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
          <Text style={styles.muted}>
            {isPlan
              ? 'Sua assinatura está ativa. Os tratamentos do plano já podem ser agendados.'
              : 'Seu horário está reservado. A clínica confirma em seguida.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setNicknameCard(null);
              navigation.navigate('ClientTabs', { screen: 'Agenda' });
            }}
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
        <ScrollView contentContainerStyle={styles.body}>
          <LinearGradient colors={[brand.rose, brand.roseDeep]} style={styles.hero}>
            <Text style={styles.heroLabel}>Valor a pagar</Text>
            <Text style={styles.heroAmount}>{formatMoney(amount)}</Text>
            <Text style={styles.heroDesc} numberOfLines={2}>
              {description}
            </Text>
            {expiresAt != null ? (
              <View style={styles.timerPill}>
                <Ionicons name="hourglass-outline" size={16} color="white" />
                <Text style={styles.timerText}>Reserva expira em {formatCountdown(remaining)}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {!isPlan ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pague com Pix</Text>
            <Text style={styles.cardHint}>O pagamento cai na hora. Não compartilhe este QR fora do app.</Text>
            {qrSource ? (
              <Image source={qrSource} style={styles.qr} />
            ) : pixCopy ? (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={42} color={brand.rose} />
                <Text style={styles.muted}>Copie o código Pix abaixo para pagar no banco.</Text>
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <ActivityIndicator color={brand.rose} />
                <Text style={styles.muted}>Gerando QR Pix…</Text>
              </View>
            )}
            {pixCopy ? (
              <TouchableOpacity style={styles.copyButton} onPress={() => void copyPix()}>
                <Ionicons name="copy-outline" size={18} color={brand.roseDeep} />
                <Text style={styles.copyText}>Copiar código Pix</Text>
              </TouchableOpacity>
            ) : null}
            {pixCopy ? (
              <Text selectable style={styles.pixPayload} numberOfLines={3}>
                {pixCopy}
              </Text>
            ) : null}
          </View>
          ) : null}

          {savedCards.map((card) => {
            const charging = chargingSavedId === card.id;
            return (
              <TouchableOpacity
                key={card.id}
                style={styles.savedCardButton}
                onPress={() => void payWithSaved(card)}
                disabled={Boolean(chargingSavedId)}
              >
                <LinearGradient colors={[brand.rose, brand.roseDeep]} style={styles.savedCardGradient}>
                  {charging ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={22} color="white" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedCardTitle}>
                      Pagar agora com {savedCardLabel(card)}
                    </Text>
                    <Text style={styles.savedCardHint}>
                      {card.kind === 'debit'
                        ? 'Débito · só compras avulsas'
                        : card.nickname
                          ? `${cardBrandLabel(card.brand)}${card.last4 ? ` •••• ${card.last4}` : ''}${card.isDefault ? ' · principal' : ''}`
                          : card.isDefault
                            ? 'Cartão principal · um toque'
                            : 'Um toque. Sem preencher de novo.'}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.cardCta} onPress={() => void openCard()} activeOpacity={0.9}>
            <LinearGradient colors={['#3a1d2c', brand.roseDeep]} style={styles.cardCtaInner}>
              <Image source={creditCard3dSource} style={styles.cardCtaArt} resizeMode="contain" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardCtaKicker}>
                  {isPlan ? 'SOMENTE CRÉDITO · VISA · MASTER · ELO · AMEX' : 'CRÉDITO OU DÉBITO · VISA · MASTER · ELO · AMEX'}
                </Text>
                <Text style={styles.cardCtaTitle}>
                  {savedCards.length
                    ? isPlan
                      ? 'Usar outro cartão de crédito'
                      : 'Usar outro cartão'
                    : isPlan
                      ? 'Pagar com cartão de crédito'
                      : 'Pagar com crédito ou débito'}
                </Text>
                <Text style={styles.cardCtaHint}>
                  {isPlan
                    ? 'Abre o Asaas no navegador — captcha e cartão funcionam melhor lá. Ao voltar, esta tela confirma sozinha. Depois você escolhe um apelido para o cartão.'
                    : 'Abre o Asaas no navegador. Crédito ou débito. Depois você escolhe um apelido para aparecer na hora de pagar.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

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
          void updateSavedCard(card.id, { userId: user.id, nickname }).catch(() => {
            Alert.alert('Apelido', 'O pagamento já está ok. Você pode apelidar o cartão em Meu Plano.');
          });
        }}
      />
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
  cpfInput: {
    width: '100%',
    maxWidth: 280,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: brand.ink,
    textAlign: 'center',
    letterSpacing: 1,
  },
  primaryButtonDisabled: { opacity: 0.45 },
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
  savedCardButton: { borderRadius: 22, overflow: 'hidden' },
  savedCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  savedCardTitle: { color: 'white', fontWeight: '800', fontSize: 15 },
  savedCardHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  cardCta: { borderRadius: 24, overflow: 'hidden' },
  cardCtaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 108,
  },
  cardCtaArt: { width: 64, height: 64 },
  cardCtaKicker: { color: brand.goldSoft, fontWeight: '700', fontSize: 11, letterSpacing: 0.4 },
  cardCtaTitle: { color: 'white', fontWeight: '800', fontSize: 16 },
  cardCtaHint: { color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 17 },
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
