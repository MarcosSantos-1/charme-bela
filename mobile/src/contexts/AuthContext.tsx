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
  signInWithCredential,
  type User as FirebaseUser,
  type ApplicationVerifier,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import { auth } from '../lib/firebase';
import { getOrCreateUserFromFirebase, getUserByFirebaseUid, User } from '../lib/api';
import { looksLikePhoneName } from '../lib/userDisplay';

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
  /** Envia SMS; retorna verificationId para confirmar depois. */
  sendPhoneVerification: (
    e164Phone: string,
    verifier: ApplicationVerifier
  ) => Promise<string>;
  confirmPhoneCode: (verificationId: string, code: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Atualiza o usuário em memória + cache (ex.: após anamnese). */
  setUserProfile: (next: User) => Promise<void>;
  refreshUser: () => Promise<User | null>;
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
        const backendUser = await getOrCreateUserFromFirebase({
          uid: fbUser.uid,
          email,
          displayName:
            (fbUser.displayName && !looksLikePhoneName(fbUser.displayName)
              ? fbUser.displayName
              : undefined) ||
            pendingProfile.current?.name ||
            undefined,
          phone: pendingProfile.current?.phone || fbUser.phoneNumber || undefined,
        });
        pendingProfile.current = null;
        setUser(backendUser);
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(backendUser));
        await AsyncStorage.setItem(LAST_EMAIL_KEY, backendUser.email);
        setLastEmail(backendUser.email);
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
    try {
      await firebaseSignOut(auth);
    } finally {
      await AsyncStorage.removeItem(USER_CACHE_KEY);
      setUser(null);
      setFirebaseUser(null);
    }
  }, []);

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
        sendPhoneVerification,
        confirmPhoneCode,
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
