'use client'

import { useState } from 'react'
import { Search, FileText, Eye, Download } from 'lucide-react'
import { Button } from '@/components/Button'

export default function AnamnesesPage() {
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data
  const anamneses = [
    {
      id: '1',
      clientName: 'Maria Silva',
      createdAt: '10/10/2025',
      completed: true
    },
    {
      id: '2',
      clientName: 'Ana Santos',
      createdAt: '12/10/2025',
      completed: true
    },
    {
      id: '3',
      clientName: 'Julia Oliveira',
      createdAt: '14/10/2025',
      completed: false
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Anamneses</h2>
        <p className="text-gray-600 mt-1">Visualize e gerencie as fichas de anamnese dos clientes</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                Cliente
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                Data de Criação
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {anamneses.map((anamnese) => (
              <tr key={anamnese.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-pink-600 mr-3" />
                    <span className="font-medium text-gray-900">
                      {anamnese.clientName}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {anamnese.createdAt}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      anamnese.completed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {anamnese.completed ? 'Completa' : 'Pendente'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

