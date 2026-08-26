'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PhoneInput } from '@/components/PhoneInput'
import { ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'
import { auth } from '@/lib/firebase'

export default function CadastroPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [userName, setUserName] = useState('')
  const { signUp, signInWithGoogle, signInWithApple, user, firebaseUser } = useAuth()
  const router = useRouter()

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user && firebaseUser) {
      console.log('✅ Usuário já logado, redirecionando...')
      router.push('/cliente')
    }
  }, [user, firebaseUser, router])

  const validateForm = () => {
    if (!name.trim()) {
      toast.error('Digite seu nome completo')
      return false
    }

    if (!email.trim()) {
      toast.error('Digite seu e-mail')
      return false
    }

    if (!email.includes('@') || !email.includes('.')) {
      toast.error('Digite um e-mail válido')
      return false
    }

    if (!phone.trim()) {
      toast.error('Digite seu telefone')
      return false
    }

    // Validar formato do telefone (mínimo 14 caracteres com máscara)
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      toast.error('Digite um telefone válido com DDD')
      return false
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return false
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    
    try {
      console.log('📝 Criando conta...')
      
      // Limpar qualquer sessão admin
      localStorage.removeItem('adminSession')
      
      // Salvar nome e telefone para usar após Firebase criar
      setUserName(name.trim())
      sessionStorage.setItem('pendingUserData', JSON.stringify({
        name: name.trim(),
        phone: phone.trim()
      }))
      
      // Criar usuário no Firebase Auth
      // O AuthContext vai detectar e criar no backend automaticamente
      await signUp(email, password, name.trim())
      
      console.log('✅ Conta criada no Firebase com sucesso!')
      
      // Aguardar um pouco para o backend processar
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mostrar tela de boas-vindas
      setShowWelcome(true)
      
      // Limpar dados temporários
      sessionStorage.removeItem('pendingUserData')
      
      // Aguardar animação e redirecionar
      setTimeout(() => {
        router.push('/cliente')
      }, 3000)
      
    } catch (error: any) {
      console.error('❌ Erro ao criar conta:', error)
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está cadastrado. Faça login.')
      } else if (error.code === 'auth/weak-password') {
        toast.error('Senha muito fraca. Use no mínimo 6 caracteres.')
      } else if (error.code === 'auth/invalid-email') {
        toast.error('E-mail inválido.')
      } else {
        toast.error(error.message || 'Erro ao criar conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      console.log('📝 Criando conta com Google...')
      
      // Limpar qualquer sessão admin
      localStorage.removeItem('adminSession')
      
      const result = await signInWithGoogle()
      
      if (result.user) {
        // Verificar se o usuário já existe no backend
        try {
          await api.getUserByFirebaseUid(result.user.uid)
          console.log('✅ Usuário já existe no backend')
        } catch (error: any) {
          // Se não existe, criar
          if (error.message.includes('não encontrado')) {
            console.log('📝 Criando usuário no backend...')
            await api.createUser({
              name: result.user.displayName || result.user.email?.split('@')[0] || 'Usuário',
              email: result.user.email || '',
              phone: result.user.phoneNumber || '',
              firebaseUid: result.user.uid,
              role: 'CLIENT'
            })
            console.log('✅ Usuário criado no backend')
          }
        }
        
        toast.success('Conta criada com sucesso! 🎉')
        router.push('/cliente')
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar conta com Google:', error)
      toast.error('Erro ao criar conta com Google')
    }
  }

  const handleAppleSignup = async () => {
    try {
      localStorage.removeItem('adminSession')
      await signInWithApple()
      router.push('/cliente')
    } catch (error) {
      console.error('❌ Erro ao criar conta com Apple:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-flex items-center justify-center mb-6">
              <Image
                src="/images/logo.png"
                alt="Charme & Bela"
                width={60}
                height={60}
                className="object-contain"
              />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Conta</h1>
          <p className="text-gray-600">
            Preencha seus dados para começar
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="(11) 99999-9999"
                disabled={loading}
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botão Criar Conta */}
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium text-gray-900">Continuar com Google</span>
            </button>

            <button
              type="button"
              onClick={handleAppleSignup}
              className="w-full flex items-center justify-center px-4 py-3 bg-black border-2 border-black rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-3 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="font-medium text-white">Continuar com Apple</span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-pink-600 font-medium hover:text-pink-700">
                Fazer Login
              </Link>
            </p>
          </div>
        </div>

        {/* Voltar */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para o início
          </Link>
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full text-center transform animate-in zoom-in-95 duration-500 shadow-2xl">
            {/* Confetti Animation */}
            <div className="mb-6 relative">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center animate-bounce">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              {/* Sparkles */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="absolute top-0 left-1/4 text-3xl animate-ping">✨</span>
                <span className="absolute top-4 right-1/4 text-2xl animate-ping animation-delay-150">🎉</span>
                <span className="absolute bottom-4 left-1/3 text-2xl animate-ping animation-delay-300">💖</span>
              </div>
            </div>

            {/* Welcome Text */}
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Bem-vinda{userName && `, ${userName.split(' ')[0]}`}! 🎉
            </h2>
            <p className="text-gray-600 mb-2">
              Sua conta foi criada com sucesso!
            </p>
            <p className="text-sm text-gray-500 mb-6">
              ✉️ Enviamos um email de verificação para você
            </p>
            
            {/* Loading */}
            <div className="flex items-center justify-center space-x-2 text-pink-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600"></div>
              <span className="text-sm font-medium">Preparando seu espaço...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

