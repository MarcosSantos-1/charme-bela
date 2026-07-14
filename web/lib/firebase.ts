import { initializeApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA1CKTLfGcmt5Xf68wvQhMD92J_vP_6F90",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "charme-bela-33906.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "charme-bela-33906",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "charme-bela-33906.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "690927382095",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:690927382095:web:2db390a82624c20c3ac43a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-E4R62L9TGE"
}

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)

// Configurar persistência local (mantém login mesmo após fechar navegador)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Erro ao configurar persistência:', error)
  })
}

// Initialize Analytics (only in browser)
let analytics: ReturnType<typeof getAnalytics> | null = null
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  })
}

export { analytics }
export default app

