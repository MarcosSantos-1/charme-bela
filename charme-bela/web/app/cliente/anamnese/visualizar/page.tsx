'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileCheck, User, Heart, Activity, Target, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function VisualizarAnamnesePage() {
  const router = useRouter()
  const [anamneseData, setAnamneseData] = useState<any>(null)

  useEffect(() => {
    const data = localStorage.getItem('anamneseData')
    if (data) {
      setAnamneseData(JSON.parse(data))
    } else {
      toast.error('Você ainda não preencheu a ficha de anamnese.', {
        duration: 3000,
        icon: '⚠️'
      })
      router.push('/cliente/perfil')
    }
  }, [router])

  if (!anamneseData) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>Carregando...</p>
    </div>
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5 text-gray-900" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Minha Ficha de Anamnese</h1>
                <p className="text-xs text-gray-600">Visualização completa</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-6 text-center border-2 border-green-200">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ficha Completa ✓</h2>
            <p className="text-gray-600">
              Sua ficha de anamnese foi preenchida com sucesso
            </p>
          </div>

          {/* Dados Pessoais */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Dados Pessoais</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Nome Completo:</span>
                <span className="font-medium text-gray-900">{anamneseData.fullName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Data de Nascimento:</span>
                <span className="font-medium text-gray-900">{anamneseData.birthDate}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Telefone:</span>
                <span className="font-medium text-gray-900">{anamneseData.phone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">E-mail:</span>
                <span className="font-medium text-gray-900">{anamneseData.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Como nos conheceu:</span>
                <span className="font-medium text-gray-900">{anamneseData.howKnew || 'Não informado'}</span>
              </div>
            </div>
          </div>

          {/* Estilo de Vida */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Estilo de Vida</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Atividade Física:</span>
                <span className="font-medium text-gray-900">{anamneseData.exerciseActivity === 'yes' ? 'Sim' : 'Não'}</span>
              </div>
              {anamneseData.exerciseActivity === 'yes' && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium text-gray-900">{anamneseData.exerciseType}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Nível de Estresse:</span>
                <span className="font-medium text-gray-900">{anamneseData.stressLevel}/5</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Fuma:</span>
                <span className="font-medium text-gray-900">{anamneseData.smoking === 'yes' ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Ingestão de Água:</span>
                <span className="font-medium text-gray-900">
                  {anamneseData.waterIntake === 'lessThan1' ? 'Menos de 1L' : 
                   anamneseData.waterIntake === 'between1and2' ? '1-2L' : 'Mais de 2L'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Protetor Solar:</span>
                <span className="font-medium text-gray-900">{anamneseData.sunscreen === 'yes' ? 'Sim' : 'Não'}</span>
              </div>
            </div>
          </div>

          {/* Saúde */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Histórico de Saúde</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Alergias:</span>
                <span className="font-medium text-gray-900">{anamneseData.allergies === 'yes' ? 'Sim' : 'Não'}</span>
              </div>
              {anamneseData.allergies === 'yes' && (
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-600 block mb-1">Detalhes:</span>
                  <span className="font-medium text-gray-900">{anamneseData.allergiesDetails}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Medicamentos Contínuos:</span>
                <span className="font-medium text-gray-900">{anamneseData.medications === 'yes' ? 'Sim' : 'Não'}</span>
              </div>
              {anamneseData.healthConditions && anamneseData.healthConditions.length > 0 && (
                <div className="py-2">
                  <span className="text-gray-600 block mb-2">Condições de Saúde:</span>
                  <div className="flex flex-wrap gap-2">
                    {anamneseData.healthConditions.map((condition: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs">
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Objetivos */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Objetivos</h3>
            </div>
            <div className="space-y-3 text-sm">
              {anamneseData.mainGoal && (
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-600 block mb-1">Objetivo Principal:</span>
                  <span className="font-medium text-gray-900">{anamneseData.mainGoal}</span>
                </div>
              )}
              {anamneseData.faceIssues && anamneseData.faceIssues.length > 0 && (
                <div className="py-2 border-b border-gray-100">
                  <span className="text-gray-600 block mb-2">Preocupações Faciais:</span>
                  <div className="flex flex-wrap gap-2">
                    {anamneseData.faceIssues.map((issue: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-xs">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {anamneseData.bodyIssues && anamneseData.bodyIssues.length > 0 && (
                <div className="py-2">
                  <span className="text-gray-600 block mb-2">Preocupações Corporais:</span>
                  <div className="flex flex-wrap gap-2">
                    {anamneseData.bodyIssues.map((issue: string, index: number) => (
                      <span key={index} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Termo */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Termo de Responsabilidade</h3>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-green-900">
                ✓ Termo de responsabilidade aceito e assinado digitalmente
              </p>
              <p className="text-xs text-green-700 mt-2">
                Data: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/cliente/anamnese')}
              className="flex-1 px-6 py-3 border-2 border-pink-600 text-pink-600 rounded-xl font-medium hover:bg-pink-50 transition-colors"
            >
              Atualizar Ficha
            </button>
            <button
              onClick={() => router.push('/cliente/perfil')}
              className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-xl font-medium hover:bg-pink-700 transition-colors"
            >
              Voltar ao Perfil
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

