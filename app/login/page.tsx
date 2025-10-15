'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { User, Lock, Chrome, Apple, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getSavedAccounts, removeAccount, SavedAccount } from '@/lib/accountStorage'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [showAccountSelector, setShowAccountSelector] = useState(true)
  const { signIn, signInWithGoogle, signInWithApple } = useAuth()
  const router = useRouter()

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

  const handleAppleLogin = async () => {
    try {
      await signInWithApple()
      router.push('/cliente')
    } catch (error) {
      console.error(error)
    }
  }

  const handleQuickLogin = async (account: SavedAccount) => {
    setLoading(true)
    try {
      // Apenas redireciona para área do cliente (o Firebase já mantém sessão)
      router.push('/cliente')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao acessar conta')
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
                className="group w-full flex items-center space-x-4 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-pink-300 hover:shadow-lg transition-all relative"
              >
                {account.photoURL ? (
                  <Image
                    src={account.photoURL}
                    alt={account.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-pink-600" />
                  </div>
                )}
                
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.email}</div>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Bem-vinda de volta! 👋
            </h2>
            <p className="text-gray-600">
              Entre com sua conta para continuar
            </p>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
            >
              <Chrome className="w-5 h-5 mr-2" />
              Continuar com Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleAppleLogin}
            >
              <Apple className="w-5 h-5 mr-2" />
              Continuar com Apple
            </Button>
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

