'use client'

import { useState } from 'react'
import { Search, Filter, Plus, Mail, Phone, Calendar, MoreVertical, Sparkles, Gift } from 'lucide-react'
import { Button } from '@/components/Button'
import { AdicionarClienteModal } from '@/components/admin/AdicionarClienteModal'
import { DarVoucherModal } from '@/components/admin/DarVoucherModal'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  totalAppointments: number
  lastVisit: string
  status: 'active' | 'inactive'
  hasSubscription: boolean
  subscriptionPlan?: string
}

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdicionarClienteOpen, setIsAdicionarClienteOpen] = useState(false)
  const [isDarVoucherOpen, setIsDarVoucherOpen] = useState(false)

  // Mock data
  const clients: Client[] = [
    {
      id: '1',
      name: 'Maria Silva',
      email: 'maria@email.com',
      phone: '(11) 99999-9999',
      totalAppointments: 15,
      lastVisit: '10/10/2025',
      status: 'active',
      hasSubscription: true,
      subscriptionPlan: 'Plus Care'
    },
    {
      id: '2',
      name: 'Ana Santos',
      email: 'ana@email.com',
      phone: '(11) 88888-8888',
      totalAppointments: 8,
      lastVisit: '12/10/2025',
      status: 'active',
      hasSubscription: false
    },
    {
      id: '3',
      name: 'Julia Oliveira',
      email: 'julia@email.com',
      phone: '(11) 77777-7777',
      totalAppointments: 23,
      lastVisit: '14/10/2025',
      status: 'active',
      hasSubscription: true,
      subscriptionPlan: 'Premium Experience'
    },
  ]

  // Filtrar clientes
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-gray-600 mt-1">Gerencie seus clientes e acessos</p>
        </div>

        <Button 
          variant="primary"
          onClick={() => setIsAdicionarClienteOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <Button variant="outline">
          <Filter className="w-5 h-5 mr-2" />
          Filtros
        </Button>

        <Button 
          variant="secondary"
          onClick={() => setIsDarVoucherOpen(true)}
        >
          <Gift className="w-5 h-5 mr-2" />
          Dar Voucher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Total de Clientes</div>
          <div className="text-3xl font-bold text-gray-900">{clients.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Clientes Ativos</div>
          <div className="text-3xl font-bold text-green-600">
            {clients.filter(c => c.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Novos Este Mês</div>
          <div className="text-3xl font-bold text-pink-600">12</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agendamentos
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Visita
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-pink-600 font-semibold">
                          {client.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{client.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {client.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {client.hasSubscription ? (
                      <div className="flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                        <div>
                          <div className="text-sm font-medium text-purple-700">
                            {client.subscriptionPlan}
                          </div>
                          <div className="text-xs text-gray-500">Assinante</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Avulso</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">
                      {client.totalAppointments}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {client.lastVisit}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        client.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-medium">{filteredClients.length}</span> de{' '}
            <span className="font-medium">{clients.length}</span> resultados
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próximo
            </Button>
          </div>
        </div>
      </div>

      {/* Modais */}
      <AdicionarClienteModal 
        isOpen={isAdicionarClienteOpen}
        onClose={() => setIsAdicionarClienteOpen(false)}
      />
      
      <DarVoucherModal 
        isOpen={isDarVoucherOpen}
        onClose={() => setIsDarVoucherOpen(false)}
      />
    </div>
  )
}

