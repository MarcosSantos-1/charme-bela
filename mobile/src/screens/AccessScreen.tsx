import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

type Step = 'email' | 'login' | 'register' | 'oauth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  apple: 'Apple / iCloud',
  other: 'seu provedor',
};

export function AccessScreen() {
  const navigation = useNavigation<any>();
  const { checkEmail, signIn, signUp, resetPassword, lastEmail } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(lastEmail || '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetSecondary = () => {
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError('');
    setShowPassword(false);
  };

  const handleBack = () => {
    if (step !== 'email') {
      resetSecondary();
      setStep('email');
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = async () => {
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Digite um email válido.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await checkEmail(trimmed);
      if (result.isPasswordAccount) {
        setStep('login');
      } else if (result.oauthProvider) {
        setOauthProvider(result.oauthProvider);
        setStep('oauth');
      } else {
        setStep('register');
      }
    } catch (e: any) {
      if (e?.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError('Não foi possível verificar o email. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      setError('Digite sua senha.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e: any) {
      if (e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password') {
        setError('Senha incorreta.');
      } else if (e?.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Digite seu nome.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, name.trim());
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') {
        setError('Este email já possui conta. Entre com sua senha.');
        setStep('login');
      } else if (e?.code === 'auth/weak-password') {
        setError('Senha muito fraca (mínimo 6 caracteres).');
      } else {
        setError('Não foi possível criar a conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      await resetPassword(email);
      Alert.alert('Email enviado', 'Enviamos um link para redefinir sua senha.');
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o email de recuperação.');
    }
  };

  const handleOAuth = () => {
    Alert.alert(
      `Entrar com ${PROVIDER_LABEL[oauthProvider || 'other']}`,
      'Esta conta foi criada com login social. O login social no app será habilitado após a configuração das credenciais OAuth. Por enquanto, acesse pelo site ou use outro email.'
    );
  };

  const title =
    step === 'email'
      ? 'Acessar'
      : step === 'login'
      ? 'Bem-vinda de volta!'
      : step === 'register'
      ? 'Criar sua conta'
      : 'Login social';

  const subtitle =
    step === 'email'
      ? 'Informe seu email para continuar'
      : step === 'login'
      ? email
      : step === 'register'
      ? `Vamos criar seu acesso para ${email}`
      : email;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.flex}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputContainer, step !== 'email' && styles.inputReadonly]}>
                <Ionicons name="mail-outline" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  value={email}
                  onChangeText={setEmail}
                  editable={step === 'email'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholderTextColor="#9ca3af"
                />
                {step !== 'email' && (
                  <TouchableOpacity onPress={handleBack}>
                    <Text style={styles.changeLink}>alterar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {step === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            )}

            {(step === 'login' || step === 'register') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar senha</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            )}

            {step === 'login' && (
              <TouchableOpacity style={styles.forgot} onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            )}

            {step === 'oauth' && (
              <View style={styles.oauthBox}>
                <Text style={styles.oauthText}>
                  Você já tem acesso usando {PROVIDER_LABEL[oauthProvider || 'other']}.
                </Text>
              </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={
                step === 'email'
                  ? handleContinue
                  : step === 'login'
                  ? handleLogin
                  : step === 'register'
                  ? handleRegister
                  : handleOAuth
              }
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>
                  {step === 'email'
                    ? 'Continuar'
                    : step === 'login'
                    ? 'Entrar'
                    : step === 'register'
                    ? 'Criar conta'
                    : `Entrar com ${PROVIDER_LABEL[oauthProvider || 'other']}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  flex: { flex: 1 },
  backButton: { paddingHorizontal: 20, paddingTop: 8, width: 60 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 96,
    height: 60,
    marginBottom: 12,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputReadonly: { backgroundColor: '#f3f4f6' },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, fontSize: 16, color: '#111827' },
  changeLink: { color: '#ec4899', fontWeight: '600', fontSize: 13 },
  forgot: { alignSelf: 'flex-end', marginBottom: 8 },
  forgotText: { color: '#ec4899', fontWeight: '600', fontSize: 14 },
  oauthBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  oauthText: { color: '#1e3a8a', fontSize: 14, lineHeight: 20 },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12 },
  button: {
    backgroundColor: '#ec4899',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
