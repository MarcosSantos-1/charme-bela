'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { FileCheck, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  data: any
  onSubmit: () => void
  onPrevious: () => void
}

export default function Step5Termo({ data, onSubmit, onPrevious }: Props) {
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed || !signature) {
      toast.error('Por favor, leia e aceite os termos e assine digitalmente.', {
        duration: 4000,
        icon: '⚠️'
      })
      return
    }
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-white rounded-2xl p-6 text-center border-2 border-green-200">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileCheck className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Termo de Responsabilidade 📝</h2>
        <p className="text-gray-600">
          Última etapa! Leia atentamente e assine digitalmente.
        </p>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">Termo de Consentimento</h3>

        <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 space-y-3">
          <p className="font-medium text-gray-900">
            TERMO DE RESPONSABILIDADE E CONSENTIMENTO INFORMADO
          </p>

          <p>
            Eu, <strong>{data.fullName || '[NOME DO CLIENTE]'}</strong>, inscrito(a) no CPF nº _____________, 
            declaro estar ciente sobre os benefícios, riscos e contra-indicações, principais efeitos colaterais 
            e advertências gerais, relacionados aos tratamentos estéticos corporais e faciais que serão realizados 
            no estabelecimento Charme & Bela.
          </p>

          <p className="font-medium text-gray-900 mt-4">
            DECLARO QUE:
          </p>

          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              Fui informado(a) sobre os procedimentos, seus objetivos, benefícios esperados e possíveis riscos.
            </li>
            <li>
              Todas as informações fornecidas na ficha de anamnese são verdadeiras e completas.
            </li>
            <li>
              Comprometo-me a seguir todas as orientações pré e pós-procedimento fornecidas pela profissional.
            </li>
            <li>
              Estou ciente de que os resultados podem variar de pessoa para pessoa.
            </li>
            <li>
              Informei sobre todas as condições de saúde, alergias, medicamentos em uso e tratamentos anteriores.
            </li>
            <li>
              Entendo que ocultar informações pode resultar em complicações e compromete a eficácia do tratamento.
            </li>
            <li>
              Autorizo o registro fotográfico antes e depois dos procedimentos para fins de acompanhamento clínico.
            </li>
            <li>
              Fui informado(a) sobre a política de cancelamento e reagendamento de sessões.
            </li>
          </ul>

          <p className="font-medium text-gray-900 mt-4">
            CONTRA-INDICAÇÕES GERAIS:
          </p>

          <p>
            Estou ciente de que os procedimentos estéticos podem ser contra-indicados em casos de: gravidez, 
            amamentação, infecções ativas, feridas abertas, doenças de pele não controladas, uso de marcapasso, 
            epilepsia não controlada, câncer em tratamento ativo, entre outras condições específicas avaliadas 
            pela profissional.
          </p>

          <p className="font-medium text-gray-900 mt-4">
            PRIVACIDADE E PROTEÇÃO DE DADOS:
          </p>

          <p>
            Autorizo o uso e armazenamento dos meus dados pessoais e informações de saúde contidas nesta ficha 
            exclusivamente para fins de atendimento clínico, em conformidade com a Lei Geral de Proteção de Dados 
            (LGPD - Lei nº 13.709/2018).
          </p>

          <p className="mt-4">
            Declaro que li e compreendi todas as informações acima e que tive a oportunidade de esclarecer todas 
            as minhas dúvidas antes de assinar este termo.
          </p>

          <p className="text-xs text-gray-500 mt-4">
            Data: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Agreement Checkbox */}
        <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 text-pink-600 rounded mt-1"
            required
          />
          <span className="ml-3 text-gray-900">
            <strong>Li e concordo com os termos acima</strong>, e confirmo que todas as informações 
            fornecidas nesta ficha são verdadeiras.
          </span>
        </label>

        {/* Digital Signature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assinatura Digital <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Digite seu nome completo para confirmar
          </p>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Digite seu nome completo"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500 font-signature"
            style={{ fontFamily: 'cursive' }}
          />
        </div>

        {agreed && signature && (
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-center space-x-3">
            <Check className="w-6 h-6 text-green-600" />
            <p className="text-green-900 text-sm">
              <strong>Pronto!</strong> Você pode finalizar o envio da ficha.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-4">
        <Button type="button" variant="outline" className="flex-1 py-4" onClick={onPrevious}>
          ← Voltar
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1 py-4"
          disabled={!agreed || !signature}
        >
          Finalizar e Enviar Ficha ✓
        </Button>
      </div>
    </form>
  )
}

