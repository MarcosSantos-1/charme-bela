'use client'

import { useState } from 'react'
import {
  RiAddLine,
  RiShieldUserFill,
  RiDeleteBin5Fill,
  RiEdit2Fill,
  RiLockFill,
  RiCloseLine,
  RiTeamFill,
  RiUser3Fill,
} from 'react-icons/ri'
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Gestão de Acessos</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">Gerencie os usuários e permissões do painel administrativo</p>
        </div>

        <Button 
          variant="primary" 
          onClick={() => setShowNewUserModal(true)}
          className="shadow-xs"
        >
          <RiAddLine className="w-4 h-4 mr-1.5" />
          Novo Usuário Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-4 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide mb-1">Total de Admins</div>
              <div className="text-2xl sm:text-3xl font-extrabold">{adminUsers.length}</div>
            </div>
            <RiShieldUserFill className="w-10 h-10 text-white/20" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-4 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide mb-1">Gestores</div>
              <div className="text-2xl sm:text-3xl font-extrabold">
                {adminUsers.filter(u => u.role === 'MANAGER').length}
              </div>
            </div>
            <RiShieldUserFill className="w-10 h-10 text-white/20" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-sky-500 to-cyan-600 rounded-2xl p-4 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide mb-1">Equipe</div>
              <div className="text-2xl sm:text-3xl font-extrabold">
                {adminUsers.filter(u => u.role === 'STAFF').length}
              </div>
            </div>
            <RiTeamFill className="w-10 h-10 text-white/20" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Perfil
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Último Acesso
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {adminUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-9 h-9 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mr-3 font-extrabold text-sm border border-rose-200 shadow-xs">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                      <div className="text-xs text-slate-500 font-semibold">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-rose-700 font-mono font-bold border border-slate-200">
                    {user.username}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                      user.role === 'MANAGER'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                  >
                    {user.role === 'MANAGER' ? 'Gestor' : 'Equipe'}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                  {user.lastAccess}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end space-x-1.5">
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800" title="Editar">
                      <RiEdit2Fill className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800" title="Redefinir senha">
                      <RiLockFill className="w-4 h-4" />
                    </button>
                    {user.username !== 'sonia.santana' && (
                      <button className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors text-rose-600" title="Excluir">
                        <RiDeleteBin5Fill className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 pb-24 sm:pb-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                Criar Novo Usuário Admin
              </h3>
              <button
                onClick={() => setShowNewUserModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Perfil de Acesso
                </label>
                <select className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs sm:text-sm font-semibold text-slate-800 bg-white">
                  <option value="MANAGER">Gestor (acesso total)</option>
                  <option value="STAFF">Equipe (acesso limitado)</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-xs font-bold"
                  onClick={() => setShowNewUserModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 text-xs font-bold shadow-xs"
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

