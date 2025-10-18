'use client'

import { useRouter } from 'next/navigation'
import { FileText, X } from 'lucide-react'
import { Button } from './Button'

interface AnamneseRequiredModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AnamneseRequiredModal({ isOpen, onClose }: AnamneseRequiredModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleGoToAnamnese = () => {
    onClose()
    router.push('/cliente/anamnese')
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Ficha de Anamnese Necessária</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6 space-y-3">
          <p className="text-gray-700">
            Para garantir sua <strong>segurança</strong> e oferecer o melhor atendimento, 
            precisamos que você preencha a ficha de anamnese antes do seu primeiro agendamento.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡 O que é anamnese?</strong>
              <br />
              É um formulário com informações sobre sua saúde, alergias e histórico médico 
              que nos ajuda a personalizar os tratamentos para você.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              ⏱️ <strong>Leva apenas 5 minutos!</strong>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Fechar
          </Button>
          <Button
            variant="primary"
            onClick={handleGoToAnamnese}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Preencher Agora
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}

