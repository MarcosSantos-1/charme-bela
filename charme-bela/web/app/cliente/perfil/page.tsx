'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useAnamnesis } from '@/lib/hooks/useAnamnesis'
import { Button } from '@/components/Button'
import { PhoneInput } from '@/components/PhoneInput'
import { useConfirm } from '@/hooks/useConfirm'
import { User, Mail, Phone, Lock, Shield, FileText, CreditCard, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function PerfilPage() {
  const { user, refetchUser } = useAuth()
  const router = useRouter()
  const { confirm, ConfirmDialogComponent } = useConfirm()
  const { anamnesis, hasAnamnesis, loading: anamnesisLoading } = useAnamnesis(user?.id)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedPhone, setEditedPhone] = useState('')
  const [saving, setSaving] = useState(false)

  // Atualizar campos quando user carregar
  useEffect(() => {
    if (user) {
      setEditedName(user.name || '')
      setEditedPhone(user.phone || '')
    }
  }, [user])
  
  // Modal de alterar senha
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSaveProfile = async () => {
    if (!user?.id) {
      toast.error('Usuário não identificado')
      return
    }

    setSaving(true)
    
    try {
      console.log('💾 Salvando perfil:', { name: editedName, phone: editedPhone })
      
      await api.updateUser(user.id, { 
        name: editedName, 
        phone: editedPhone 
      })
      
      toast.success('Perfil atualizado com sucesso!')
      
      // Atualizar contexto do usuário
      if (refetchUser) {
        await refetchUser()
      }
      
      setIsEditing(false)
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error)
      toast.error(error.message || 'Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword || !currentPassword) {
      toast.error('Preencha todos os campos')
      return
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setChangingPassword(true)

    try {
      const firebaseUser = auth.currentUser
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('Usuário não autenticado')
      }

      // Reautentica o usuário com a senha atual
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword)
      await reauthenticateWithCredential(firebaseUser, credential)

      // Atualiza a senha
      await updatePassword(firebaseUser, newPassword)

      toast.success('Senha alterada com sucesso!')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error)
      if (error.code === 'auth/wrong-password') {
        toast.error('Senha atual incorreta')
      } else if (error.code === 'auth/weak-password') {
        toast.error('Senha muito fraca')
      } else {
        toast.error('Erro ao alterar senha')
      }
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      {ConfirmDialogComponent}
      <ClientLayout title="Meu Perfil">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Link para Pagamentos - DESKTOP ONLY */}
          <div className="hidden md:block">
            <Link href="/cliente/pagamentos">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white p-6 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-6 h-6" />
                      <h3 className="text-xl font-bold">Pagamentos</h3>
                    </div>
                    <p className="text-green-100 text-sm">
                      Gerencie seus métodos de pagamento e histórico de cobranças
                    </p>
                  </div>
                  <span className="text-2xl">›</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Profile Photo */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                {user?.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl}
                    alt={user.name || 'User'}
                    width={100}
                    height={100}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-pink-600" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-4">{user?.name}</h2>
              <p className="text-gray-600 text-sm">{user?.email}</p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Informações Pessoais</h3>
              {!isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(true)
                    setEditedName(user?.name || '')
                    setEditedPhone(user?.phone || '')
                  }}
                  className="text-pink-600 font-medium text-sm hover:text-pink-700"
                >
                  Editar
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={isEditing ? editedName : user?.name || ''}
                  onChange={(e) => setEditedName(e.target.value)}
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
              <PhoneInput
                placeholder="(11) 98888-8888"
                value={isEditing ? editedPhone : user?.phone || ''}
                onChange={setEditedPhone}
                disabled={!isEditing}
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>

            {isEditing && (
              <div className="pt-4 space-y-3">
                <Button 
                  variant="primary" 
                  className="w-full"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
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
            
            {anamnesisLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
              </div>
            ) : hasAnamnesis ? (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Ficha Preenchida</p>
                      <p className="text-sm text-green-700">
                        Última atualização: {anamnesis?.createdAt && new Date(anamnesis.createdAt).toLocaleDateString('pt-BR')}
                      </p>
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
                      <FileText className="w-6 h-6 text-white" />
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

            <button 
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Alterar senha</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>

            <Link href="/cliente/privacidade">
              <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Privacidade e Dados</span>
                </div>
                <span className="text-gray-400">›</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Modal de Alterar Senha */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Alterar Senha</h2>

              <div className="space-y-4">
                {/* Senha Atual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
                      placeholder="Digite sua senha atual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
                      placeholder="Digite novamente"
                    />
                  </div>
                </div>

                {/* Botões */}
                <div className="pt-4 space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmNewPassword('')
                    }}
                    disabled={changingPassword}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ClientLayout>
    </ProtectedRoute>
  )
}
