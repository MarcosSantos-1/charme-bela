'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button'
import DatePicker from '@/components/DatePicker'
import { useConfirm } from '@/hooks/useConfirm'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Edit2, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function PerfilPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const [isEditing, setIsEditing] = useState(false)
  const [birthDate, setBirthDate] = useState<Date | undefined>(new Date())

  return (
    <ProtectedRoute requiredRole="CLIENT">
      {ConfirmDialogComponent}
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 text-gray-900 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 text-pink-600 font-medium text-sm"
            >
              <Edit2 className="w-4 h-4" />
              <span>{isEditing ? 'Cancelar' : 'Editar'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-20">
          {/* Profile Photo */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                {user?.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl}
                    alt={user.name}
                    width={100}
                    height={100}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-pink-600" />
                  </div>
                )}
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-pink-600 text-white p-2 rounded-full hover:bg-pink-700">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-4">{user?.name}</h2>
              <p className="text-gray-600 text-sm">{user?.email}</p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Informações Pessoais</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="(11) 98888-8888"
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500 ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento
              </label>
              {isEditing ? (
                <DatePicker
                  value={birthDate}
                  onChange={setBirthDate}
                  placeholder="Selecione sua data de nascimento"
                  maxDate={new Date()}
                  showYearPicker={true}
                />
              ) : (
                <div className="flex items-center px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900">
                  <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                  {birthDate ? format(birthDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Não informado'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  placeholder="Rua, número, bairro, cidade"
                  disabled={!isEditing}
                  rows={3}
                  className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500 ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                />
              </div>
            </div>

            {isEditing && (
              <div className="pt-4 space-y-3">
                <Button variant="primary" className="w-full">
                  Salvar Alterações
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {/* Anamnese */}
          <div className="bg-white rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Ficha de Anamnese</h3>
            
            {localStorage.getItem('hasCompletedAnamnese') ? (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Ficha Preenchida</p>
                      <p className="text-sm text-green-700">Sua ficha de anamnese está completa!</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => router.push('/cliente/anamnese/visualizar')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  <span className="text-gray-700">Visualizar minha ficha</span>
                  <span className="text-gray-400">›</span>
                </button>
                
                <button 
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: 'Atualizar Ficha',
                      message: 'Deseja atualizar sua ficha de anamnese?',
                      confirmText: 'Sim, atualizar',
                      cancelText: 'Cancelar',
                      type: 'info'
                    })
                    if (confirmed) {
                      router.push('/cliente/anamnese')
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  <span className="text-gray-700">Atualizar ficha</span>
                  <span className="text-gray-400">›</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-yellow-900">Ficha Pendente</p>
                      <p className="text-sm text-yellow-700">Você ainda não preencheu sua ficha de anamnese</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => router.push('/cliente/anamnese')}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
                >
                  Preencher Ficha de Anamnese
                </button>
              </div>
            )}
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-2xl p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 mb-4">Configurações da Conta</h3>

            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
              <span className="text-gray-700">Alterar senha</span>
              <span className="text-gray-400">›</span>
            </button>

            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
              <span className="text-gray-700">Notificações</span>
              <span className="text-gray-400">›</span>
            </button>

            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
              <span className="text-gray-700">Privacidade</span>
              <span className="text-gray-400">›</span>
            </button>

            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-red-600">
              <span>Excluir conta</span>
              <span className="text-red-400">›</span>
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

