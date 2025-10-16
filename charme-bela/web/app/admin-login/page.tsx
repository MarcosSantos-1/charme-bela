'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Lock, Sparkles, Shield } from 'lucide-react'
import Image from 'next/image'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signInAdmin } = useAuth()
  const router = useRouter()

  // Load saved credentials
  useEffect(() => {
    const savedUsername = localStorage.getItem('adminUsername')
    const savedPassword = localStorage.getItem('adminPassword')
    const savedRemember = localStorage.getItem('adminRememberMe')
    
    if (savedRemember === 'true' && savedUsername && savedPassword) {
      setUsername(savedUsername)
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await signInAdmin(username, password)
      
      // Save credentials if "Remember me" is checked
      if (rememberMe) {
        localStorage.setItem('adminUsername', username)
        localStorage.setItem('adminPassword', password)
        localStorage.setItem('adminRememberMe', 'true')
      } else {
        localStorage.removeItem('adminUsername')
        localStorage.removeItem('adminPassword')
        localStorage.removeItem('adminRememberMe')
      }
      
      router.push('/admin')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo e Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/images/logo.png"
              alt="Charme & Bela"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Área Administrativa
          </h1>
          <p className="text-gray-600">
            Acesso restrito ao painel de gestão
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Input
                  type="text"
                  label="Usuário"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
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
                  autoComplete="current-password"
                  className="text-gray-900 placeholder:text-gray-500"
                />
              </div>

              {/* Remember Me */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 text-pink-600 rounded border-gray-300 focus:ring-pink-500"
                />
                <span className="text-gray-900 font-medium">Manter conectado</span>
              </label>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
              >
                <Lock className="w-5 h-5 mr-2" />
                Acessar Painel
              </Button>
            </form>
          </div>

          {/* Footer do Card */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              🔒 Área restrita e protegida
            </p>
          </div>
        </div>

        {/* Link para voltar */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-pink-600 transition"
          >
            ← Voltar para o site
          </a>
        </div>

        {/* Setup Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium mb-2">
            ℹ️ Credenciais:
          </p>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Usuário:</strong> sonia.santana</p>
            <p><strong>Senha:</strong> 2020</p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs">Charme & Bela Admin Panel</span>
          </div>
        </div>
      </div>
    </div>
  )
}

