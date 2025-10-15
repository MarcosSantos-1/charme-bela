'use client'

import { useState } from 'react'
import { Plus, Shield, Trash2, Edit, Lock } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

interface AdminUser {
  id: string
  username: string
  name: string
  email: string
  role: 'MANAGER' | 'STAFF'
  createdAt: string
  lastAccess: string
}

export default function AcessosPage() {
  const [showNewUserModal, setShowNewUserModal] = useState(false)

  // Mock data - apenas o host por enquanto
  const adminUsers: AdminUser[] = [
    {
      id: '1',
      username: 'sonia.santana',
      name: 'Sônia Santana',
      email: 'sonia.santana@charmeebela.com',
      role: 'MANAGER',
      createdAt: '01/01/2015',
      lastAccess: 'Agora'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Acessos</h2>
          <p className="text-gray-600 mt-1">Gerencie os usuários com acesso ao painel administrativo</p>
        </div>

        <Button variant="primary" onClick={() => setShowNewUserModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Novo Usuário Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total de Admins</div>
              <div className="text-3xl font-bold text-gray-900">{adminUsers.length}</div>
            </div>
            <Shield className="w-12 h-12 text-pink-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Gestores</div>
              <div className="text-3xl font-bold text-pink-600">
                {adminUsers.filter(u => u.role === 'MANAGER').length}
              </div>
            </div>
            <Shield className="w-12 h-12 text-pink-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Equipe</div>
              <div className="text-3xl font-bold text-blue-600">
                {adminUsers.filter(u => u.role === 'STAFF').length}
              </div>
            </div>
            <Shield className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                Usuário
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                Username
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                Perfil
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                Último Acesso
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {adminUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-pink-600 font-semibold">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded text-pink  -800 font-mono">
                    {user.username}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                      user.role === 'MANAGER'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {user.role === 'MANAGER' ? 'Gestor' : 'Equipe'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.lastAccess}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end space-x-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Redefinir senha">
                      <Lock className="w-4 h-4 text-gray-600" />
                    </button>
                    {user.username !== 'sonia.santana' && (
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Criar Novo Usuário Admin
            </h3>

            <form className="space-y-4">
              <Input
                label="Nome Completo"
                type="text"
                placeholder="Ex: Maria Silva"
                required
              />
              <Input
                label="Username (para login)"
                type="text"
                placeholder="Ex: maria.silva"
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="maria@charmeebela.com"
                required
              />
              <Input
                label="Senha Inicial"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil de Acesso
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option value="MANAGER">Gestor (acesso total)</option>
                  <option value="STAFF">Equipe (acesso limitado)</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewUserModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  Criar Usuário
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

