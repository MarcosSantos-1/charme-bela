'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { User, Mail, Phone, MapPin, Star } from 'lucide-react'
import DatePicker from '@/components/DatePicker'

interface Props {
  data: any
  onNext: (data: any) => void
}

export default function Step1DadosPessoais({ data, onNext }: Props) {
  const [formData, setFormData] = useState({
    fullName: data.fullName || '',
    birthDate: data.birthDate || new Date(),
    phone: data.phone || '',
    email: data.email || '',
    cep: data.cep || '',
    street: data.street || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    state: data.state || '',
    number: data.number || '',
    complement: data.complement || '',
    howKnew: data.howKnew || ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCepBlur = async () => {
    if (formData.cep.replace(/\D/g, '').length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${formData.cep.replace(/\D/g, '')}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setFormData({
            ...formData,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          })
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-white rounded-2xl p-6 text-center border-2 border-pink-200">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Olá! Vamos começar? ✨</h2>
        <p className="text-gray-600">
          Precisamos conhecer você melhor para oferecer o melhor tratamento!
        </p>
      </div>

      {/* Personal Data */}
      <div className="bg-white rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Dados Pessoais</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Seu nome completo"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Nascimento <span className="text-red-500">*</span>
          </label>
          <DatePicker
            value={formData.birthDate}
            onChange={(date) => setFormData({ ...formData, birthDate: date || new Date() })}
            placeholder="Selecione sua data de nascimento"
            maxDate={new Date()}
            showYearPicker={true}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Celular (WhatsApp) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="(11) 98888-8888"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            E-mail <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Endereço</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CEP <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="cep"
              required
              value={formData.cep}
              onChange={handleChange}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              maxLength={9}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">O endereço será preenchido automaticamente</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro</label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="Rua, Av..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              placeholder="123"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
            <input
              type="text"
              name="complement"
              value={formData.complement}
              onChange={handleChange}
              placeholder="Apto, Bloco..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
            <input
              type="text"
              name="neighborhood"
              value={formData.neighborhood}
              onChange={handleChange}
              placeholder="Bairro"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Cidade"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="SP"
              maxLength={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* How did you find us */}
      <div className="bg-white rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Como nos conheceu?</h3>
        <select
          name="howKnew"
          value={formData.howKnew}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
        >
          <option value="">Selecione...</option>
          <option value="indicacao">Indicação de amigo(a)</option>
          <option value="instagram">Instagram</option>
          <option value="google">Google</option>
          <option value="passando">Passando em frente</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      {/* Submit Button */}
      <Button type="submit" variant="primary" className="w-full py-4 text-lg">
        Avançar para Estilo de Vida →
      </Button>
    </form>
  )
}

