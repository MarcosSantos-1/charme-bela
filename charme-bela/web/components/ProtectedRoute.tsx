'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'CLIENT' | 'MANAGER'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, firebaseUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (!loading && !hasChecked) {
      setHasChecked(true)
      
      if (!user) {
        // Redireciona para login admin se estiver em rota admin
        if (pathname.startsWith('/admin')) {
          router.push('/admin-login')
        } else {
          router.push('/login')
        }
      } else if (requiredRole && user.role !== requiredRole) {
        console.log('User role mismatch:', user.role, 'required:', requiredRole)
        router.push('/')
      } else if (firebaseUser && !firebaseUser.emailVerified && pathname !== '/verificar-email' && user.role !== 'MANAGER') {
        // Redirecionar para verificação de email se não verificado (exceto para MANAGER)
        console.log('⚠️ Email não verificado, redirecionando...')
        router.push('/verificar-email')
      }
    }
  }, [user, loading, requiredRole, router, pathname, hasChecked, firebaseUser])

  // Mostrar loading apenas enquanto está carregando
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mb-4"></div>
        <p className="text-gray-600">Verificando autenticação...</p>
      </div>
    )
  }

  // Se não tem usuário, não renderiza nada (está sendo redirecionado)
  if (!user) {
    return null
  }

  // Se tem role requerida e o usuário não tem essa role
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta área</p>
          <button
            onClick={() => router.push('/')}
            className="text-pink-600 hover:text-pink-700"
          >
            Voltar para home
          </button>
        </div>
      </div>
    )
  }

  // Tudo ok, renderiza o conteúdo
  return <>{children}</>
}

