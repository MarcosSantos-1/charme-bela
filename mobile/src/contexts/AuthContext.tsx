import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  PhoneAuthProvider,
  EmailAuthProvider,
  OAuthProvider,
  signInWithCredential,
  linkWithCredential,
  type User as FirebaseUser,
  type ApplicationVerifier,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../lib/firebase';
import { getOrCreateUserFromFirebase, getUserByFirebaseUid, updateUser, User } from '../lib/api';
import { looksLikePhoneName, normalizePersonName } from '../lib/userDisplay';
import {
  clearPushTokenOnBackend,
  syncPushTokenToBackend,
} from '../lib/pushNotifications';

WebBrowser.maybeCompleteAuthSession();

const USER_CACHE_KEY = 'user_data';
const LAST_EMAIL_KEY = 'last_email';

export interface EmailCheckResult {
  exists: boolean;
  isPasswordAccount: boolean;
  oauthProvider: 'google' | 'apple' | 'other' | null;
}

interface PendingProfile {
  name?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  lastEmail: string | null;
  checkEmail: (email: string) => Promise<EmailCheckResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  /** Completa login Google a partir do id_token do expo-auth-session. */
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  /** Completa login Apple a partir do identityToken nativo + nonce. */
  signInWithAppleIdentityToken: (
    idToken: string,
    rawNonce: string,
    displayName?: string
  ) => Promise<void>;
  /** Envia SMS; retorna verificationId para confirmar depois. */
  sendPhoneVerification: (
    e164Phone: string,
    verifier: ApplicationVerifier
  ) => Promise<string>;
  confirmPhoneCode: (verificationId: string, code: string) => Promise<void>;
  /** Vincula Google à conta já logada (recuperação / segundo método). */
  linkGoogleIdToken: (idToken: string) => Promise<void>;
  /** Vincula Apple à conta já logada. */
  linkAppleIdentityToken: (idToken: string, rawNonce: string) => Promise<void>;
  /** Vincula e-mail+senha à conta (recuperação; não vira login principal na UI). */
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  /** Envia SMS para vincular telefone à conta atual. */
  sendPhoneLinkVerification: (
    e164Phone: string,
    verifier: ApplicationVerifier
  ) => Promise<string>;
  /** Confirma SMS e vincula telefone à conta atual. */
  confirmPhoneLink: (verificationId: string, code: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Atualiza o usuário em memória + cache (ex.: após anamnese). */
  setUserProfile: (next: User) => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

/** Mensagens amigáveis para erros comuns de vínculo Firebase. */
export function firebaseLinkErrorMessage(error: any): string {
  const code = String(error?.code || '');
  if (code.includes('credential-already-in-use')) {
    return 'Esse método já está vinculado a outra conta. Entre com ele ou use outro.';
  }
  if (code.includes('email-already-in-use')) {
    return 'Este e-mail já está em uso por outra conta.';
  }
  if (code.includes('account-exists-with-different-credential')) {
    return 'Já existe uma conta com este e-mail. Entre com o método original (Google, e-mail ou telefone).';
  }
  if (code.includes('provider-already-linked')) {
    return 'Esse método já está vinculado a esta conta.';
  }
  if (code.includes('requires-recent-login')) {
    return 'Por segurança, saia e entre de novo antes de vincular um novo método.';
  }
  if (code.includes('invalid-verification-code') || code.includes('invalid-verification-id')) {
    return 'Código inválido. Solicite um novo SMS e tente novamente.';
  }
  if (code.includes('weak-password')) {
    return 'Use uma senha com pelo menos 6 caracteres.';
  }
  if (code.includes('invalid-email')) {
    return 'E-mail inválido.';
  }
  return error?.message || 'Não foi possível vincular. Tente novamente.';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveAccountEmail(fbUser: FirebaseUser): string | null {
  if (fbUser.email) return fbUser.email;
  if (fbUser.phoneNumber) {
    const digits = fbUser.phoneNumber.replace(/\D/g, '');
    return `${digits}@phone.charmebela.local`;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const pendingProfile = useRef<PendingProfile | null>(null);

  useEffect(() => {
    // Só restaura lastEmail — NÃO hidratar `user` do cache sem sessão Firebase.
    // Cache stale fazia RootNavigator pular onboarding/login e cair na anamnese.
    AsyncStorage.getItem(LAST_EMAIL_KEY)
      .then((savedEmail) => {
        if (savedEmail) setLastEmail(savedEmail);
      })
      .catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      const email = fbUser ? resolveAccountEmail(fbUser) : null;
      if (!fbUser || !email) {
        setUser(null);
        await AsyncStorage.removeItem(USER_CACHE_KEY);
        setLoading(false);
        return;
      }

      // Splash entre login Firebase e home/anamnese (aguarda sync com backend)
      setLoading(true);
      try {
        const fromApple = normalizePersonName(pendingProfile.current?.name);
        const fromFirebase =
          fbUser.displayName && !looksLikePhoneName(fbUser.displayName)
            ? normalizePersonName(fbUser.displayName)
            : '';
        const backendUser = await getOrCreateUserFromFirebase({
          uid: fbUser.uid,
          email,
          displayName: fromApple || fromFirebase || undefined,
          phone: pendingProfile.current?.phone || fbUser.phoneNumber || undefined,
        });
        pendingProfile.current = null;
        setUser(backendUser);
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(backendUser));
        await AsyncStorage.setItem(LAST_EMAIL_KEY, backendUser.email);
        setLastEmail(backendUser.email);
        // Registra push em background (não bloqueia o splash)
        void syncPushTokenToBackend(backendUser.id);
      } catch (error) {
        console.error('Erro ao sincronizar usuário com backend:', error);
        // Sem perfil no backend, não entra no app — volta ao login
        setUser(null);
        await AsyncStorage.removeItem(USER_CACHE_KEY);
        try {
          await firebaseSignOut(auth);
        } catch {
          // ignora
        }
        setFirebaseUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkEmail = useCallback(async (email: string): Promise<EmailCheckResult> => {
    const methods = await fetchSignInMethodsForEmail(auth, email.trim());
    const isPasswordAccount = methods.includes('password');
    let oauthProvider: EmailCheckResult['oauthProvider'] = null;
    if (!isPasswordAccount && methods.length > 0) {
      if (methods.some((m) => m.includes('google'))) oauthProvider = 'google';
      else if (methods.some((m) => m.includes('apple'))) oauthProvider = 'apple';
      else oauthProvider = 'other';
    }
    return { exists: methods.length > 0, isPasswordAccount, oauthProvider };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    pendingProfile.current = { name, phone };
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name) {
      try {
        await updateProfile(cred.user, { displayName: name });
      } catch {
        // não crítico
      }
    }
  }, []);

  const signInWithGoogleIdToken = useCallback(async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  }, []);

  const signInWithAppleIdentityToken = useCallback(
    async (idToken: string, rawNonce: string, displayName?: string) => {
      if (displayName) {
        pendingProfile.current = {
          ...pendingProfile.current,
          name: normalizePersonName(displayName),
        };
      }
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken,
        rawNonce,
      });
      const cred = await signInWithCredential(auth, credential);
      const cleanedName = normalizePersonName(displayName);
      if (cleanedName && (!cred.user.displayName || cred.user.displayName.includes('+'))) {
        try {
          await updateProfile(cred.user, { displayName: cleanedName });
        } catch {
          // nome é opcional
        }
      }
    },
    []
  );

  const sendPhoneVerification = useCallback(
    async (e164Phone: string, verifier: ApplicationVerifier): Promise<string> => {
      pendingProfile.current = { phone: e164Phone };
      const provider = new PhoneAuthProvider(auth);
      return provider.verifyPhoneNumber(e164Phone, verifier);
    },
    []
  );

  const confirmPhoneCode = useCallback(async (verificationId: string, code: string) => {
    const credential = PhoneAuthProvider.credential(verificationId, code.trim());
    await signInWithCredential(auth, credential);
  }, []);

  const linkGoogleIdToken = useCallback(async (idToken: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Faça login antes de vincular o Google.');
    const credential = GoogleAuthProvider.credential(idToken);
    await linkWithCredential(current, credential);
  }, []);

  const linkAppleIdentityToken = useCallback(async (idToken: string, rawNonce: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Faça login antes de vincular a Apple.');
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken,
      rawNonce,
    });
    await linkWithCredential(current, credential);
  }, []);

  const linkEmailPassword = useCallback(async (email: string, password: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Faça login antes de vincular o e-mail.');
    const credential = EmailAuthProvider.credential(email.trim(), password);
    await linkWithCredential(current, credential);
  }, []);

  const sendPhoneLinkVerification = useCallback(
    async (e164Phone: string, verifier: ApplicationVerifier): Promise<string> => {
      const provider = new PhoneAuthProvider(auth);
      return provider.verifyPhoneNumber(e164Phone, verifier);
    },
    []
  );

  const confirmPhoneLink = useCallback(async (verificationId: string, code: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Faça login antes de vincular o telefone.');
    const credential = PhoneAuthProvider.credential(verificationId, code.trim());
    const result = await linkWithCredential(current, credential);
    const phone = result.user.phoneNumber || undefined;
    // Sincroniza phone no backend se já temos perfil
    const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
    if (phone && cached) {
      try {
        const parsed = JSON.parse(cached) as User;
        if (parsed?.id) {
          const updated = await updateUser(parsed.id, { phone });
          setUser(updated);
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(updated));
        }
      } catch {
        // vínculo Firebase ok; sync backend pode falhar sem bloquear
      }
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const setUserProfile = useCallback(async (next: User) => {
    setUser(next);
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(next));
  }, []);

  const refreshUser = useCallback(async () => {
    const fb = auth.currentUser;
    if (!fb) return null;
    try {
      const backendUser = await getUserByFirebaseUid(fb.uid);
      await setUserProfile(backendUser);
      return backendUser;
    } catch {
      return null;
    }
  }, [setUserProfile]);

  const signOut = useCallback(async () => {
    const currentId = user?.id;
    try {
      if (currentId) {
        await clearPushTokenOnBackend(currentId);
      }
      await firebaseSignOut(auth);
    } finally {
      await AsyncStorage.removeItem(USER_CACHE_KEY);
      setUser(null);
      setFirebaseUser(null);
    }
  }, [user?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        lastEmail,
        checkEmail,
        signIn,
        signUp,
        signInWithGoogleIdToken,
        signInWithAppleIdentityToken,
        sendPhoneVerification,
        confirmPhoneCode,
        linkGoogleIdToken,
        linkAppleIdentityToken,
        linkEmailPassword,
        sendPhoneLinkVerification,
        confirmPhoneLink,
        resetPassword,
        signOut,
        setUserProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
