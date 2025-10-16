'use client'

import { X } from 'lucide-react'

interface PrivacyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Política de Privacidade</h2>
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

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1. Informações que Coletamos</h3>
          <p className="text-gray-700">
            Coletamos as seguintes informações quando você usa nossa plataforma:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
            <li><strong>Informações de cadastro:</strong> nome, email, telefone, foto de perfil</li>
            <li><strong>Informações de anamnese:</strong> histórico de saúde, alergias, tratamentos anteriores</li>
            <li><strong>Informações de agendamento:</strong> serviços contratados, datas, horários</li>
            <li><strong>Informações de pagamento:</strong> dados de transações (processados por terceiros seguros)</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">2. Como Usamos suas Informações</h3>
          <p className="text-gray-700">
            Utilizamos suas informações para:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
            <li>Fornecer e melhorar nossos serviços</li>
            <li>Gerenciar agendamentos e comunicações</li>
            <li>Personalizar tratamentos de acordo com suas necessidades</li>
            <li>Enviar lembretes e notificações importantes</li>
            <li>Processar pagamentos de forma segura</li>
            <li>Cumprir obrigações legais e regulatórias</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">3. Compartilhamento de Informações</h3>
          <p className="text-gray-700">
            Não vendemos suas informações pessoais. Podemos compartilhar dados apenas:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
            <li>Com profissionais da clínica (para prestação de serviços)</li>
            <li>Com processadores de pagamento (de forma segura e criptografada)</li>
            <li>Quando exigido por lei ou ordem judicial</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4. Segurança dos Dados</h3>
          <p className="text-gray-700">
            Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
            <li>Criptografia de dados sensíveis</li>
            <li>Acesso restrito às informações</li>
            <li>Servidores seguros (Firebase/Google Cloud)</li>
            <li>Monitoramento constante de segurança</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">5. Seus Direitos (LGPD)</h3>
          <p className="text-gray-700">
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos ou incorretos</li>
            <li>Solicitar a exclusão de dados (com exceções legais)</li>
            <li>Revogar consentimento para tratamento de dados</li>
            <li>Solicitar portabilidade dos dados</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">6. Cookies e Tecnologias</h3>
          <p className="text-gray-700">
            Utilizamos cookies e tecnologias similares para melhorar sua experiência, como lembrar suas preferências e analisar o uso da plataforma.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7. Retenção de Dados</h3>
          <p className="text-gray-700">
            Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais. Dados médicos são mantidos conforme exigido pela legislação de saúde.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">8. Alterações nesta Política</h3>
          <p className="text-gray-700">
            Podemos atualizar esta política periodicamente. Notificaremos você sobre mudanças significativas através do email cadastrado.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">9. Contato</h3>
          <p className="text-gray-700">
            Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato através dos canais disponíveis na plataforma ou pelo email de privacidade.
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

