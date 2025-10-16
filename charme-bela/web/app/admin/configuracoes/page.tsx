'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Clock, Calendar, MapPin, Phone, Mail, Instagram, Save } from 'lucide-react'

export default function ConfiguracoesPage() {
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    // Simular save
    setTimeout(() => {
      setSaving(false)
      alert('Configurações salvas com sucesso!')
    }, 1000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
        <p className="text-gray-600 mt-1">Gerencie as configurações do sistema</p>
      </div>

      {/* Horários de Funcionamento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Clock className="w-6 h-6 text-pink-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            Horários de Funcionamento
          </h3>
        </div>

        <div className="space-y-4">
          {[
            { day: 'Segunda-feira', start: '09:00', end: '18:00' },
            { day: 'Terça-feira', start: '09:00', end: '18:00' },
            { day: 'Quarta-feira', start: '09:00', end: '18:00' },
            { day: 'Quinta-feira', start: '09:00', end: '18:00' },
            { day: 'Sexta-feira', start: '09:00', end: '18:00' },
            { day: 'Sábado', start: '09:00', end: '14:00' },
            { day: 'Domingo', start: '', end: '', closed: true },
          ].map((schedule, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-32 text-sm font-medium text-gray-700">
                {schedule.day}
              </div>
              {schedule.closed ? (
                <span className="text-sm text-gray-500">Fechado</span>
              ) : (
                <>
                  <Input
                    type="time"
                    defaultValue={schedule.start}
                    className="w-32"
                  />
                  <span className="text-gray-500">até</span>
                  <Input
                    type="time"
                    defaultValue={schedule.end}
                    className="w-32"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Informações de Contato */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Phone className="w-6 h-6 text-pink-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            Informações de Contato
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Input
            label="Telefone"
            type="tel"
            defaultValue="(11) 99999-9999"
            placeholder="(00) 00000-0000"
          />
          <Input
            label="WhatsApp"
            type="tel"
            defaultValue="(11) 99999-9999"
            placeholder="(00) 00000-0000"
          />
          <Input
            label="Email"
            type="email"
            defaultValue="contato@charmeebela.com"
            placeholder="seu@email.com"
          />
          <Input
            label="Instagram"
            type="text"
            defaultValue="@charmeebela"
            placeholder="@usuario"
          />
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <MapPin className="w-6 h-6 text-pink-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            Endereço
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input
              label="CEP"
              type="text"
              defaultValue="01234-567"
              placeholder="00000-000"
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Rua"
              type="text"
              defaultValue="Rua Exemplo"
              placeholder="Nome da rua"
            />
          </div>
          <Input
            label="Número"
            type="text"
            defaultValue="123"
            placeholder="Número"
          />
          <Input
            label="Complemento"
            type="text"
            placeholder="Apto, sala, etc"
          />
          <Input
            label="Bairro"
            type="text"
            defaultValue="Centro"
            placeholder="Bairro"
          />
          <Input
            label="Cidade"
            type="text"
            defaultValue="São Paulo"
            placeholder="Cidade"
          />
        </div>
      </div>

      {/* Política de Cancelamento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Calendar className="w-6 h-6 text-pink-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            Política de Cancelamento
          </h3>
        </div>

        <div className="space-y-4">
          <Input
            label="Tempo mínimo para cancelamento (horas)"
            type="number"
            defaultValue="24"
            placeholder="24"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensagem de Cancelamento
            </label>
            <textarea
              rows={4}
              defaultValue="Cancelamentos devem ser feitos com no mínimo 24 horas de antecedência. Cancelamentos fora deste prazo estarão sujeitos a cobrança."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          isLoading={saving}
        >
          <Save className="w-5 h-5 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}

