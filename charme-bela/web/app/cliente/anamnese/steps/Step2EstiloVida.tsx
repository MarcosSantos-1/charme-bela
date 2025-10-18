'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Activity, Coffee, Cigarette, Wine, Droplet, Sun, Sparkles } from 'lucide-react'

interface Props {
  data: any
  onNext: (data: any) => void
  onPrevious: () => void
}

export default function Step2EstiloVida({ data, onNext, onPrevious }: Props) {
  const [formData, setFormData] = useState({
    exerciseActivity: data.exerciseActivity || 'no',
    exerciseType: data.exerciseType || '',
    stressLevel: data.stressLevel || '3',
    smoking: data.smoking || 'no',
    smokingAmount: data.smokingAmount || '',
    alcohol: data.alcohol || 'no',
    intestine: data.intestine || 'regular',
    waterIntake: data.waterIntake || 'between1and2',
    sunscreen: data.sunscreen || 'no',
    cosmetics: data.cosmetics || 'no',
    cosmeticsType: data.cosmeticsType || ''
  })

  // Atualizar quando data mudar
  useEffect(() => {
    console.log('📝 Step2: Atualizando com dados carregados:', data)
    setFormData({
      exerciseActivity: data.exerciseActivity || 'no',
      exerciseType: data.exerciseType || '',
      stressLevel: data.stressLevel || '3',
      smoking: data.smoking || 'no',
      smokingAmount: data.smokingAmount || '',
      alcohol: data.alcohol || 'no',
      intestine: data.intestine || 'regular',
      waterIntake: data.waterIntake || 'between1and2',
      sunscreen: data.sunscreen || 'no',
      cosmetics: data.cosmetics || 'no',
      cosmeticsType: data.cosmeticsType || ''
    })
  }, [data])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-white rounded-2xl p-6 text-center border-2 border-purple-200">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Seus Hábitos e Rotina 🏃‍♀️</h2>
        <p className="text-gray-600">
          Conhecer seu dia a dia nos ajuda a escolher o melhor tratamento!
        </p>
      </div>

      {/* Lifestyle Questions */}
      <div className="bg-white rounded-2xl p-6 space-y-6">
        <h3 className="font-semibold text-gray-900 mb-4">Estilo de Vida</h3>

        {/* Physical Activity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pratica atividade física?
          </label>
          <div className="flex space-x-4">
            <label className="flex-1">
              <input
                type="radio"
                name="exerciseActivity"
                value="yes"
                checked={formData.exerciseActivity === 'yes'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Sim</span>
              </div>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="exerciseActivity"
                value="no"
                checked={formData.exerciseActivity === 'no'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Não</span>
              </div>
            </label>
          </div>
        </div>

        {formData.exerciseActivity === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qual tipo e frequência?
            </label>
            <input
              type="text"
              name="exerciseType"
              value={formData.exerciseType}
              onChange={handleChange}
              placeholder="Ex: Musculação, 3x por semana"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        )}

        {/* Stress Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Nível de estresse atual?
          </label>
          <div className="space-y-2">
            <input
              type="range"
              name="stressLevel"
              min="1"
              max="5"
              value={formData.stressLevel}
              onChange={handleChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>Muito baixo</span>
              <span className="font-semibold text-pink-600">Nível {formData.stressLevel}</span>
              <span>Muito alto</span>
            </div>
          </div>
        </div>

        {/* Smoking */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Você fuma?
          </label>
          <div className="flex space-x-4">
            <label className="flex-1">
              <input
                type="radio"
                name="smoking"
                value="yes"
                checked={formData.smoking === 'yes'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Sim</span>
              </div>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="smoking"
                value="no"
                checked={formData.smoking === 'no'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Não</span>
              </div>
            </label>
          </div>
        </div>

        {formData.smoking === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantos cigarros por dia?
            </label>
            <input
              type="text"
              name="smokingAmount"
              value={formData.smokingAmount}
              onChange={handleChange}
              placeholder="Ex: 10"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        )}

        {/* Alcohol */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Consome bebida alcoólica?
          </label>
          <select
            name="alcohol"
            value={formData.alcohol}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
          >
            <option value="no">Não</option>
            <option value="socially">Socialmente (fins de semana)</option>
            <option value="frequently">Com frequência (3x por semana ou mais)</option>
          </select>
        </div>

        {/* Intestine */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Como funciona seu intestino?
          </label>
          <select
            name="intestine"
            value={formData.intestine}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900"
          >
            <option value="regular">Regularmente (diário)</option>
            <option value="slow">Lento (a cada 2-3 dias)</option>
            <option value="constipated">Preso (raramente funciona)</option>
          </select>
        </div>

        {/* Water Intake */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Ingestão diária de água?
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all">
              <input
                type="radio"
                name="waterIntake"
                value="lessThan1"
                checked={formData.waterIntake === 'lessThan1'}
                onChange={handleChange}
                className="w-4 h-4 text-pink-600"
              />
              <span className="ml-3 text-gray-900">Menos de 1 litro</span>
            </label>
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all">
              <input
                type="radio"
                name="waterIntake"
                value="between1and2"
                checked={formData.waterIntake === 'between1and2'}
                onChange={handleChange}
                className="w-4 h-4 text-pink-600"
              />
              <span className="ml-3 text-gray-900">Entre 1 e 2 litros</span>
            </label>
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all">
              <input
                type="radio"
                name="waterIntake"
                value="moreThan2"
                checked={formData.waterIntake === 'moreThan2'}
                onChange={handleChange}
                className="w-4 h-4 text-pink-600"
              />
              <span className="ml-3 text-gray-900">Mais de 2 litros</span>
            </label>
          </div>
        </div>

        {/* Sunscreen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Utiliza protetor solar facial diariamente?
          </label>
          <div className="flex space-x-4">
            <label className="flex-1">
              <input
                type="radio"
                name="sunscreen"
                value="yes"
                checked={formData.sunscreen === 'yes'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Sim</span>
              </div>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="sunscreen"
                value="no"
                checked={formData.sunscreen === 'no'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Não</span>
              </div>
            </label>
          </div>
        </div>

        {/* Cosmetics */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Faz uso de cosméticos para tratamento? (ácidos, clareadores)
          </label>
          <div className="flex space-x-4">
            <label className="flex-1">
              <input
                type="radio"
                name="cosmetics"
                value="yes"
                checked={formData.cosmetics === 'yes'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Sim</span>
              </div>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="cosmetics"
                value="no"
                checked={formData.cosmetics === 'no'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Não</span>
              </div>
            </label>
          </div>
        </div>

        {formData.cosmetics === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qual(is)?
            </label>
            <input
              type="text"
              name="cosmeticsType"
              value={formData.cosmeticsType}
              onChange={handleChange}
              placeholder="Ex: Ácido glicólico, Vitamina C"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-4">
        <Button type="button" variant="outline" className="flex-1 py-4" onClick={onPrevious}>
          ← Voltar
        </Button>
        <Button type="submit" variant="primary" className="flex-1 py-4">
          Avançar para Saúde →
        </Button>
      </div>
    </form>
  )
}

