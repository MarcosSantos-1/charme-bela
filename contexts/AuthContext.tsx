'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User } from '@/types'
import toast from 'react-hot-toast'
import { saveAccount } from '@/lib/accountStorage'

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInAdmin: (username: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser?.uid)
      
      if (firebaseUser) {
        setFirebaseUser(firebaseUser)
        
        try {
          // Buscar dados do usuário no Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<User, 'id'>
            const fullUser = {
              id: firebaseUser.uid,
              ...userData
            }
            console.log('✅ User data from Firestore:', fullUser)
            setUser(fullUser)
            
            // Salvar conta no localStorage
            saveAccount({
              uid: firebaseUser.uid,
              email: fullUser.email,
              name: fullUser.name,
              photoURL: fullUser.profileImageUrl,
              lastLogin: Date.now()
            })
          } else {
            console.log('⚠️ User not found in Firestore, creating...')
            // Usuário do Firebase mas não tem no Firestore - criar perfil básico
            const newUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
              role: 'CLIENT',
              firebaseUid: firebaseUser.uid,
              profileImageUrl: firebaseUser.photoURL || undefined
            }
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser)
            console.log('✅ User created in Firestore:', newUser)
            setUser(newUser)
            
            // Salvar conta no localStorage
            saveAccount({
              uid: firebaseUser.uid,
              email: newUser.email,
              name: newUser.name,
              photoURL: newUser.profileImageUrl,
              lastLogin: Date.now()
            })
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error)
        }
      } else {
        console.log('🚪 User logged out')
        setFirebaseUser(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success('Login realizado com sucesso!')
    } catch (error: any) {
      console.error('Erro ao fazer login:', error)
      if (error.code === 'auth/invalid-credential') {
        toast.error('Email ou senha incorretos')
      } else {
        toast.error('Erro ao fazer login')
      }
      throw error
    }
  }

  const signInAdmin = async (username: string, password: string) => {
    try {
      console.log('🔑 Login admin - username:', username, 'password:', password)
      
      // Validação simples
      if (username === 'sonia.santana' && password === '2020') {
        console.log('✅ Credenciais válidas!')
        
        // Criar user fake para admin (sem Firebase)
        const adminUser: User = {
          id: 'admin-sonia-santana',
          email: 'sonia.santana@charmeebela.com',
          name: 'Sônia Santana',
          role: 'MANAGER',
          firebaseUid: 'admin-local'
        }
        
        // Salvar no estado
        setUser(adminUser)
        setLoading(false)
        
        toast.success('Bem-vinda, Sônia! 👋')
        console.log('✅ Admin logado com sucesso:', adminUser)
      } else {
        toast.error('Usuário ou senha incorretos')
        throw new Error('Credenciais inválidas')
      }
    } catch (error: any) {
      console.error('❌ Erro login admin:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      toast.success('Login com Google realizado!')
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error)
      toast.error('Erro ao fazer login com Google')
      throw error
    }
  }

  const signInWithApple = async () => {
    try {
      const provider = new OAuthProvider('apple.com')
      await signInWithPopup(auth, provider)
      toast.success('Login com Apple realizado!')
    } catch (error) {
      console.error('Erro ao fazer login com Apple:', error)
      toast.error('Erro ao fazer login com Apple')
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Criar perfil no Firestore
      const newUser: User = {
        id: userCredential.user.uid,
        email: email,
        name: name,
        role: 'CLIENT',
        firebaseUid: userCredential.user.uid
      }
      
      await setDoc(doc(db, 'users', userCredential.user.uid), newUser)
      toast.success('Conta criada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao criar conta:', error)
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este email já está em uso')
      } else {
        toast.error('Erro ao criar conta')
      }
      throw error
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      toast.success('Logout realizado com sucesso!')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      toast.error('Erro ao fazer logout')
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signIn,
        signInAdmin,
        signInWithGoogle,
        signInWithApple,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

