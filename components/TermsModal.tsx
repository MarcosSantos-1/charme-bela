'use client'

import { X } from 'lucide-react'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Termos de Uso</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)] prose prose-pink">
          <p className="text-sm text-gray-500 mb-4">Última atualização: 15 de outubro de 2024</p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1. Aceitação dos Termos</h3>
          <p className="text-gray-700">
            Ao acessar e usar os serviços do Charme & Bela, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">2. Serviços Oferecidos</h3>
          <p className="text-gray-700">
            O Charme & Bela oferece serviços de estética e beleza, incluindo mas não limitado a:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
            <li>Tratamentos faciais e corporais</li>
            <li>Procedimentos estéticos</li>
            <li>Massagens terapêuticas e relaxantes</li>
            <li>Depilação e cuidados com a pele</li>
            <li>Outros serviços relacionados à estética</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">3. Uso da Plataforma</h3>
          <p className="text-gray-700">
            Você concorda em usar nossa plataforma apenas para fins legítimos e de acordo com estes termos. É proibido:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
            <li>Usar a plataforma de maneira fraudulenta ou ilegal</li>
            <li>Fornecer informações falsas ou enganosas</li>
            <li>Violar direitos de propriedade intelectual</li>
            <li>Tentar obter acesso não autorizado ao sistema</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4. Agendamentos e Cancelamentos</h3>
          <p className="text-gray-700">
            Os agendamentos devem ser feitos através da plataforma ou por contato direto. Cancelamentos devem ser realizados com antecedência mínima de 24 horas, caso contrário, poderão ser aplicadas taxas.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">5. Pagamentos</h3>
          <p className="text-gray-700">
            Os pagamentos pelos serviços podem ser realizados através dos métodos disponibilizados pela clínica. Todos os preços estão sujeitos a alteração sem aviso prévio.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">6. Responsabilidades</h3>
          <p className="text-gray-700">
            O Charme & Bela não se responsabiliza por reações adversas a tratamentos quando informações médicas relevantes não forem fornecidas pelo cliente. É fundamental que você preencha a anamnese com informações verdadeiras e completas.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7. Alterações nos Termos</h3>
          <p className="text-gray-700">
            Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação na plataforma.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">8. Contato</h3>
          <p className="text-gray-700">
            Para dúvidas sobre estes termos, entre em contato conosco através dos canais de atendimento disponíveis na plataforma.
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-xl transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}

