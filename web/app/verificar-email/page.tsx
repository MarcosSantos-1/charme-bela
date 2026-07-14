'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { sendEmailVerification, reload } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function VerificarEmailPage() {
  const { firebaseUser, signOut } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Redirecionar se já verificado
  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      console.log('✅ Email já verificado, redirecionando...')
      router.push('/cliente')
    }
  }, [firebaseUser, router])

  // Countdown para reenviar email
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleCheckVerification = async () => {
    if (!firebaseUser) return

    setChecking(true)
    try {
      // Recarregar dados do usuário
      await reload(firebaseUser)
      
      // Verificar novamente
      const currentUser = auth.currentUser
      if (currentUser?.emailVerified) {
        toast.success('Email verificado! Bem-vinda! 🎉')
        setTimeout(() => {
          router.push('/cliente')
        }, 1000)
      } else {
        toast.error('Email ainda não foi verificado. Verifique sua caixa de entrada e spam.')
      }
    } catch (error: any) {
      console.error('Erro ao verificar:', error)
      toast.error('Erro ao verificar email')
    } finally {
      setChecking(false)
    }
  }

  const handleResendEmail = async () => {
    if (!firebaseUser || countdown > 0) return

    setSendingEmail(true)
    try {
      await sendEmailVerification(firebaseUser)
      toast.success('Email de verificação reenviado! 📧')
      setCountdown(60) // Cooldown de 60 segundos
    } catch (error: any) {
      console.error('Erro ao reenviar:', error)
      if (error.code === 'auth/too-many-requests') {
        toast.error('Muitas tentativas. Aguarde alguns minutos.')
      } else {
        toast.error('Erro ao reenviar email')
      }
    } finally {
      setSendingEmail(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
            Verifique seu Email
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Enviamos um email de verificação para:
          </p>

          {/* Email */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
            <p className="font-medium text-gray-900">{firebaseUser.email}</p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Instruções:</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Abra sua caixa de entrada</li>
              <li>Procure por email de "noreply@charmeebela"</li>
              <li>Clique no link de verificação</li>
              <li>Volte aqui e clique em "Já verifiquei"</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleCheckVerification}
              disabled={checking}
            >
              {checking ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Já verifiquei meu email
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              disabled={sendingEmail || countdown > 0}
            >
              {sendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600 mr-2"></div>
                  Reenviando...
                </>
              ) : countdown > 0 ? (
                `Aguarde ${countdown}s para reenviar`
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Reenviar email
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
          >
            Sair e fazer login com outra conta
          </button>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Não recebeu o email?{' '}
            <a
              href="https://wa.me/5511913129669"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 font-medium hover:text-pink-700"
            >
              Fale conosco
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

