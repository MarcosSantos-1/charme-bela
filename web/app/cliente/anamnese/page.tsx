'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'
import { frontendToBackend, FrontendAnamnesisData } from '@/lib/adapters/anamnesisAdapter'

// Steps Components
import Step1DadosPessoais from './steps/Step1DadosPessoais'
import Step2EstiloVida from './steps/Step2EstiloVida'
import Step3Saude from './steps/Step3Saude'
import Step4Objetivos from './steps/Step4Objetivos'
import Step5Termo from './steps/Step5Termo'

export default function AnamnesePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FrontendAnamnesisData>({})
  const [submitting, setSubmitting] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)

  const totalSteps = 5

  // Carregar anamnese existente
  useEffect(() => {
    const loadExistingAnamnesis = async () => {
      if (!user?.id) {
        setLoadingExisting(false)
        return
      }

      try {
        const existingAnamnesis = await api.getAnamnesisByUserId(user.id)
        
        console.log('📋 Carregando anamnese existente:', existingAnamnesis)
        
        // Usar o adapter para converter corretamente
        const { backendToFrontend } = await import('@/lib/adapters/anamnesisAdapter')
        const frontendData = backendToFrontend(existingAnamnesis)
        
        console.log('✅ Dados convertidos via adapter:', frontendData)
        setFormData(frontendData)
        
      } catch (error: any) {
        // Se não tem anamnese, preencher dados básicos do usuário
        if (error.message?.includes('não encontrada')) {
          console.log('ℹ️ Nova anamnese, preenchendo dados do usuário')
          setFormData({
            fullName: user.name || '',
            email: user.email || '',
            phone: user.phone || ''
          })
        } else {
          console.error('Erro ao carregar anamnese:', error)
        }
      } finally {
        setLoadingExisting(false)
      }
    }

    loadExistingAnamnesis()
  }, [user?.id, user?.name, user?.email, user?.phone])

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      window.scrollTo(0, 0)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleStepData = (data: any) => {
    console.log('📥 handleStepData recebeu:', data)
    const newFormData = { ...formData, ...data }
    console.log('📦 Novo formData será:', newFormData)
    setFormData(newFormData)
  }

  const handleSubmitWithData = async (finalFormData: FrontendAnamnesisData) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado')
      return
    }

    setSubmitting(true)
    
    try {
      console.log('📝 Enviando anamnese ao backend...', finalFormData)
      console.log('🔍 CRÍTICO - termsAccepted no formData:', finalFormData.termsAccepted)
      
      // Converte dados do frontend para o formato do backend
      const backendData = frontendToBackend(finalFormData, user.id)
      
      console.log('🔄 Dados convertidos:', backendData)
      console.log('🔍 CRÍTICO - termsAccepted no backendData:', backendData.termsAccepted)
      
      // Verificar se já existe anamnese
      let response
      try {
        const existingAnamnesis = await api.getAnamnesisByUserId(user.id)
        
        // Se existe, ATUALIZA (PUT)
        console.log('🔄 Anamnese já existe, atualizando...')
        response = await api.updateAnamnesis(user.id, backendData)
        console.log('✅ Anamnese atualizada:', response)
      } catch (error: any) {
        // Se não existe (404), CRIA (POST)
        if (error.message?.includes('não encontrada')) {
          console.log('➕ Anamnese não existe, criando nova...')
          response = await api.createAnamnesis(backendData)
          console.log('✅ Anamnese criada:', response)
        } else {
          throw error
        }
      }
      
      toast.success('Ficha de anamnese salva com sucesso! ✅', {
        duration: 4000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10b981',
        },
      })
      
      setTimeout(() => {
        router.push('/cliente')
      }, 1500)
    } catch (error: any) {
      console.error('❌ Erro ao enviar anamnese:', error)
      toast.error(error.message || 'Erro ao enviar ficha de anamnese')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1DadosPessoais data={formData} onNext={(data) => { handleStepData(data); handleNext() }} />
      case 2:
        return <Step2EstiloVida data={formData} onNext={(data) => { handleStepData(data); handleNext() }} onPrevious={handlePrevious} />
      case 3:
        return <Step3Saude data={formData} onNext={(data) => { handleStepData(data); handleNext() }} onPrevious={handlePrevious} />
      case 4:
        return <Step4Objetivos data={formData} onNext={(data) => { handleStepData(data); handleNext() }} onPrevious={handlePrevious} />
      case 5:
        return <Step5Termo 
          data={formData} 
          onSubmit={(termsData) => { 
            // Merge direto e passa para handleSubmit
            const finalData = { ...formData, ...termsData }
            console.log('🎯 Dados finais com termos:', finalData)
            handleSubmitWithData(finalData)
          }} 
          onPrevious={handlePrevious} 
          submitting={submitting} 
        />
      default:
        return null
    }
  }

  return (
    <ProtectedRoute requiredRole="CLIENT">
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-white">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 text-center">
                <h1 className="text-lg font-bold text-gray-900">Ficha de Anamnese</h1>
                <p className="text-xs text-gray-600">Passo {currentStep} de {totalSteps}</p>
              </div>
              <div className="w-10" /> {/* Spacer for alignment */}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <div className="flex items-center space-x-2">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    index + 1 <= currentStep
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
          {renderStep()}
        </div>
      </div>
    </ProtectedRoute>
  )
}

