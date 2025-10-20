'use client'

import { useState, useEffect } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { X, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'

interface EditarAnamneseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  anamnese: any
}

export function EditarAnamneseModal({ isOpen, onClose, onSuccess, anamnese }: EditarAnamneseModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Estados dos dados
  const [personalData, setPersonalData] = useState<any>({})
  const [lifestyleData, setLifestyleData] = useState<any>({})
  const [healthData, setHealthData] = useState<any>({})
  const [objectivesData, setObjectivesData] = useState<any>({})

  useEffect(() => {
    if (isOpen && anamnese) {
      // Preencher com dados existentes
      setPersonalData(anamnese.personalData || {})
      setLifestyleData(anamnese.lifestyleData || {})
      setHealthData(anamnese.healthData || {})
      setObjectivesData(anamnese.objectivesData || {})
      setCurrentStep(1)
    }
  }, [isOpen, anamnese])

  const handleSave = async () => {
    setLoading(true)
    try {
      const data = {
        personalData,
        lifestyleData,
        healthData,
        objectivesData,
        termsAccepted: anamnese.termsAccepted || false
      }

      await api.updateAnamnesis(anamnese.userId, data)
      
      toast.success('Anamnese atualizada com sucesso!')
      
      if (onSuccess) onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro ao atualizar anamnese:', error)
      toast.error(error.message || 'Erro ao atualizar anamnese')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  if (!anamnese) return null

  return (
    <div className={`fixed inset-0 bg-black/60 z-50 ${isOpen ? 'flex' : 'hidden'} items-center justify-center p-4`}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            Editar Anamnese - {anamnese.user?.name || 'Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
        {/* Progress */}
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step === currentStep
                    ? 'bg-pink-600 text-white'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {step < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Steps Content */}
        <div className="p-4 bg-gray-50 rounded-xl">
          {currentStep === 1 && (
            <Step1Content data={personalData} setData={setPersonalData} />
          )}
          {currentStep === 2 && (
            <Step2Content data={lifestyleData} setData={setLifestyleData} />
          )}
          {currentStep === 3 && (
            <Step3Content data={healthData} setData={setHealthData} sexo={personalData.sexo} />
          )}
          {currentStep === 4 && (
            <Step4Content data={objectivesData} setData={setObjectivesData} />
          )}
        </div>
        </div>
      </div>

        {/* Navigation - Sticky Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          <div className="text-sm font-medium text-gray-700">
            Etapa {currentStep} de 4
          </div>

          {currentStep < 4 ? (
            <Button variant="primary" onClick={nextStep}>
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="w-4 h-4 sm:ml-2" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

// Step 1: Dados Pessoais
function Step1Content({ data, setData }: any) {
  const updateField = (field: string, value: any) => {
    setData({ ...data, [field]: value })
  }

  const updateAddress = (field: string, value: any) => {
    setData({
      ...data,
      address: { ...(data.address || {}), [field]: value }
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Dados Pessoais</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo *
          </label>
          <input
            type="text"
            value={data.fullName || ''}
            onChange={(e) => updateField('fullName', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sexo *
          </label>
          <select
            value={data.sexo || ''}
            onChange={(e) => updateField('sexo', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
            required
          >
            <option value="">Selecione</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Nascimento
          </label>
          <input
            type="date"
            value={data.birthDate || ''}
            onChange={(e) => updateField('birthDate', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone
          </label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          />
        </div>
      </div>

      <h4 className="text-md font-semibold text-gray-900 mt-6 mb-3">Endereço</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rua
          </label>
          <input
            type="text"
            value={data.address?.street || ''}
            onChange={(e) => updateAddress('street', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número
          </label>
          <input
            type="text"
            value={data.address?.number || ''}
            onChange={(e) => updateAddress('number', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bairro
          </label>
          <input
            type="text"
            value={data.address?.neighborhood || ''}
            onChange={(e) => updateAddress('neighborhood', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cidade
          </label>
          <input
            type="text"
            value={data.address?.city || ''}
            onChange={(e) => updateAddress('city', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <input
            type="text"
            value={data.address?.state || ''}
            onChange={(e) => updateAddress('state', e.target.value)}
            maxLength={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 uppercase"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Como nos conheceu?
        </label>
        <select
          value={data.howKnew || ''}
          onChange={(e) => updateField('howKnew', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
        >
          <option value="">Selecione</option>
          <option value="indicacao">Indicação</option>
          <option value="instagram">Instagram</option>
          <option value="google">Google</option>
          <option value="outro">Outro</option>
        </select>
      </div>
    </div>
  )
}

// Step 2: Estilo de Vida
function Step2Content({ data, setData }: any) {
  const updateField = (field: string, value: any) => {
    setData({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">💪 Estilo de Vida</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pratica exercícios físicos?
          </label>
          <select
            value={data.exerciseActivity || ''}
            onChange={(e) => updateField('exerciseActivity', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </div>

        {data.exerciseActivity === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qual tipo de exercício?
            </label>
            <input
              type="text"
              value={data.exerciseType || ''}
              onChange={(e) => updateField('exerciseType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              placeholder="Ex: Musculação, Corrida, Yoga..."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nível de Stress
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={data.stressLevel || '3'}
            onChange={(e) => updateField('stressLevel', e.target.value)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Muito baixo</span>
            <span className="font-semibold text-pink-600">Nível {data.stressLevel || '3'}</span>
            <span>Muito alto</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fumante?
          </label>
          <select
            value={data.smoking || ''}
            onChange={(e) => updateField('smoking', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Consome álcool?
          </label>
          <select
            value={data.alcohol || ''}
            onChange={(e) => updateField('alcohol', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ingestão de água diária
          </label>
          <select
            value={data.waterIntake || ''}
            onChange={(e) => updateField('waterIntake', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="lessThan1">Menos de 1L</option>
            <option value="between1and2">Entre 1-2L</option>
            <option value="moreThan2">Mais de 2L</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Função intestinal
          </label>
          <select
            value={data.intestine || ''}
            onChange={(e) => updateField('intestine', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="regular">Regular</option>
            <option value="constipated">Preso</option>
            <option value="loose">Solto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usa protetor solar?
          </label>
          <select
            value={data.sunscreen || ''}
            onChange={(e) => updateField('sunscreen', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usa cosméticos?
          </label>
          <select
            value={data.cosmetics || ''}
            onChange={(e) => updateField('cosmetics', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </div>

        {data.cosmetics === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quais cosméticos?
            </label>
            <input
              type="text"
              value={data.cosmeticsType || ''}
              onChange={(e) => updateField('cosmeticsType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              placeholder="Descreva os cosméticos que usa..."
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Step 3: Saúde
function Step3Content({ data, setData, sexo }: any) {
  const updateField = (field: string, value: any) => {
    setData({ ...data, [field]: value })
  }

  const toggleHealthCondition = (condition: string) => {
    const conditions = data.healthConditions || []
    if (conditions.includes(condition)) {
      updateField('healthConditions', conditions.filter((c: string) => c !== condition))
    } else {
      updateField('healthConditions', [...conditions, condition])
    }
  }

  const isFeminino = sexo === 'feminino'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">🏥 Informações de Saúde</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Possui alergias?
          </label>
          <select
            value={data.allergies || ''}
            onChange={(e) => updateField('allergies', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </div>

        {data.allergies === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detalhe as alergias
            </label>
            <textarea
              value={data.allergiesDetails || ''}
              onChange={(e) => updateField('allergiesDetails', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              placeholder="Descreva suas alergias..."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Condições de saúde (selecione todas que se aplicam)
          </label>
          <div className="space-y-2">
            {[
              { value: 'hypertension', label: 'Hipertensão' },
              { value: 'hypotension', label: 'Hipotensão' },
              { value: 'diabetes', label: 'Diabetes' },
              { value: 'circulatory', label: 'Distúrbios circulatórios' },
              { value: 'skinDisease', label: 'Doença de pele' },
              { value: 'hormonal', label: 'Alterações hormonais' },
              { value: 'epilepsy', label: 'Epilepsia' },
              { value: 'cancer', label: 'Câncer' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(data.healthConditions || []).includes(value)}
                  onChange={() => toggleHealthCondition(value)}
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usa medicamentos?
          </label>
          <select
            value={data.medications || ''}
            onChange={(e) => updateField('medications', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </div>

        {data.medications === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quais medicamentos?
            </label>
            <textarea
              value={data.medicationsDetails || ''}
              onChange={(e) => updateField('medicationsDetails', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              placeholder="Liste os medicamentos que usa..."
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.pacemaker || false}
              onChange={(e) => updateField('pacemaker', e.target.checked)}
              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <span className="text-sm text-gray-700">Possui marcapasso</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.metalImplant || false}
              onChange={(e) => updateField('metalImplant', e.target.checked)}
              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <span className="text-sm text-gray-700">Possui implante metálico</span>
          </label>
        </div>

        {/* Perguntas apenas para mulheres */}
        {isFeminino && (
          <>
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-pink-700 mb-3">Perguntas específicas (Feminino)</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Está gestante?
              </label>
              <select
                value={data.pregnant || ''}
                onChange={(e) => updateField('pregnant', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              >
                <option value="">Selecione</option>
                <option value="yes">Sim</option>
                <option value="no">Não</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Está amamentando?
              </label>
              <select
                value={data.breastfeeding || ''}
                onChange={(e) => updateField('breastfeeding', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              >
                <option value="">Selecione</option>
                <option value="yes">Sim</option>
                <option value="no">Não</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usa anticoncepcional?
              </label>
              <select
                value={data.birthControl || ''}
                onChange={(e) => updateField('birthControl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              >
                <option value="">Selecione</option>
                <option value="yes">Sim</option>
                <option value="no">Não</option>
              </select>
            </div>

            {data.birthControl === 'yes' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qual tipo?
                </label>
                <input
                  type="text"
                  value={data.birthControlType || ''}
                  onChange={(e) => updateField('birthControlType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                  placeholder="Ex: Pílula, DIU, injeção..."
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Step 4: Objetivos
function Step4Content({ data, setData }: any) {
  const updateField = (field: string, value: any) => {
    setData({ ...data, [field]: value })
  }

  const toggleIssue = (issueType: 'faceIssues' | 'bodyIssues', issue: string) => {
    const issues = data[issueType] || []
    if (issues.includes(issue)) {
      updateField(issueType, issues.filter((i: string) => i !== issue))
    } else {
      updateField(issueType, [...issues, issue])
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 Objetivos e Expectativas</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Qual seu objetivo principal?
          </label>
          <textarea
            value={data.mainGoal || ''}
            onChange={(e) => updateField('mainGoal', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
            placeholder="Descreva seu objetivo principal..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Preocupações faciais (selecione todas que se aplicam)
          </label>
          <div className="space-y-2">
            {[
              { value: 'acne', label: 'Acne/Cravos' },
              { value: 'spots', label: 'Manchas/Melasma' },
              { value: 'wrinkles', label: 'Rugas' },
              { value: 'sagging', label: 'Flacidez' },
              { value: 'darkCircles', label: 'Olheiras' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(data.faceIssues || []).includes(value)}
                  onChange={() => toggleIssue('faceIssues', value)}
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Preocupações corporais (selecione todas que se aplicam)
          </label>
          <div className="space-y-2">
            {[
              { value: 'localizedFat', label: 'Gordura Localizada' },
              { value: 'cellulite', label: 'Celulite' },
              { value: 'stretchMarks', label: 'Estrias' },
              { value: 'bodySagging', label: 'Flacidez' },
              { value: 'hair', label: 'Pelos' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(data.bodyIssues || []).includes(value)}
                  onChange={() => toggleIssue('bodyIssues', value)}
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {(data.bodyIssues || []).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Área específica do corpo
            </label>
            <input
              type="text"
              value={data.bodyIssuesArea || ''}
              onChange={(e) => updateField('bodyIssuesArea', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              placeholder="Ex: Abdômen, coxas, braços..."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Já fez tratamentos estéticos antes?
          </label>
          <select
            value={data.previousTreatments || ''}
            onChange={(e) => updateField('previousTreatments', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
          >
            <option value="">Selecione</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </div>

        {data.previousTreatments === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quais tratamentos?
            </label>
            <textarea
              value={data.previousTreatmentsDetails || ''}
              onChange={(e) => updateField('previousTreatmentsDetails', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
              placeholder="Descreva os tratamentos que já fez..."
            />
          </div>
        )}
      </div>
    </div>
  )
}

