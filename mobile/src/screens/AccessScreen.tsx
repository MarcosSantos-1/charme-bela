import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { FirebaseRecaptchaVerifierModal } from '../lib/phone-recaptcha';
import { useAuth } from '../contexts/AuthContext';
import { brand } from '../theme/brand';
import { logoSource } from '../assets/brandAssets';
import { firebaseConfig } from '../lib/firebase';
import type { AuthStackParamList } from '../navigation/AuthNavigator';
import { KeyboardForm, dismissKeyboard } from '../components/KeyboardForm';

WebBrowser.maybeCompleteAuthSession();

type Step = 'methods' | 'phone' | 'otp';

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, '($1');
  if (digits.length <= 7) return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function PhoneField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.phoneRow}>
      <Text style={styles.phonePrefix}>+55</Text>
      <TextInput
        style={styles.phoneInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="(11) 99999-9999"
        placeholderTextColor="rgba(138,112,120,0.6)"
        keyboardType="phone-pad"
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={dismissKeyboard}
        autoFocus
      />
    </View>
  );
}

export function AccessScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signInWithGoogleIdToken, sendPhoneVerification, confirmPhoneCode } = useAuth();
  const [step, setStep] = useState<Step>('methods');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const recaptchaRef = useRef<any>(null);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneComplete = phoneDigits.length === 11;
  const codeComplete = code.every((d) => d !== '');

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  // Google exige redirect nativo específico:
  // - iOS: reversed client ID (com.googleusercontent.apps.<id>):/oauthredirect
  // - Android: package name:/oauthredirect (com Custom URI scheme ligado no Cloud Console)
  const iosReversedScheme = iosClientId
    ? `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`
    : undefined;
  const nativeRedirect = Platform.select({
    ios: iosReversedScheme ? `${iosReversedScheme}:/oauthredirect` : undefined,
    android: 'com.charmebela.app:/oauthredirect',
    default: undefined,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      // Web client = Firebase "Web client" (audience do id_token)
      webClientId,
      iosClientId,
      androidClientId,
    },
    { native: nativeRedirect }
  );

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token;
    if (!idToken) {
      Alert.alert('Erro', 'Token Google ausente. Verifique os Client IDs no .env.local.');
      return;
    }
    (async () => {
      setLoading(true);
      try {
        await signInWithGoogleIdToken(idToken);
      } catch (e: any) {
        Alert.alert('Não foi possível entrar', e?.message || 'Tente novamente.');
      } finally {
        setLoading(false);
      }
    })();
  }, [response, signInWithGoogleIdToken]);

  const handleGoogle = async () => {
    if (!webClientId) {
      Alert.alert(
        'Configuração pendente',
        'Defina EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (e o iOS/Android Client ID) no .env.local.'
      );
      return;
    }
    if (Platform.OS === 'ios' && !iosClientId) {
      Alert.alert(
        'Client ID iOS faltando',
        'Crie um OAuth Client do tipo iOS no Google Cloud (bundle br.com.charmebela.app) e defina EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Usar só o Web Client causa erro 400 invalid_request.'
      );
      return;
    }
    if (Platform.OS === 'android' && !androidClientId) {
      Alert.alert(
        'Client ID Android faltando',
        'Crie um OAuth Client do tipo Android (package com.charmebela.app + SHA-1) e defina EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID. Ative também "Custom URI scheme" no Cloud Console.'
      );
      return;
    }
    if (__DEV__ && request?.redirectUri) {
      console.log('[Google Auth] redirectUri=', request.redirectUri, 'clientIds=', {
        web: !!webClientId,
        ios: !!iosClientId,
        android: !!androidClientId,
      });
    }
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setLoading(false);
        return;
      }
      if (result.type !== 'success') {
        setLoading(false);
        Alert.alert(
          'Não foi possível entrar',
          'Falha no Google Sign-In. Use um dev build (npx expo run:android / run:ios), não o Expo Go. No Cloud Console, ative Custom URI scheme no client Android.'
        );
      }
      // success: o useEffect completa o login e zera o loading
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Não foi possível entrar', e?.message || 'Tente novamente.');
    }
  };

  const handleApple = () => {
    // Stub até Apple Developer / expo-apple-authentication
  };

  const handleSendCode = async () => {
    if (!phoneComplete || !recaptchaRef.current) return;
    dismissKeyboard();
    setLoading(true);
    try {
      const e164 = `+55${phoneDigits}`;
      const id = await sendPhoneVerification(e164, recaptchaRef.current);
      setVerificationId(id);
      setCode(['', '', '', '', '', '']);
      setStep('otp');
    } catch (e: any) {
      const msg =
        e?.code === 'auth/invalid-phone-number'
          ? 'Número inválido.'
          : e?.code === 'auth/too-many-requests'
            ? 'Muitas tentativas. Aguarde e tente de novo.'
            : e?.message || 'Não foi possível enviar o SMS.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationId || !codeComplete) return;
    dismissKeyboard();
    setLoading(true);
    try {
      await confirmPhoneCode(verificationId, code.join(''));
    } catch (e: any) {
      const msg =
        e?.code === 'auth/invalid-verification-code'
          ? 'Código inválido.'
          : e?.message || 'Não foi possível verificar o código.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleCodeKey = (i: number, key: string) => {
    if (key === 'Backspace' && !code[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[brand.blush, brand.background, brand.champagne]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* DEBUG: reabrir onboarding — remover depois dos testes de UI */}
      <TouchableOpacity
        style={styles.debugOnboardingBtn}
        onPress={() => navigation.navigate('Onboarding')}
        hitSlop={16}
        accessibilityLabel="Debug onboarding"
      />

      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification
      />

      {step !== 'methods' && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            dismissKeyboard();
            setStep(step === 'otp' ? 'phone' : 'methods');
          }}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color={brand.ink} />
        </TouchableOpacity>
      )}

      {step === 'methods' && (
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Acesse sua conta</Text>
            <Text style={styles.subtitle}>
              Entre para agendar, acompanhar sua ficha e aproveitar o Clube VIP.
            </Text>
          </View>

          <View style={styles.buttons}>
            {Platform.OS === 'android' ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGoogle, (loading || !request) && styles.btnDisabled]}
                  onPress={handleGoogle}
                  disabled={loading || !request}
                  activeOpacity={0.9}
                >
                  {loading && step === 'methods' ? (
                    <ActivityIndicator color={brand.ink} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color={brand.ink} />
                      <Text style={styles.btnGoogleText}>Continuar com Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnApple]} onPress={handleApple} activeOpacity={0.9}>
                  <Ionicons name="logo-apple" size={20} color={brand.white} />
                  <Text style={styles.btnAppleText}>Continuar com Apple</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnApple]} onPress={handleApple} activeOpacity={0.9}>
                  <Ionicons name="logo-apple" size={20} color={brand.white} />
                  <Text style={styles.btnAppleText}>Continuar com Apple</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnGoogle, (loading || !request) && styles.btnDisabled]}
                  onPress={handleGoogle}
                  disabled={loading || !request}
                  activeOpacity={0.9}
                >
                  {loading && step === 'methods' ? (
                    <ActivityIndicator color={brand.ink} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color={brand.ink} />
                      <Text style={styles.btnGoogleText}>Continuar com Google</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnPhone]}
              onPress={() => setStep('phone')}
              activeOpacity={0.9}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={brand.white} />
              <Text style={styles.btnPhoneText}>Continuar com celular</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={16} color={brand.muted} />
            <Text style={styles.footerText}>
              Seus dados são protegidos e usados apenas para seu atendimento.
            </Text>
          </View>
        </View>
      )}

      {step === 'phone' && (
        <KeyboardForm
          style={styles.stepForm}
          contentContainerStyle={styles.stepContent}
        >
          <Text style={styles.title}>Qual seu celular?</Text>
          <Text style={styles.subtitleLeft}>Enviaremos um código de verificação por SMS.</Text>

          <Text style={styles.fieldLabel}>Número de telefone</Text>
          <PhoneField value={phone} onChangeText={(t) => setPhone(maskPhone(t))} />

          <Pressable style={styles.stepSpacer} onPress={dismissKeyboard} />

          <View style={styles.stepFooter}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPhone, (!phoneComplete || loading) && styles.btnDisabled]}
              onPress={handleSendCode}
              disabled={!phoneComplete || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={brand.white} />
              ) : (
                <>
                  <Text style={styles.btnPhoneText}>Enviar código</Text>
                  <Ionicons name="arrow-forward" size={20} color={brand.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardForm>
      )}

      {step === 'otp' && (
        <KeyboardForm
          style={styles.stepForm}
          contentContainerStyle={styles.stepContent}
        >
          <Text style={styles.title}>Digite o código</Text>
          <Text style={styles.subtitleLeft}>
            Enviamos um SMS para <Text style={styles.phoneHighlight}>+55 {phone}</Text>
          </Text>

          <View style={styles.otpRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                style={styles.otpBox}
                value={digit}
                onChangeText={(v) => handleCodeChange(i, v)}
                onKeyPress={({ nativeEvent }) => handleCodeKey(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={i === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSendCode}
            disabled={loading}
            style={styles.resend}
          >
            <Text style={styles.resendText}>
              Não recebeu? <Text style={styles.resendAccent}>Reenviar código</Text>
            </Text>
          </TouchableOpacity>

          <Pressable style={styles.stepSpacer} onPress={dismissKeyboard} />

          <View style={styles.stepFooter}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPhone, (!codeComplete || loading) && styles.btnDisabled]}
              onPress={handleVerifyCode}
              disabled={!codeComplete || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={brand.white} />
              ) : (
                <>
                  <Text style={styles.btnPhoneText}>Verificar e continuar</Text>
                  <Ionicons name="arrow-forward" size={20} color={brand.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardForm>
      )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.background,
  },
  safe: {
    flex: 1,
  },
  debugOnboardingBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(120, 120, 120, 0.45)',
    zIndex: 30,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTop: {
    top: -40,
    right: -80,
    width: 220,
    height: 220,
    backgroundColor: brand.rose,
    opacity: 0.18,
  },
  orbBottom: {
    bottom: 96,
    left: -64,
    width: 240,
    height: 240,
    backgroundColor: brand.goldSoft,
    opacity: 0.28,
  },
  backBtn: {
    marginLeft: 24,
    marginTop: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  stepForm: {
    flex: 1,
  },
  stepContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  stepSpacer: {
    flexGrow: 1,
    minHeight: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 132,
    height: 132,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: brand.ink,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 280,
    fontSize: 15,
    lineHeight: 22,
    color: brand.muted,
    textAlign: 'center',
  },
  subtitleLeft: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: brand.muted,
  },
  buttons: {
    gap: 12,
  },
  btn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 999,
    paddingVertical: 16,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnApple: {
    backgroundColor: brand.ink,
    shadowColor: brand.ink,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnAppleText: {
    color: brand.white,
    fontSize: 16,
    fontWeight: '500',
  },
  btnGoogle: {
    backgroundColor: brand.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: brand.rose,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  btnGoogleText: {
    color: brand.ink,
    fontSize: 16,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: brand.border,
  },
  dividerText: {
    fontSize: 13,
    color: brand.muted,
  },
  btnPhone: {
    backgroundColor: brand.rose,
    shadowColor: brand.rose,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  btnPhoneText: {
    color: brand.white,
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: brand.muted,
  },
  fieldLabel: {
    marginTop: 28,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
    color: brand.ink,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 16,
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: '500',
    color: brand.muted,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: brand.ink,
  },
  stepFooter: {
    paddingBottom: 24,
    paddingTop: 12,
  },
  otpRow: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: brand.ink,
  },
  resend: {
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: brand.muted,
  },
  resendAccent: {
    fontWeight: '600',
    color: brand.rose,
  },
  phoneHighlight: {
    fontWeight: '600',
    color: brand.ink,
  },
});
