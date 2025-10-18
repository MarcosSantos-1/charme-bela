'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Heart, AlertCircle } from 'lucide-react'

interface Props {
  data: any
  onNext: (data: any) => void
  onPrevious: () => void
}

export default function Step3Saude({ data, onNext, onPrevious }: Props) {
  const [formData, setFormData] = useState({
    allergies: data.allergies || 'no',
    allergiesDetails: data.allergiesDetails || '',
    healthConditions: data.healthConditions || [],
    diabetesDetails: data.diabetesDetails || '',
    cancerDetails: data.cancerDetails || '',
    medications: data.medications || 'no',
    medicationsDetails: data.medicationsDetails || '',
    pacemaker: data.pacemaker || false,
    metalImplant: data.metalImplant || false,
    pregnant: data.pregnant || 'no',
    breastfeeding: data.breastfeeding || 'no',
    birthControl: data.birthControl || 'no',
    birthControlType: data.birthControlType || ''
  })

  // Atualizar quando data mudar
  useEffect(() => {
    console.log('📝 Step3: Atualizando com dados carregados:', data)
    setFormData({
      allergies: data.allergies || 'no',
      allergiesDetails: data.allergiesDetails || '',
      healthConditions: data.healthConditions || [],
      diabetesDetails: data.diabetesDetails || '',
      cancerDetails: data.cancerDetails || '',
      medications: data.medications || 'no',
      medicationsDetails: data.medicationsDetails || '',
      pacemaker: data.pacemaker || false,
      metalImplant: data.metalImplant || false,
      pregnant: data.pregnant || 'no',
      breastfeeding: data.breastfeeding || 'no',
      birthControl: data.birthControl || 'no',
      birthControlType: data.birthControlType || ''
    })
  }, [data])

  const healthConditionsList = [
    { id: 'hypertension', label: 'Hipertensão (Pressão Alta)' },
    { id: 'hypotension', label: 'Hipotensão (Pressão Baixa)' },
    { id: 'diabetes', label: 'Diabetes' },
    { id: 'circulatory', label: 'Distúrbios circulatórios (trombose, varizes)' },
    { id: 'skinDisease', label: 'Doença de pele (psoríase, vitiligo, dermatite)' },
    { id: 'hormonal', label: 'Alterações hormonais (tireoide, SOP)' },
    { id: 'epilepsy', label: 'Epilepsia / Convulsões' },
    { id: 'cancer', label: 'Câncer ou histórico de câncer' }
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setFormData({
        ...formData,
        healthConditions: [...formData.healthConditions, e.target.value]
      })
    } else {
      setFormData({
        ...formData,
        healthConditions: formData.healthConditions.filter((item: string) => item !== e.target.value)
      })
    }
  }

  const handleSimpleCheckbox = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-white rounded-2xl p-6 border-2 border-red-200">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sua Saúde 🩺</h2>
        <div className="flex items-start space-x-2 mt-4 p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-900">
            <strong>Sua segurança é nossa prioridade.</strong> Por favor, responda com atenção. Essas informações são confidenciais.
          </p>
        </div>
      </div>

      {/* Health Questions */}
      <div className="bg-white rounded-2xl p-6 space-y-6">
        <h3 className="font-semibold text-gray-900 mb-4">Histórico Clínico</h3>

        {/* Allergies */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Você possui alguma alergia? (medicamentos, cosméticos, alimentos)
          </label>
          <div className="flex space-x-4 mb-3">
            <label className="flex-1">
              <input
                type="radio"
                name="allergies"
                value="yes"
                checked={formData.allergies === 'yes'}
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
                name="allergies"
                value="no"
                checked={formData.allergies === 'no'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Não</span>
              </div>
            </label>
          </div>

          {formData.allergies === 'yes' && (
            <textarea
              name="allergiesDetails"
              value={formData.allergiesDetails}
              onChange={handleChange}
              placeholder="Descreva suas alergias..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          )}
        </div>

        {/* Health Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Marque qualquer condição de saúde que você tenha:
          </label>
          <div className="space-y-2">
            {healthConditionsList.map((condition) => (
              <label
                key={condition.id}
                className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all"
              >
                <input
                  type="checkbox"
                  value={condition.id}
                  checked={formData.healthConditions.includes(condition.id)}
                  onChange={handleCheckbox}
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <span className="ml-3 text-gray-900">{condition.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Diabetes Details */}
        {formData.healthConditions.includes('diabetes') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo 1 ou 2? Está controlada?
            </label>
            <input
              type="text"
              name="diabetesDetails"
              value={formData.diabetesDetails}
              onChange={handleChange}
              placeholder="Ex: Tipo 2, controlada com medicação"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        )}

        {/* Cancer Details */}
        {formData.healthConditions.includes('cancer') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qual tipo e quando? Fez quimio/radio?
            </label>
            <textarea
              name="cancerDetails"
              value={formData.cancerDetails}
              onChange={handleChange}
              placeholder="Descreva..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          </div>
        )}

        {/* Medications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Faz uso de algum medicamento contínuo?
          </label>
          <div className="flex space-x-4 mb-3">
            <label className="flex-1">
              <input
                type="radio"
                name="medications"
                value="yes"
                checked={formData.medications === 'yes'}
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
                name="medications"
                value="no"
                checked={formData.medications === 'no'}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Não</span>
              </div>
            </label>
          </div>

          {formData.medications === 'yes' && (
            <textarea
              name="medicationsDetails"
              value={formData.medicationsDetails}
              onChange={handleChange}
              placeholder="Liste os medicamentos que você usa..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />
          )}
        </div>

        {/* Implants */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Possui algum destes?
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all">
              <input
                type="checkbox"
                checked={formData.pacemaker}
                onChange={(e) => handleSimpleCheckbox('pacemaker', e.target.checked)}
                className="w-4 h-4 text-pink-600 rounded"
              />
              <span className="ml-3 text-gray-900">Portador de Marcapasso</span>
            </label>
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all">
              <input
                type="checkbox"
                checked={formData.metalImplant}
                onChange={(e) => handleSimpleCheckbox('metalImplant', e.target.checked)}
                className="w-4 h-4 text-pink-600 rounded"
              />
              <span className="ml-3 text-gray-900">Implante dentário ou prótese metálica no corpo</span>
            </label>
          </div>
        </div>

        {/* Women's Health */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Para mulheres:</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Está gestante ou suspeita de gravidez?
              </label>
              <div className="flex space-x-4">
                <label className="flex-1">
                  <input
                    type="radio"
                    name="pregnant"
                    value="yes"
                    checked={formData.pregnant === 'yes'}
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
                    name="pregnant"
                    value="no"
                    checked={formData.pregnant === 'no'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                    <span className="text-gray-900 font-medium">Não</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Está amamentando?
              </label>
              <div className="flex space-x-4">
                <label className="flex-1">
                  <input
                    type="radio"
                    name="breastfeeding"
                    value="yes"
                    checked={formData.breastfeeding === 'yes'}
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
                    name="breastfeeding"
                    value="no"
                    checked={formData.breastfeeding === 'no'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                    <span className="text-gray-900 font-medium">Não</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Faz uso de anticoncepcional?
              </label>
              <div className="flex space-x-4 mb-3">
                <label className="flex-1">
                  <input
                    type="radio"
                    name="birthControl"
                    value="yes"
                    checked={formData.birthControl === 'yes'}
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
                    name="birthControl"
                    value="no"
                    checked={formData.birthControl === 'no'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                    <span className="text-gray-900 font-medium">Não</span>
                  </div>
                </label>
              </div>

              {formData.birthControl === 'yes' && (
                <input
                  type="text"
                  name="birthControlType"
                  value={formData.birthControlType}
                  onChange={handleChange}
                  placeholder="Ex: Pílula, DIU Hormonal, DIU de Cobre"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-4">
        <Button type="button" variant="outline" className="flex-1 py-4" onClick={onPrevious}>
          ← Voltar
        </Button>
        <Button type="submit" variant="primary" className="flex-1 py-4">
          Avançar para Objetivos →
        </Button>
      </div>
    </form>
  )
}

