'use client'

import { useState, useEffect } from 'react'
import { Search, FileText, Eye, Download, Plus, Calendar, AlertCircle, User } from 'lucide-react'
import { Button } from '@/components/Button'
import { CriarAnamneseModal } from '@/components/admin/CriarAnamneseModal'
import * as api from '@/lib/api'
import toast from 'react-hot-toast'

export default function AnamnesesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCriarAnamneseOpen, setIsCriarAnamneseOpen] = useState(false)
  const [anamneses, setAnamneses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingAnamnese, setViewingAnamnese] = useState<any>(null)

  useEffect(() => {
    loadAnamneses()
  }, [])

  const loadAnamneses = async () => {
    setLoading(true)
    try {
      const data = await api.getAnamnesisList()
      console.log('📋 Anamneses carregadas:', data.length)
      
      // Debug: mostrar cada anamnese
      console.log('📄 Anamneses:', data.map((a: any) => ({
        cliente: a.user?.name,
        termsAccepted: a.termsAccepted
      })))
      
      setAnamneses(data)
    } catch (error) {
      console.error('Erro ao carregar anamneses:', error)
      toast.error('Erro ao carregar anamneses')
    } finally {
      setLoading(false)
    }
  }

  const filteredAnamneses = anamneses.filter(anamnese =>
    anamnese.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    anamnese.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Helper para renderizar campos
  const renderField = (label: string, value: any, fullWidth = false) => {
    if (!value) return null
    
    return (
      <div className={fullWidth ? 'col-span-2' : ''}>
        <span className="text-gray-600 text-xs block mb-1">{label}:</span>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Anamneses</h2>
          <p className="text-gray-600 mt-1">Visualize e gerencie as fichas de anamnese dos clientes</p>
        </div>
        <Button 
          variant="primary"
          onClick={() => setIsCriarAnamneseOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Anamnese
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 font-medium"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando anamneses...</p>
        </div>
      ) : filteredAnamneses.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Data de Criação
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAnamneses.map((anamnese) => {
                const createdDate = new Date(anamnese.createdAt)
                // Simples: Completa = termos aceitos
                const isComplete = anamnese.termsAccepted === true
                
                return (
                  <tr key={anamnese.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-pink-600 mr-3" />
                        <span className="font-medium text-gray-900">
                          {anamnese.user?.name || 'Cliente'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {anamnese.user?.email || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {createdDate.toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          isComplete
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {isComplete ? '✓ Completa' : '⏳ Pendente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setViewingAnamnese(anamnese)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toast('Download em desenvolvimento', { icon: 'ℹ️' })}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">
            {searchTerm ? 'Nenhuma anamnese encontrada' : 'Nenhuma anamnese cadastrada'}
          </p>
          <p className="text-sm text-gray-500">
            {searchTerm 
              ? 'Tente buscar por outro termo'
              : 'Clique em "Nova Anamnese" para criar a primeira'}
          </p>
        </div>
      )}

      {/* Modal de Visualização */}
      {viewingAnamnese && (() => {
        const createdDate = new Date(viewingAnamnese.createdAt)
        const isComplete = viewingAnamnese.termsAccepted === true
        
        return (
        <Modal 
          isOpen={!!viewingAnamnese} 
          onClose={() => setViewingAnamnese(null)}
          title={`Anamnese - ${viewingAnamnese.user?.name}`}
          size="xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Status Geral */}
            <div className={`border-2 rounded-xl p-4 ${
              isComplete 
                ? 'bg-green-50 border-green-300' 
                : 'bg-orange-50 border-orange-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <>
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">✓</span>
                      </div>
                      <div>
                        <p className="font-bold text-green-900">Anamnese Completa</p>
                        <p className="text-xs text-green-700">Termos aceitos e dados preenchidos</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="font-bold text-orange-900">Anamnese Pendente</p>
                        <p className="text-xs text-orange-700">Cliente ainda não aceitou os termos</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>Criada em:</p>
                  <p className="font-medium">{createdDate.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* Dados Pessoais */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b border-gray-200">
                <User className="w-5 h-5 text-pink-600" />
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {renderField('Nome Completo', viewingAnamnese.personalData?.fullName)}
                {renderField('Data de Nascimento', viewingAnamnese.personalData?.birthDate 
                  ? new Date(viewingAnamnese.personalData.birthDate).toLocaleDateString('pt-BR')
                  : null)}
                {renderField('Email', viewingAnamnese.personalData?.email)}
                {renderField('Telefone', viewingAnamnese.personalData?.phone)}
                {viewingAnamnese.personalData?.address?.street && (
                  <div className="col-span-2">
                    <span className="text-gray-600 text-xs block mb-1">Endereço:</span>
                    <p className="font-medium text-gray-900">
                      {viewingAnamnese.personalData.address.street}, {viewingAnamnese.personalData.address.number || 's/n'}
                      {viewingAnamnese.personalData.address.complement && ` - ${viewingAnamnese.personalData.address.complement}`}
                      <br/>
                      {viewingAnamnese.personalData.address.neighborhood} - {viewingAnamnese.personalData.address.city}/{viewingAnamnese.personalData.address.state}
                      {viewingAnamnese.personalData.address.cep && ` - CEP: ${viewingAnamnese.personalData.address.cep}`}
                    </p>
                  </div>
                )}
                {renderField('Como nos conheceu', 
                  viewingAnamnese.personalData?.howKnew === 'indicacao' ? 'Indicação' :
                  viewingAnamnese.personalData?.howKnew === 'instagram' ? 'Instagram' :
                  viewingAnamnese.personalData?.howKnew === 'google' ? 'Google' :
                  viewingAnamnese.personalData?.howKnew === 'outro' ? 'Outro' : null, true)}
              </div>
            </div>

            {/* Estilo de Vida */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b border-gray-200">
                💪 Estilo de Vida
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {renderField('Pratica Exercícios', 
                  viewingAnamnese.lifestyleData?.exerciseActivity === 'yes' ? 'Sim' :
                  viewingAnamnese.lifestyleData?.exerciseActivity === 'no' ? 'Não' : null, true)}
                {viewingAnamnese.lifestyleData?.exerciseType && 
                  renderField('Tipo de Exercício', viewingAnamnese.lifestyleData.exerciseType, true)}
                {renderField('Nível de Stress', viewingAnamnese.lifestyleData?.stressLevel ? `${viewingAnamnese.lifestyleData.stressLevel}/10` : null)}
                {renderField('Fumante', 
                  viewingAnamnese.lifestyleData?.smoking === 'yes' 
                    ? `Sim${viewingAnamnese.lifestyleData.smokingAmount ? ` (${viewingAnamnese.lifestyleData.smokingAmount})` : ''}`
                    : viewingAnamnese.lifestyleData?.smoking === 'no' ? 'Não' : null, true)}
                {renderField('Consumo de Álcool', 
                  viewingAnamnese.lifestyleData?.alcohol === 'yes' ? 'Sim' :
                  viewingAnamnese.lifestyleData?.alcohol === 'no' ? 'Não' : null, true)}
                {renderField('Ingestão de Água', 
                  viewingAnamnese.lifestyleData?.waterIntake === 'lessThan1' ? 'Menos de 1L' :
                  viewingAnamnese.lifestyleData?.waterIntake === 'between1and2' ? '1-2L' :
                  viewingAnamnese.lifestyleData?.waterIntake === 'moreThan2' ? 'Mais de 2L' : null, true)}
                {renderField('Função Intestinal', 
                  viewingAnamnese.lifestyleData?.intestine === 'regular' ? 'Regular' :
                  viewingAnamnese.lifestyleData?.intestine === 'constipated' ? 'Preso' :
                  viewingAnamnese.lifestyleData?.intestine === 'loose' ? 'Solto' : null, true)}
                {renderField('Usa Protetor Solar', 
                  viewingAnamnese.lifestyleData?.sunscreen === 'yes' ? 'Sim' :
                  viewingAnamnese.lifestyleData?.sunscreen === 'no' ? 'Não' : null, true)}
                {renderField('Usa Cosméticos', 
                  viewingAnamnese.lifestyleData?.cosmetics === 'yes'
                    ? `Sim${viewingAnamnese.lifestyleData.cosmeticsType ? ` - ${viewingAnamnese.lifestyleData.cosmeticsType}` : ''}`
                    : viewingAnamnese.lifestyleData?.cosmetics === 'no' ? 'Não' : null, true)}
              </div>
              {(!viewingAnamnese.lifestyleData || Object.keys(viewingAnamnese.lifestyleData).length === 0) && (
                <p className="text-sm text-gray-500 italic">Nenhuma informação preenchida</p>
              )}
            </div>

            {/* Informações de Saúde */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b border-gray-200">
                🏥 Informações de Saúde
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {renderField('Alergias', 
                  viewingAnamnese.healthData?.allergies === 'yes' ? 'Sim' : 
                  viewingAnamnese.healthData?.allergies === 'no' ? 'Não' : null, true)}
                {viewingAnamnese.healthData?.allergiesDetails && 
                  renderField('Detalhes Alergias', viewingAnamnese.healthData.allergiesDetails, true)}
                {renderField('Condições de Saúde', viewingAnamnese.healthData?.healthConditions?.length > 0 
                  ? viewingAnamnese.healthData.healthConditions.map((c: string) => {
                      const labels: any = {
                        hypertension: 'Hipertensão',
                        hypotension: 'Hipotensão',
                        diabetes: 'Diabetes',
                        circulatory: 'Distúrbios circulatórios',
                        skinDisease: 'Doença de pele',
                        hormonal: 'Alterações hormonais',
                        epilepsy: 'Epilepsia',
                        cancer: 'Câncer'
                      }
                      return labels[c] || c
                    }).join(', ') : null, true)}
                {renderField('Medicações em Uso', 
                  viewingAnamnese.healthData?.medications === 'yes' ? 'Sim' :
                  viewingAnamnese.healthData?.medications === 'no' ? 'Não' : null, true)}
                {viewingAnamnese.healthData?.medicationsDetails && 
                  renderField('Detalhes Medicamentos', viewingAnamnese.healthData.medicationsDetails, true)}
                {renderField('Possui Marcapasso', viewingAnamnese.healthData?.pacemaker ? 'Sim' : null)}
                {renderField('Possui Implante Metálico', viewingAnamnese.healthData?.metalImplant ? 'Sim' : null)}
                {renderField('Gestante', 
                  viewingAnamnese.healthData?.pregnant === 'yes' ? 'Sim' :
                  viewingAnamnese.healthData?.pregnant === 'no' ? 'Não' : null, true)}
                {renderField('Amamentando', 
                  viewingAnamnese.healthData?.breastfeeding === 'yes' ? 'Sim' :
                  viewingAnamnese.healthData?.breastfeeding === 'no' ? 'Não' : null, true)}
                {renderField('Usa Anticoncepcional', 
                  viewingAnamnese.healthData?.birthControl === 'yes'
                    ? `Sim${viewingAnamnese.healthData.birthControlType ? ` (${viewingAnamnese.healthData.birthControlType})` : ''}`
                    : viewingAnamnese.healthData?.birthControl === 'no' ? 'Não' : null, true)}
              </div>
              {(!viewingAnamnese.healthData || Object.keys(viewingAnamnese.healthData).length === 0) && (
                <p className="text-sm text-gray-500 italic">Nenhuma informação preenchida</p>
              )}
            </div>

            {/* Objetivos */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 pb-2 border-b border-gray-200">
                🎯 Objetivos e Expectativas
              </h3>
              <div className="space-y-3 text-sm">
                {renderField('Objetivo Principal', viewingAnamnese.objectivesData?.mainGoal, true)}
                {viewingAnamnese.objectivesData?.faceIssues?.length > 0 && (
                  <div>
                    <span className="text-gray-600 text-xs block mb-2">Preocupações Faciais:</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingAnamnese.objectivesData.faceIssues.map((issue: string, i: number) => {
                        const labels: any = {
                          acne: 'Acne/Cravos',
                          spots: 'Manchas/Melasma',
                          wrinkles: 'Rugas',
                          sagging: 'Flacidez',
                          darkCircles: 'Olheiras'
                        }
                        return (
                          <span key={i} className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full font-medium">
                            {labels[issue] || issue}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
                {viewingAnamnese.objectivesData?.bodyIssues?.length > 0 && (
                  <div>
                    <span className="text-gray-600 text-xs block mb-2">Preocupações Corporais:</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingAnamnese.objectivesData.bodyIssues.map((issue: string, i: number) => {
                        const labels: any = {
                          localizedFat: 'Gordura Localizada',
                          cellulite: 'Celulite',
                          stretchMarks: 'Estrias',
                          bodySagging: 'Flacidez',
                          hair: 'Pelos'
                        }
                        return (
                          <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                            {labels[issue] || issue}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
                {viewingAnamnese.objectivesData?.bodyIssuesArea && 
                  renderField('Área Específica', viewingAnamnese.objectivesData.bodyIssuesArea, true)}
                {renderField('Tratamentos Anteriores', 
                  viewingAnamnese.objectivesData?.previousTreatments === 'yes' ? 'Sim' :
                  viewingAnamnese.objectivesData?.previousTreatments === 'no' ? 'Não' : null, true)}
                {viewingAnamnese.objectivesData?.previousTreatmentsDetails && 
                  renderField('Detalhes Tratamentos', viewingAnamnese.objectivesData.previousTreatmentsDetails, true)}
              </div>
              {(!viewingAnamnese.objectivesData || Object.keys(viewingAnamnese.objectivesData).length === 0) && (
                <p className="text-sm text-gray-500 italic">Nenhuma informação preenchida</p>
              )}
            </div>

            {/* Termos */}
            <div className={`border-2 rounded-xl p-4 ${
              viewingAnamnese.termsAccepted 
                ? 'bg-green-50 border-green-300' 
                : 'bg-orange-50 border-orange-300'
            }`}>
              <div className="flex items-center gap-3">
                {viewingAnamnese.termsAccepted ? (
                  <>
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">✓</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-green-900">Termos Aceitos e Assinados</p>
                      {viewingAnamnese.termsAcceptedAt && (
                        <p className="text-xs text-green-700 mt-1">
                          Aceito em: {new Date(viewingAnamnese.termsAcceptedAt).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-10 h-10 text-orange-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-orange-900">Termos NÃO Aceitos</p>
                      <p className="text-xs text-orange-700 mt-1">
                        Cliente precisa aceitar os termos para completar a anamnese
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* JSON Raw (para debug - pode remover depois) */}
            <details className="bg-gray-100 rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                🔍 Ver dados completos (debug)
              </summary>
              <pre className="mt-3 text-xs overflow-x-auto bg-white p-3 rounded border border-gray-300">
                {JSON.stringify({
                  personalData: viewingAnamnese.personalData,
                  lifestyleData: viewingAnamnese.lifestyleData,
                  healthData: viewingAnamnese.healthData,
                  objectivesData: viewingAnamnese.objectivesData
                }, null, 2)}
              </pre>
            </details>

            <Button variant="outline" className="w-full" onClick={() => setViewingAnamnese(null)}>
              Fechar
            </Button>
          </div>
        </Modal>
        )
      })()}

      {/* Modais */}
      <CriarAnamneseModal 
        isOpen={isCriarAnamneseOpen}
        onClose={() => setIsCriarAnamneseOpen(false)}
        onSuccess={loadAnamneses}
      />
    </div>
  )
}

// Modal Component (inline para não criar arquivo separado)
function Modal({ isOpen, onClose, title, size = 'md', children }: any) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full ${
        size === 'sm' ? 'max-w-md' :
        size === 'md' ? 'max-w-2xl' :
        size === 'lg' ? 'max-w-4xl' :
        'max-w-6xl'
      } max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <span className="text-gray-900 text-xl">×</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

