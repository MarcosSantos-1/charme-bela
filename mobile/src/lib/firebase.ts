// Firebase (JS SDK) para o app mobile.
// Usa o mesmo projeto do site (charme-bela-33906) e persistência via AsyncStorage,
// funcionando no Expo Go (sem build nativo). Auth por email/senha + detecção de
// provedores do email (email-first gate).
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // getReactNativePersistence pode não estar tipado em algumas versões, mas existe em runtime
  // @ts-ignore
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Config do projeto (mesma do site). A apiKey de client é pública por design.
export const firebaseConfig = {
  apiKey: 'AIzaSyA1CKTLfGcmt5Xf68wvQhMD92J_vP_6F90',
  authDomain: 'charme-bela-33906.firebaseapp.com',
  projectId: 'charme-bela-33906',
  storageBucket: 'charme-bela-33906.firebasestorage.app',
  messagingSenderId: '690927382095',
  appId: '1:690927382095:web:2db390a82624c20c3ac43a',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializa o Auth com persistência em AsyncStorage. Se já foi inicializado
// (fast refresh), cai no getAuth para evitar erro de dupla inicialização.
let firebaseAuth: Auth;
try {
  firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  firebaseAuth = getAuth(app);
}

export const auth = firebaseAuth;
export default app;
