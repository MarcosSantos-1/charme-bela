import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getOrCreateUserFromFirebase, User } from '../lib/api';

const USER_CACHE_KEY = 'user_data';
const LAST_EMAIL_KEY = 'last_email';

// Resultado do "email-first gate"
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
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  // Dados extras (nome/telefone) informados no cadastro, usados ao criar o user no backend
  const pendingProfile = useRef<PendingProfile | null>(null);

  useEffect(() => {
    // Restaura rapidamente o último usuário em cache (evita "flash" de login)
    (async () => {
      try {
        const [cached, savedEmail] = await Promise.all([
          AsyncStorage.getItem(USER_CACHE_KEY),
          AsyncStorage.getItem(LAST_EMAIL_KEY),
        ]);
        if (cached) setUser(JSON.parse(cached));
        if (savedEmail) setLastEmail(savedEmail);
      } catch {
        // ignora
      }
    })();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser || !fbUser.email) {
        setUser(null);
        await AsyncStorage.removeItem(USER_CACHE_KEY);
        setLoading(false);
        return;
      }

      try {
        const backendUser = await getOrCreateUserFromFirebase({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || pendingProfile.current?.name,
          phone: pendingProfile.current?.phone,
        });
        pendingProfile.current = null;
        setUser(backendUser);
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(backendUser));
        await AsyncStorage.setItem(LAST_EMAIL_KEY, backendUser.email);
        setLastEmail(backendUser.email);
      } catch (error) {
        console.error('Erro ao sincronizar usuário com backend:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Descobre se o email já existe e por qual método (email-first gate)
  const checkEmail = async (email: string): Promise<EmailCheckResult> => {
    const methods = await fetchSignInMethodsForEmail(auth, email.trim());
    const isPasswordAccount = methods.includes('password');
    let oauthProvider: EmailCheckResult['oauthProvider'] = null;
    if (!isPasswordAccount && methods.length > 0) {
      if (methods.some((m) => m.includes('google'))) oauthProvider = 'google';
      else if (methods.some((m) => m.includes('apple'))) oauthProvider = 'apple';
      else oauthProvider = 'other';
    }
    return { exists: methods.length > 0, isPasswordAccount, oauthProvider };
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    // onAuthStateChanged cuida da sincronização com o backend
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    pendingProfile.current = { name, phone };
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name) {
      try {
        await updateProfile(cred.user, { displayName: name });
      } catch {
        // não crítico
      }
    }
    // onAuthStateChanged cria o usuário no backend com nome/telefone pendentes
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } finally {
      await AsyncStorage.removeItem(USER_CACHE_KEY);
      setUser(null);
      setFirebaseUser(null);
    }
  };

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
        resetPassword,
        signOut,
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
