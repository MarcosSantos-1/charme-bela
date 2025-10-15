'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getLastAccount, SavedAccount, removeAccount } from '@/lib/accountStorage'
import { User, X } from 'lucide-react'
import Image from 'next/image'

export function SavedAccountButton() {
  const [savedAccount, setSavedAccount] = useState<SavedAccount | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    // Só mostrar se NÃO estiver logado
    if (!user) {
      const account = getLastAccount()
      setSavedAccount(account)
    }
  }, [user])

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (savedAccount) {
      removeAccount(savedAccount.uid)
      setSavedAccount(null)
    }
  }

  if (!savedAccount || user) return null

  return (
    <div className="group relative">
      <button
        onClick={() => window.location.href = '/login'}
        className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all"
      >
        {savedAccount.photoURL ? (
          <Image
            src={savedAccount.photoURL}
            alt={savedAccount.name}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-pink-600" />
          </div>
        )}
        <div className="text-left hidden sm:block">
          <div className="text-sm font-medium text-gray-900">{savedAccount.name}</div>
          <div className="text-xs text-gray-500">Continuar como</div>
        </div>
      </button>

      <button
        onClick={handleRemove}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remover conta salva"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  )
}

