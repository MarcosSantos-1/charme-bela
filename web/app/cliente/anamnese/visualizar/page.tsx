'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useAnamnesis } from '@/lib/hooks/useAnamnesis'
import { backendToFrontend } from '@/lib/adapters/anamnesisAdapter'
import { FileText, User, Heart, Target, CheckCircle2, AlertCircle } from 'lucide-react'

// Funções para traduzir valores
const translateYesNo = (value: string | undefined): string => {
  if (value === 'yes') return 'Sim'
  if (value === 'no') return 'Não'
  return '-'
}

const translateHowKnew = (value: string | undefined): string => {
  const map: any = {
    'indicacao': 'Indicação',
    'instagram': 'Instagram',
    'google': 'Google',
    'outro': 'Outro'
  }
  return map[value || ''] || '-'
}

const translateWaterIntake = (value: string | undefined): string => {
  const map: any = {
    'lessThan1': 'Menos de 1 litro',
    'between1and2': '1-2 litros',
    'moreThan2': 'Mais de 2 litros'
  }
  return map[value || ''] || '-'
}

const translateIntestine = (value: string | undefined): string => {
  const map: any = {
    'regular': 'Regular',
    'constipated': 'Preso',
    'loose': 'Solto'
  }
  return map[value || ''] || '-'
}

const translateHealthCondition = (value: string): string => {
  const map: any = {
    'hypertension': 'Hipertensão',
    'hypotension': 'Hipotensão',
    'diabetes': 'Diabetes',
    'circulatory': 'Distúrbios circulatórios',
    'skinDisease': 'Doença de pele',
    'hormonal': 'Alterações hormonais',
    'epilepsy': 'Epilepsia',
    'cancer': 'Câncer'
  }
  return map[value] || value
}

const translateFaceIssue = (value: string): string => {
  const map: any = {
    'acne': 'Acne/Cravos',
    'spots': 'Manchas/Melasma',
    'wrinkles': 'Rugas/Linhas de Expressão',
    'sagging': 'Flacidez',
    'darkCircles': 'Olheiras'
  }
  return map[value] || value
}

const translateBodyIssue = (value: string): string => {
  const map: any = {
    'localizedFat': 'Gordura Localizada',
    'cellulite': 'Celulite',
    'stretchMarks': 'Estrias',
    'bodySagging': 'Flacidez',
    'hair': 'Pelos'
  }
  return map[value] || value
}

export default function VisualizarAnamnesePage() {
  const { user } = useAuth()
  const { anamnesis, hasAnamnesis, loading, error } = useAnamnesis(user?.id)

  if (loading) {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Minha Anamnese">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  if (!hasAnamnesis || error) {
    return (
      <ProtectedRoute requiredRole="CLIENT">
        <ClientLayout title="Minha Anamnese">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Anamnese não encontrada</h3>
                  <p className="text-sm text-yellow-800">
                    Você ainda não preencheu sua ficha de anamnese.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ClientLayout>
      </ProtectedRoute>
    )
  }

  const data = backendToFrontend(anamnesis)

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Minha Anamnese">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl text-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Ficha de Anamnese</h1>
                <p className="text-pink-100 text-sm">
                  Preenchida em {anamnesis.createdAt && new Date(anamnesis.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
              <User className="w-5 h-5 text-pink-600" />
              <h2 className="font-semibold text-gray-900">Dados Pessoais</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nome Completo</p>
                <p className="font-medium text-gray-900">{data.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data de Nascimento</p>
                <p className="font-medium text-gray-900">
                  {data.birthDate ? data.birthDate.toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="font-medium text-gray-900">{data.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">E-mail</p>
                <p className="font-medium text-gray-900">{data.email || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Endereço</p>
                <p className="font-medium text-gray-900">
                  {data.street}, {data.number} {data.complement && ` - ${data.complement}`}<br />
                  {data.neighborhood} - {data.city}/{data.state}<br />
                  CEP: {data.cep}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Como nos conheceu?</p>
                <p className="font-medium text-gray-900">{translateHowKnew(data.howKnew)}</p>
              </div>
            </div>
          </div>

          {/* Estilo de Vida */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
              <Heart className="w-5 h-5 text-pink-600" />
              <h2 className="font-semibold text-gray-900">Estilo de Vida</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Pratica Exercícios</p>
                <p className="font-medium text-gray-900">{translateYesNo(data.exerciseActivity)}</p>
              </div>
              {data.exerciseType && (
                <div>
                  <p className="text-sm text-gray-600">Tipo de Exercício</p>
                  <p className="font-medium text-gray-900">{data.exerciseType}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Nível de Estresse</p>
                <p className="font-medium text-gray-900">{data.stressLevel ? `${data.stressLevel}/10` : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fumante</p>
                <p className="font-medium text-gray-900">
                  {data.smoking === 'yes' && data.smokingAmount 
                    ? `Sim (${data.smokingAmount})`
                    : translateYesNo(data.smoking)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Consumo de Álcool</p>
                <p className="font-medium text-gray-900">{translateYesNo(data.alcohol)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ingestão de Água</p>
                <p className="font-medium text-gray-900">{translateWaterIntake(data.waterIntake)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Função Intestinal</p>
                <p className="font-medium text-gray-900">{translateIntestine(data.intestine)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Usa Protetor Solar</p>
                <p className="font-medium text-gray-900">{translateYesNo(data.sunscreen)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Usa Cosméticos</p>
                <p className="font-medium text-gray-900">
                  {data.cosmetics === 'yes' && data.cosmeticsType
                    ? `Sim (${data.cosmeticsType})`
                    : translateYesNo(data.cosmetics)}
                </p>
              </div>
            </div>
          </div>

          {/* Saúde */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
              <Heart className="w-5 h-5 text-pink-600" />
              <h2 className="font-semibold text-gray-900">Informações de Saúde</h2>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Possui alergias?</p>
                <p className="font-medium text-gray-900">{translateYesNo(data.allergies)}</p>
                {data.allergiesDetails && (
                  <p className="text-sm text-gray-700 mt-1 pl-4 border-l-2 border-pink-300">
                    {data.allergiesDetails}
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Faz uso de medicamentos?</p>
                <p className="font-medium text-gray-900">{translateYesNo(data.medications)}</p>
                {data.medicationsDetails && (
                  <p className="text-sm text-gray-700 mt-1 pl-4 border-l-2 border-pink-300">
                    {data.medicationsDetails}
                  </p>
                )}
              </div>
              
              {data.healthConditions && data.healthConditions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Condições de Saúde</p>
                  <div className="flex flex-wrap gap-2">
                    {data.healthConditions.map((condition, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium"
                      >
                        {translateHealthCondition(condition)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(data.pacemaker || data.metalImplant) && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Implantes</p>
                  <div className="flex flex-wrap gap-2">
                    {data.pacemaker && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        Marcapasso
                      </span>
                    )}
                    {data.metalImplant && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        Implante Metálico
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-600">Gestante</p>
                <p className="font-medium text-gray-900">{translateYesNo(data.pregnant)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Amamentando</p>
                <p className="font-medium text-gray-900">{translateYesNo(data.breastfeeding)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Usa Anticoncepcional</p>
                <p className="font-medium text-gray-900">
                  {data.birthControl === 'yes' && data.birthControlType
                    ? `Sim (${data.birthControlType})`
                    : translateYesNo(data.birthControl)}
                </p>
              </div>
            </div>
          </div>

          {/* Objetivos */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
              <Target className="w-5 h-5 text-pink-600" />
              <h2 className="font-semibold text-gray-900">Objetivos e Expectativas</h2>
            </div>
            <div className="space-y-4">
              {data.mainGoal && (
                <div>
                  <p className="text-sm text-gray-600">Objetivo Principal</p>
                  <p className="font-medium text-gray-900">{data.mainGoal}</p>
                </div>
              )}

              {data.faceIssues && data.faceIssues.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Preocupações Faciais</p>
                  <div className="flex flex-wrap gap-2">
                    {data.faceIssues.map((issue, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium"
                      >
                        {translateFaceIssue(issue)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.bodyIssues && data.bodyIssues.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Preocupações Corporais</p>
                  <div className="flex flex-wrap gap-2">
                    {data.bodyIssues.map((issue, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                      >
                        {translateBodyIssue(issue)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.bodyIssuesArea && (
                <div>
                  <p className="text-sm text-gray-600">Área Específica de Preocupação</p>
                  <p className="font-medium text-gray-900">{data.bodyIssuesArea}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-600">Já fez tratamentos estéticos anteriormente?</p>
                <p className="font-medium text-gray-900">{translateYesNo(data.previousTreatments)}</p>
                {data.previousTreatmentsDetails && (
                  <p className="text-sm text-gray-700 mt-1 pl-4 border-l-2 border-pink-300">
                    {data.previousTreatmentsDetails}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Termo Aceito */}
          <div className={`border-l-4 rounded-xl p-6 ${
            data.termsAccepted 
              ? 'bg-green-50 border-green-500'
              : 'bg-orange-50 border-orange-500'
          }`}>
            <div className="flex items-start gap-3">
              {data.termsAccepted ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-orange-600 mt-0.5" />
              )}
              <div>
                <h3 className={`font-semibold mb-1 ${
                  data.termsAccepted ? 'text-green-900' : 'text-orange-900'
                }`}>
                  Termo de Consentimento
                </h3>
                <p className={`text-sm ${
                  data.termsAccepted ? 'text-green-800' : 'text-orange-800'
                }`}>
                  {data.termsAccepted 
                    ? 'Você leu e aceitou o termo de responsabilidade e consentimento informado.'
                    : 'Termo não aceito'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    </ProtectedRoute>
  )
}
