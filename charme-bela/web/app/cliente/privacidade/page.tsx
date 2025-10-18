'use client'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ClientLayout } from '@/components/ClientLayout'
import { Shield, Lock, Eye, FileText } from 'lucide-react'

export default function PrivacidadePage() {
  return (
    <ProtectedRoute requiredRole="CLIENT">
      <ClientLayout title="Privacidade">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Privacidade e Dados</h1>
                <p className="text-sm text-gray-600">Como protegemos suas informações</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Segurança de Dados */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-pink-600" />
                  <h3 className="font-semibold text-gray-900">Segurança de Dados</h3>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Todos os seus dados pessoais e médicos são armazenados com criptografia de ponta a ponta. 
                  Utilizamos os mais altos padrões de segurança para proteger suas informações.
                </p>
              </div>

              {/* Dados Coletados */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-5 h-5 text-pink-600" />
                  <h3 className="font-semibold text-gray-900">Dados Coletados</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 mt-1">•</span>
                    <span>Informações pessoais (nome, e-mail, telefone)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 mt-1">•</span>
                    <span>Ficha de anamnese (histórico médico e estético)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 mt-1">•</span>
                    <span>Histórico de agendamentos e tratamentos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 mt-1">•</span>
                    <span>Informações de pagamento (processadas pelo Stripe)</span>
                  </li>
                </ul>
              </div>

              {/* Uso dos Dados */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-pink-600" />
                  <h3 className="font-semibold text-gray-900">Uso dos Dados</h3>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Seus dados são utilizados exclusivamente para:
                </p>
                <ul className="space-y-2 text-sm text-gray-700 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 mt-1">•</span>
                    <span>Fornecer os serviços contratados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 mt-1">•</span>
                    <span>Gerenciar sua assinatura e agendamentos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 mt-1">•</span>
                    <span>Personalizar tratamentos conforme seu perfil</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-600 mt-1">•</span>
                    <span>Comunicar sobre alterações e novidades</span>
                  </li>
                </ul>
              </div>

              {/* Seus Direitos */}
              <div className="bg-pink-50 border-l-4 border-pink-500 p-4 rounded">
                <h3 className="font-semibold text-pink-900 mb-2">Seus Direitos (LGPD)</h3>
                <p className="text-sm text-pink-800 leading-relaxed">
                  Você tem direito a acessar, corrigir, excluir ou exportar seus dados a qualquer momento. 
                  Para exercer esses direitos, entre em contato conosco.
                </p>
              </div>

              {/* Contato */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  Dúvidas sobre privacidade?
                </p>
                <a 
                  href="https://wa.me/5511913129669" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-pink-600 font-medium hover:text-pink-700"
                >
                  Fale conosco via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    </ProtectedRoute>
  )
}

