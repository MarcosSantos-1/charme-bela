import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  useAuth,
  firebaseLinkErrorMessage,
} from '../../../contexts/AuthContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { KeyboardForm, dismissKeyboard } from '../../../components/KeyboardForm';
import {
  displayUserName,
  isPhoneLocalEmail,
  phonePrefillFromUser,
} from '../../../lib/userDisplay';
import {
  getAnamnesis,
  saveAnamnesis,
  updateUser,
} from '../../../lib/api';
import { auth, firebaseConfig } from '../../../lib/firebase';
import { FirebaseRecaptchaVerifierModal } from '../../../lib/phone-recaptcha';

WebBrowser.maybeCompleteAuthSession();

function maskBirthDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, '($1');
  if (digits.length <= 7) return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function FormField({
  label,
  icon,
  ...inputProps
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
} & ComponentProps<typeof TextInput>) {
  const { editable = true, ...rest } = inputProps;

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, !editable && styles.inputReadonly]}>
        <Ionicons name={icon} size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholderTextColor="#9ca3af"
          editable={editable}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={dismissKeyboard}
          {...rest}
        />
      </View>
    </View>
  );
}

type ProviderId = 'google.com' | 'apple.com' | 'phone' | 'password';

function providerLabel(id: string): string {
  switch (id) {
    case 'google.com':
      return 'Google';
    case 'apple.com':
      return 'Apple';
    case 'phone':
      return 'Telefone';
    case 'password':
      return 'E-mail';
    default:
      return id;
  }
}

function providerIcon(id: string): keyof typeof Ionicons.glyphMap {
  switch (id) {
    case 'google.com':
      return 'logo-google';
    case 'apple.com':
      return 'logo-apple';
    case 'phone':
      return 'call-outline';
    case 'password':
      return 'mail-outline';
    default:
      return 'key-outline';
  }
}

export function PersonalDataScreen({ onBack }: { onBack: () => void }) {
  const {
    user,
    firebaseUser,
    setUserProfile,
    linkGoogleIdToken,
    linkEmailPassword,
    sendPhoneLinkVerification,
    confirmPhoneLink,
  } = useAuth();

  const contactEmail =
    user?.email && !isPhoneLocalEmail(user.email) ? user.email : '';

  const [phone, setPhone] = useState(() => phonePrefillFromUser(user));
  const [birthDate, setBirthDate] = useState('');
  const [loadingForm, setLoadingForm] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [providersTick, setProvidersTick] = useState(0);

  const [showEmailLink, setShowEmailLink] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');

  const [showPhoneLink, setShowPhoneLink] = useState(false);
  const [linkPhone, setLinkPhone] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(null);
  const recaptchaRef = useRef<any>(null);

  const linkedProviders = useMemo(() => {
    void providersTick;
    const data = auth.currentUser?.providerData ?? firebaseUser?.providerData ?? [];
    return new Set(data.map((p) => p.providerId));
  }, [firebaseUser, providersTick]);

  const refreshProviders = useCallback(async () => {
    try {
      await auth.currentUser?.reload();
    } catch {
      // ignore
    }
    setProvidersTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setLoadingForm(false);
        return;
      }
      try {
        const form = await getAnamnesis(user.id);
        if (!cancelled && form?.personalData?.birthDate) {
          setBirthDate(maskBirthDate(String(form.personalData.birthDate)));
        }
      } catch {
        // sem anamnese ainda
      } finally {
        if (!cancelled) setLoadingForm(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
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
      setLinking(true);
      try {
        await linkGoogleIdToken(idToken);
        await refreshProviders();
        Alert.alert('Pronto', 'Google vinculado à sua conta.');
      } catch (e: any) {
        Alert.alert('Não foi possível vincular', firebaseLinkErrorMessage(e));
      } finally {
        setLinking(false);
      }
    })();
  }, [response, linkGoogleIdToken, refreshProviders]);

  const handleSave = async () => {
    if (!user?.id) return;
    dismissKeyboard();
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length < 10) {
      Alert.alert('Telefone inválido', 'Informe um telefone com DDD.');
      return;
    }
    if (birthDate && birthDate.replace(/\D/g, '').length > 0 && birthDate.replace(/\D/g, '').length < 8) {
      Alert.alert('Data inválida', 'Use o formato DD/MM/AAAA.');
      return;
    }

    setSaving(true);
    try {
      const e164 = phoneDigits
        ? phoneDigits.startsWith('55') && phoneDigits.length >= 12
          ? `+${phoneDigits}`
          : `+55${phoneDigits}`
        : undefined;

      if (e164) {
        const updated = await updateUser(user.id, { phone: e164 });
        await setUserProfile(updated);
      }

      if (birthDate.replace(/\D/g, '').length === 8) {
        const current = await getAnamnesis(user.id);
        await saveAnamnesis(user.id, {
          personalData: {
            ...(current?.personalData || {}),
            birthDate: birthDate.trim(),
            ...(e164 ? { phone: e164 } : {}),
          },
          lifestyleData: current?.lifestyleData || {},
          healthData: current?.healthData || {},
          objectivesData: current?.objectivesData || {},
          termsAccepted: current?.termsAccepted === true,
          schemaVersion: current?.schemaVersion ?? 2,
        });
      }

      Alert.alert('Salvo', 'Seus dados foram atualizados.');
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e?.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (!webClientId) {
      Alert.alert('Configuração pendente', 'Defina os Client IDs do Google no .env.local.');
      return;
    }
    setLinking(true);
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setLinking(false);
        return;
      }
      if (result.type !== 'success') {
        setLinking(false);
        Alert.alert('Não foi possível vincular', 'Falha no Google Sign-In.');
      }
    } catch (e: any) {
      setLinking(false);
      Alert.alert('Não foi possível vincular', e?.message || 'Tente novamente.');
    }
  };

  const handleLinkEmail = async () => {
    if (!linkEmail.trim() || linkPassword.length < 6) {
      Alert.alert('Dados incompletos', 'Informe e-mail e senha com pelo menos 6 caracteres.');
      return;
    }
    setLinking(true);
    try {
      await linkEmailPassword(linkEmail.trim(), linkPassword);
      await refreshProviders();
      setShowEmailLink(false);
      setLinkPassword('');
      Alert.alert(
        'Pronto',
        'E-mail vinculado para recuperação. Você pode usar “Esqueci minha senha” no login se precisar.'
      );
    } catch (e: any) {
      Alert.alert('Não foi possível vincular', firebaseLinkErrorMessage(e));
    } finally {
      setLinking(false);
    }
  };

  const handleSendPhoneLink = async () => {
    const digits = linkPhone.replace(/\D/g, '');
    if (digits.length < 10 || !recaptchaRef.current) return;
    setLinking(true);
    try {
      const id = await sendPhoneLinkVerification(`+55${digits}`, recaptchaRef.current);
      setPhoneVerificationId(id);
      Alert.alert('SMS enviado', 'Digite o código recebido para vincular o telefone.');
    } catch (e: any) {
      Alert.alert('Não foi possível enviar SMS', firebaseLinkErrorMessage(e));
    } finally {
      setLinking(false);
    }
  };

  const handleConfirmPhoneLink = async () => {
    if (!phoneVerificationId || linkCode.trim().length < 6) {
      Alert.alert('Código incompleto', 'Informe o código de 6 dígitos.');
      return;
    }
    setLinking(true);
    try {
      await confirmPhoneLink(phoneVerificationId, linkCode.trim());
      await refreshProviders();
      setShowPhoneLink(false);
      setPhoneVerificationId(null);
      setLinkCode('');
      Alert.alert('Pronto', 'Telefone vinculado à sua conta.');
    } catch (e: any) {
      Alert.alert('Não foi possível vincular', firebaseLinkErrorMessage(e));
    } finally {
      setLinking(false);
    }
  };

  const methods: { id: ProviderId; linked: boolean }[] = [
    { id: 'google.com', linked: linkedProviders.has('google.com') },
    { id: 'apple.com', linked: linkedProviders.has('apple.com') },
    { id: 'phone', linked: linkedProviders.has('phone') },
    { id: 'password', linked: linkedProviders.has('password') },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dados Pessoais</Text>
        <View style={{ width: 40 }} />
      </ScreenHeader>

      <KeyboardForm style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* SaaS: upload de foto do cliente
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayUserName(user).charAt(0).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={20} color="#ec4899" />
          </TouchableOpacity>
        </View>
        */}

        <View style={styles.initialBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayUserName(user).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.initialHint}>Foto de perfil em breve no app multi-clínica</Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="Nome Completo"
            icon="person-outline"
            value={displayUserName(user, '')}
            placeholder="Seu nome completo"
            editable={false}
          />
          <FormField
            label="Email"
            icon="mail-outline"
            value={contactEmail}
            placeholder={isPhoneLocalEmail(user?.email) ? 'Conta por celular' : 'seu@email.com'}
            keyboardType="email-address"
            editable={false}
          />
          <FormField
            label="Telefone"
            icon="call-outline"
            value={phone}
            onChangeText={(t) => setPhone(maskPhone(t))}
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            editable
          />
          <FormField
            label="Data de Nascimento"
            icon="calendar-outline"
            value={birthDate}
            onChangeText={(t) => setBirthDate(maskBirthDate(t))}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            editable
          />
          {/* SaaS: campo CPF
          <FormField
            label="CPF"
            icon="card-outline"
            placeholder="000.000.000-00"
            keyboardType="number-pad"
          />
          */}
        </View>

        {loadingForm && (
          <ActivityIndicator color="#ec4899" style={{ marginVertical: 12 }} />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métodos de acesso</Text>
          <Text style={styles.helpText}>
            Não há senha do app: você entra com Google, Apple ou Telefone. Para recuperar o
            acesso, use o mesmo método. Recomendamos vincular um segundo método (ex.: Google
            se entrou só com telefone).
          </Text>

          {methods.map((m) => (
            <View key={m.id} style={styles.methodRow}>
              <View style={styles.methodLeft}>
                <Ionicons name={providerIcon(m.id)} size={22} color="#6b7280" />
                <Text style={styles.methodLabel}>{providerLabel(m.id)}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  m.linked ? styles.badgeOn : styles.badgeOff,
                ]}
              >
                <Text style={[styles.badgeText, m.linked ? styles.badgeTextOn : styles.badgeTextOff]}>
                  {m.linked ? 'Vinculado' : 'Não vinculado'}
                </Text>
              </View>
            </View>
          ))}

          {!linkedProviders.has('google.com') && (
            <TouchableOpacity
              style={styles.linkAction}
              onPress={handleLinkGoogle}
              disabled={linking || !request}
            >
              <Ionicons name="logo-google" size={18} color="#ec4899" />
              <Text style={styles.linkActionText}>Vincular Google</Text>
            </TouchableOpacity>
          )}

          {!linkedProviders.has('password') && (
            <>
              <TouchableOpacity
                style={styles.linkAction}
                onPress={() => setShowEmailLink((v) => !v)}
                disabled={linking}
              >
                <Ionicons name="mail-outline" size={18} color="#ec4899" />
                <Text style={styles.linkActionText}>Vincular e-mail de recuperação</Text>
              </TouchableOpacity>
              {showEmailLink && (
                <View style={styles.linkForm}>
                  <TextInput
                    style={styles.linkInput}
                    placeholder="seu@email.com"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={linkEmail}
                    onChangeText={setLinkEmail}
                  />
                  <TextInput
                    style={styles.linkInput}
                    placeholder="Senha (mín. 6)"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    value={linkPassword}
                    onChangeText={setLinkPassword}
                  />
                  <TouchableOpacity
                    style={styles.linkSubmit}
                    onPress={handleLinkEmail}
                    disabled={linking}
                  >
                    <Text style={styles.linkSubmitText}>Confirmar vínculo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {!linkedProviders.has('phone') && (
            <>
              <TouchableOpacity
                style={styles.linkAction}
                onPress={() => setShowPhoneLink((v) => !v)}
                disabled={linking}
              >
                <Ionicons name="call-outline" size={18} color="#ec4899" />
                <Text style={styles.linkActionText}>Vincular telefone</Text>
              </TouchableOpacity>
              {showPhoneLink && (
                <View style={styles.linkForm}>
                  <TextInput
                    style={styles.linkInput}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    value={linkPhone}
                    onChangeText={(t) => setLinkPhone(maskPhone(t))}
                  />
                  {!phoneVerificationId ? (
                    <TouchableOpacity
                      style={styles.linkSubmit}
                      onPress={handleSendPhoneLink}
                      disabled={linking}
                    >
                      <Text style={styles.linkSubmitText}>Enviar SMS</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TextInput
                        style={styles.linkInput}
                        placeholder="Código SMS"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={linkCode}
                        onChangeText={setLinkCode}
                      />
                      <TouchableOpacity
                        style={styles.linkSubmit}
                        onPress={handleConfirmPhoneLink}
                        disabled={linking}
                      >
                        <Text style={styles.linkSubmitText}>Confirmar código</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (saving || linking) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || linking}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      </KeyboardForm>

      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  initialBlock: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  initialHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // SaaS: estilos de upload de foto
  // avatarSection / editAvatarButton
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputReadonly: {
    backgroundColor: '#f3f4f6',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodLabel: {
    fontSize: 16,
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOn: {
    backgroundColor: '#d1fae5',
  },
  badgeOff: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextOn: {
    color: '#047857',
  },
  badgeTextOff: {
    color: '#6b7280',
  },
  linkAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fdf2f8',
    borderWidth: 1,
    borderColor: '#fce7f3',
  },
  linkActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ec4899',
  },
  linkForm: {
    marginTop: 10,
    gap: 10,
  },
  linkInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  linkSubmit: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkSubmitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  saveButton: {
    margin: 20,
    backgroundColor: '#ec4899',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
