'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { resetPassword } = useAuth()
  const router = useRouter()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Por favor, insira seu email')
      return
    }

    setLoading(true)
    
    try {
      await resetPassword(email)
      setEmailSent(true)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Tela de sucesso
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Email enviado!
            </h2>
            
            <p className="text-gray-600 mb-6">
              Enviamos um link de recuperação para <strong>{email}</strong>
            </p>
            
            <p className="text-sm text-gray-500 mb-8">
              Verifique sua caixa de entrada e spam. O link expira em 1 hora.
            </p>

            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Voltar para login
              </Button>

              <button
                onClick={() => setEmailSent(false)}
                className="w-full text-sm text-pink-600 hover:text-pink-700"
              >
                Reenviar email
              </button>
            </div>
          </div>

          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-pink-600">
              ← Voltar para o site
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Formulário de recuperação
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
            <h3 className="font-semibold text-xl mb-2">🔐 Recuperação Segura</h3>
            <p className="text-pink-100">
              Enviaremos um link seguro para seu email para que você possa redefinir sua senha.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-xl mb-2">💡 Dica de Segurança</h3>
            <p className="text-pink-100">
              Use uma senha forte com pelo menos 6 caracteres, combinando letras e números.
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

          {/* Back button */}
          <Link
            href="/login"
            className="flex items-center text-sm text-gray-600 hover:text-pink-600"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para login
          </Link>

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Esqueceu sua senha?
            </h2>
            <p className="text-gray-600">
              Não se preocupe! Digite seu email e enviaremos um link para recuperação.
            </p>
          </div>

          {/* Reset Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
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

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
            >
              <Mail className="w-5 h-5 mr-2" />
              Enviar link de recuperação
            </Button>
          </form>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Não recebeu o email?</strong> Verifique sua pasta de spam ou lixo eletrônico.
            </p>
          </div>

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

          {/* Back to home */}
          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-pink-600">
              ← Voltar para o site
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

