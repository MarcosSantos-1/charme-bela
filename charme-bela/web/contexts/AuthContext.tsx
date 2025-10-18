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
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  sendEmailVerification
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { User } from '@/types'
import toast from 'react-hot-toast'
import { saveAccount } from '@/lib/accountStorage'
import { getUserByFirebaseUid, getOrCreateUserFromFirebase } from '@/lib/api'

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
  resetPassword: (email: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 🔑 Verificar se existe admin logado no localStorage
    const checkAdminSession = () => {
      const adminSession = localStorage.getItem('adminSession')
      if (adminSession) {
        try {
          const adminUser = JSON.parse(adminSession)
          console.log('✅ Admin session restored:', adminUser.name)
          setUser(adminUser)
          setLoading(false)
          return true
        } catch (error) {
          console.error('❌ Error parsing admin session:', error)
          localStorage.removeItem('adminSession')
        }
      }
      return false
    }

    // Primeiro tenta restaurar sessão admin
    const hasAdminSession = checkAdminSession()
    
    // Se não tem sessão admin, escuta mudanças do Firebase
    if (!hasAdminSession) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('🔐 Auth state changed:', firebaseUser?.uid)
        
        if (firebaseUser) {
          setFirebaseUser(firebaseUser)
          
          try {
            // 🚀 INTEGRAÇÃO COM BACKEND POSTGRESQL
            console.log('🔍 Buscando usuário no backend...')
            
            const backendUser = await getOrCreateUserFromFirebase({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
              photoURL: firebaseUser.photoURL || undefined
            })
            
            console.log('✅ User data from Backend:', backendUser)
            setUser(backendUser)
            
            // Salvar conta no localStorage
            saveAccount({
              uid: firebaseUser.uid,
              email: backendUser.email,
              name: backendUser.name,
              photoURL: backendUser.profileImageUrl,
              lastLogin: Date.now()
            })
          } catch (error) {
            console.error('❌ Error fetching user from backend:', error)
            toast.error('Erro ao buscar dados do usuário')
          }
        } else {
          console.log('🚪 User logged out')
          setFirebaseUser(null)
          setUser(null)
        }
        setLoading(false)
      })

      return () => unsubscribe()
    }
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
          firebaseUid: 'admin-local',
          isActive: true
        }
        
        // 💾 Salvar sessão admin no localStorage
        localStorage.setItem('adminSession', JSON.stringify(adminUser))
        
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
      provider.addScope('email')
      provider.addScope('profile')
      
      const result = await signInWithPopup(auth, provider)
      console.log('✅ Login com Google realizado:', result.user.email)
      toast.success('Login com Google realizado!')
    } catch (error: any) {
      console.error('❌ Erro ao fazer login com Google:', error)
      
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Login cancelado.')
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup bloqueado. Permita popups para este site.')
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Usuário fechou o popup, não mostrar erro
        return
      } else {
        toast.error('Erro ao fazer login com Google. Tente novamente.')
      }
      throw error
    }
  }

  const signInWithApple = async () => {
    try {
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      
      const result = await signInWithPopup(auth, provider)
      console.log('✅ Login com Apple realizado:', result.user.email)
      toast.success('Login com Apple realizado!')
    } catch (error: any) {
      console.error('❌ Erro ao fazer login com Apple:', error)
      
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Login com Apple não está ativado. Entre em contato com o suporte.')
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Login cancelado.')
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup bloqueado. Permita popups para este site.')
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado. Configure o Firebase primeiro.')
      } else {
        toast.error('Login com Apple temporariamente indisponível. Tente login com Google ou email.')
      }
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Atualizar perfil do Firebase Auth
      await firebaseUpdateProfile(userCredential.user, {
        displayName: name
      })
      
      // 🚀 Backend PostgreSQL vai criar automaticamente via getOrCreateUserFromFirebase
      // quando o usuário logar pela primeira vez
      console.log('✅ Conta criada no Firebase:', userCredential.user.uid)
      
      // Enviar email de verificação
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}/cliente`,
          handleCodeInApp: false
        }
        await sendEmailVerification(userCredential.user, actionCodeSettings)
        console.log('✅ Email de verificação enviado automaticamente')
        toast.success('Conta criada! Verifique seu email para confirmar. 🎉📧')
      } catch (verifyError) {
        console.error('⚠️ Erro ao enviar email de verificação:', verifyError)
        toast.success('Conta criada com sucesso! 🎉')
      }
    } catch (error: any) {
      console.error('Erro ao criar conta:', error)
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este email já está em uso. Tente fazer login.')
      } else if (error.code === 'auth/weak-password') {
        toast.error('A senha deve ter pelo menos 6 caracteres')
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email inválido')
      } else {
        toast.error('Erro ao criar conta. Tente novamente.')
      }
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      // Configurações para o email de recuperação em português
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false
      }
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings)
      console.log('✅ Email de recuperação enviado para:', email)
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada. 📧')
    } catch (error: any) {
      console.error('❌ Erro ao enviar email de recuperação:', error)
      if (error.code === 'auth/user-not-found') {
        toast.error('Email não encontrado. Verifique o endereço digitado.')
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Email inválido. Digite um email válido.')
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      } else {
        toast.error('Erro ao enviar email. Tente novamente.')
      }
      throw error
    }
  }

  const sendVerificationEmail = async () => {
    try {
      const currentUser = auth.currentUser
      
      if (!currentUser) {
        toast.error('Você precisa estar logado para enviar email de verificação')
        throw new Error('Usuário não autenticado')
      }

      if (currentUser.emailVerified) {
        toast.success('Seu email já está verificado! ✅')
        return
      }

      const actionCodeSettings = {
        url: `${window.location.origin}/cliente`,
        handleCodeInApp: false
      }

      await sendEmailVerification(currentUser, actionCodeSettings)
      console.log('✅ Email de verificação enviado para:', currentUser.email)
      toast.success('Email de verificação enviado! Verifique sua caixa de entrada. 📧')
    } catch (error: any) {
      console.error('❌ Erro ao enviar email de verificação:', error)
      if (error.code === 'auth/too-many-requests') {
        toast.error('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      } else {
        toast.error('Erro ao enviar email de verificação. Tente novamente.')
      }
      throw error
    }
  }

  const signOut = async () => {
    try {
      // Limpar sessão admin se existir
      localStorage.removeItem('adminSession')
      
      // Limpar Firebase auth se tiver usuário Firebase
      if (firebaseUser) {
        await firebaseSignOut(auth)
      }
      
      // Limpar estado
      setUser(null)
      setFirebaseUser(null)
      
      toast.success('Logout realizado com sucesso!')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      toast.error('Erro ao fazer logout')
      throw error
    }
  }

  const refetchUser = async () => {
    try {
      if (!firebaseUser) return
      
      console.log('🔄 Atualizando dados do usuário...')
      const userData = await getUserByFirebaseUid(firebaseUser.uid)
      setUser(userData)
      console.log('✅ Dados do usuário atualizados')
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error)
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
        signOut,
        resetPassword,
        sendVerificationEmail,
        refetchUser
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

