'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'
import toast from 'react-hot-toast'

// Steps Components
import Step1DadosPessoais from './steps/Step1DadosPessoais'
import Step2EstiloVida from './steps/Step2EstiloVida'
import Step3Saude from './steps/Step3Saude'
import Step4Objetivos from './steps/Step4Objetivos'
import Step5Termo from './steps/Step5Termo'

export default function AnamnesePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<any>({})

  const totalSteps = 5

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
    setFormData({ ...formData, ...data })
  }

  const handleSubmit = async () => {
    console.log('Anamnese completa:', formData)
    // Salvar no localStorage que completou a anamnese
    localStorage.setItem('hasCompletedAnamnese', 'true')
    localStorage.setItem('anamneseData', JSON.stringify(formData))
    
    toast.success('Ficha de anamnese enviada com sucesso! ✅', {
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
    }, 1000)
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
        return <Step5Termo data={formData} onSubmit={handleSubmit} onPrevious={handlePrevious} />
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

