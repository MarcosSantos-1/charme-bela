'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getSavedAccounts, removeAccount, SavedAccount } from '@/lib/accountStorage'
import toast from 'react-hot-toast'
import { Avatar } from '@/components/Avatar'
import { auth } from '@/lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [showAccountSelector, setShowAccountSelector] = useState(true)
  const { signIn, signInWithGoogle, user, firebaseUser } = useAuth()
  const router = useRouter()

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user && firebaseUser) {
      console.log('✅ Usuário já logado, redirecionando...')
      router.push('/cliente')
    }
  }, [user, firebaseUser, router])

  useEffect(() => {
    const accounts = getSavedAccounts()
    setSavedAccounts(accounts)
    setShowAccountSelector(accounts.length > 0)
  }, [])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await signIn(email, password)
      router.push('/cliente')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
      router.push('/cliente')
    } catch (error) {
      console.error(error)
    }
  }

  const handleQuickLogin = async (account: SavedAccount) => {
    setLoading(true)
    
    try {
      console.log('🔄 Tentando login rápido para:', account.email)
      
      // Aguardar um pouco para o AuthContext carregar (caso esteja inicializando)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verificar se o Firebase tem sessão ativa
      const currentUser = auth.currentUser
      
      if (currentUser) {
        if (currentUser.uid === account.uid) {
          // Sessão correta e ativa
          console.log('✅ Sessão ativa! Redirecionando...')
          toast.success(`Bem-vinda de volta, ${account.name}!`)
          router.push('/cliente')
        } else {
          // Sessão de outro usuário
          console.log('⚠️ Sessão de outro usuário detectada')
          toast.error('Por favor, faça logout da conta atual primeiro.')
          setShowAccountSelector(false)
        }
      } else {
        // Não há sessão ativa - precisa fazer login novamente
        console.log('❌ Nenhuma sessão ativa. Solicitando login manual...')
        toast.error('Sua sessão expirou. Por favor, faça login novamente.')
        
        // Preencher o email automaticamente para facilitar
        setEmail(account.email)
        setShowAccountSelector(false)
      }
    } catch (error) {
      console.error('❌ Erro ao verificar sessão:', error)
      toast.error('Erro ao acessar conta. Tente fazer login novamente.')
      setEmail(account.email)
      setShowAccountSelector(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAccount = (uid: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeAccount(uid)
    const updated = getSavedAccounts()
    setSavedAccounts(updated)
    setShowAccountSelector(updated.length > 0)
  }

  // Mostrar seletor de contas se houver contas salvas
  if (showAccountSelector && savedAccounts.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Escolha uma conta
            </h2>
            <p className="text-gray-600">
              para continuar no Charme & Bela
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {savedAccounts.map((account) => (
              <button
                key={account.uid}
                onClick={() => handleQuickLogin(account)}
                disabled={loading}
                className="group w-full flex items-center space-x-4 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-pink-300 hover:shadow-lg transition-all relative disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Avatar 
                  name={account.name}
                  photoURL={account.photoURL}
                  size="md"
                  className="flex-shrink-0"
                />
                
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.email}</div>
                  {auth.currentUser?.uid === account.uid && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600">Sessão ativa</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => handleRemoveAccount(account.uid, e)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                  title="Remover"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAccountSelector(false)}
            className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Usar outra conta
          </button>

          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-pink-600">
              ← Voltar para o site
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Imagem/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-pink-500 to-pink-700 p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Charme & Bela
          </h1>
          <p className="text-pink-100 text-lg">
            Sua beleza, nosso cuidado
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-xl mb-2">✨ Transforme sua beleza</h3>
            <p className="text-pink-100">
              Acesse tratamentos exclusivos, agende consultas e acompanhe sua jornada de transformação.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-xl mb-2">📅 Agendamento Fácil</h3>
            <p className="text-pink-100">
              Reserve seus horários com praticidade e receba lembretes automáticos.
            </p>
          </div>
        </div>

        <div className="text-pink-100 text-sm">
          © 2025 Charme & Bela. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden text-center">
            <h1 className="text-3xl font-bold text-pink-600 mb-2">
              Charme & Bela
            </h1>
            <p className="text-gray-600">Sua beleza, nosso cuidado</p>
          </div>

          {/* Back to accounts button */}
          {savedAccounts.length > 0 && (
            <button
              onClick={() => setShowAccountSelector(true)}
              className="flex items-center text-sm text-gray-600 hover:text-pink-600 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar para contas salvas
            </button>
          )}

          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/images/logo.png"
                alt="Charme & Bela"
                width={180}
                height={60}
                className="object-contain"
              />
            </div>
            <p className="text-gray-600">
              Entre com sua conta para continuar
            </p>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-medium text-gray-700 group-hover:text-gray-900">
                Continuar com Google
              </span>
            </button>

            {/* 
              BOTÕES DESABILITADOS - Precisam de configuração externa
              
              🍎 Apple Sign-In:
              - Requer Apple Developer Account ($99/ano)
              - Configurar Service ID em https://developer.apple.com
              - Adicionar callback: https://charme-bela-33906.firebaseapp.com/__/auth/handler
              
              📘 Facebook Login:
              - Criar app em https://developers.facebook.com
              - Pegar App ID e App Secret
              - Adicionar redirect URI: https://charme-bela-33906.firebaseapp.com/__/auth/handler
              
              Para ativar: descomente o código abaixo e configure as contas
            */}
            
            {/* 
            <button
              type="button"
              onClick={handleAppleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black border-2 border-black rounded-xl hover:bg-gray-900 hover:shadow-md transition-all group"
            >
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="font-medium text-white">
                Continuar com Apple
              </span>
            </button>
            */}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                Ou entre com email
              </span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  label="Email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <Input
                  type="password"
                  label="Senha"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-gray-900 placeholder:text-gray-500"
                />
              </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="ml-2 text-sm text-gray-600">Lembrar-me</span>
              </label>

              <Link
                href="/recuperar-senha"
                className="text-sm text-pink-600 hover:text-pink-700"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
            >
              Entrar
            </Button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Link
              href="/cadastro"
              className="font-medium text-pink-600 hover:text-pink-700"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

