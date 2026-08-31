'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { RiLockFill, RiSparklingFill, RiShieldUserFill, RiArrowLeftLine } from 'react-icons/ri'
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-slate-50 to-pink-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo e Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/images/logo.png"
              alt="Charme & Bela"
              width={80}
              height={80}
              className="object-contain drop-shadow-sm"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Área Administrativa
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
            Acesso restrito para gestão da clínica
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              <div>
                <Input
                  type="text"
                  label="Usuário"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="text-slate-900 placeholder:text-slate-400 font-semibold"
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
                  className="text-slate-900 placeholder:text-slate-400 font-semibold"
                />
              </div>

              {/* Remember Me */}
              <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded-md border-slate-300 focus:ring-rose-500"
                />
                <span className="text-xs font-bold text-slate-700">Manter conectado</span>
              </label>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs sm:text-sm font-bold shadow-xs py-3 mt-2"
                isLoading={loading}
              >
                <RiLockFill className="w-4 h-4 mr-2" />
                Acessar Painel
              </Button>
            </form>
          </div>

          {/* Footer do Card */}
          <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5">
            <RiShieldUserFill className="w-4 h-4 text-rose-600" />
            <p className="text-xs font-bold text-slate-600">
              Área restrita e protegida
            </p>
          </div>
        </div>

        {/* Link para voltar */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
          >
            <RiArrowLeftLine className="w-3.5 h-3.5 mr-1" />
            Voltar para o site
          </a>
        </div>

        {/* Decorative elements */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-1.5 text-slate-400">
            <RiSparklingFill className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] font-bold">Charme & Bela Admin</span>
          </div>
        </div>
      </div>
    </div>
  )
}

