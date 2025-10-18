'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Target, Sparkles } from 'lucide-react'

interface Props {
  data: any
  onNext: (data: any) => void
  onPrevious: () => void
}

export default function Step4Objetivos({ data, onNext, onPrevious }: Props) {
  const [formData, setFormData] = useState({
    mainGoal: data.mainGoal || '',
    faceIssues: data.faceIssues || [],
    bodyIssues: data.bodyIssues || [],
    bodyIssuesArea: data.bodyIssuesArea || '',
    previousTreatments: data.previousTreatments || 'no',
    previousTreatmentsDetails: data.previousTreatmentsDetails || ''
  })

  // Atualizar quando data mudar
  useEffect(() => {
    console.log('📝 Step4: Atualizando com dados carregados:', data)
    setFormData({
      mainGoal: data.mainGoal || '',
      faceIssues: data.faceIssues || [],
      bodyIssues: data.bodyIssues || [],
      bodyIssuesArea: data.bodyIssuesArea || '',
      previousTreatments: data.previousTreatments || 'no',
      previousTreatmentsDetails: data.previousTreatmentsDetails || ''
    })
  }, [data])

  const faceIssuesList = [
    { id: 'acne', label: 'Acne/Cravos' },
    { id: 'spots', label: 'Manchas/Melasma' },
    { id: 'wrinkles', label: 'Rugas/Linhas de Expressão' },
    { id: 'sagging', label: 'Flacidez' },
    { id: 'darkCircles', label: 'Olheiras' }
  ]

  const bodyIssuesList = [
    { id: 'localizedFat', label: 'Gordura Localizada' },
    { id: 'cellulite', label: 'Celulite' },
    { id: 'stretchMarks', label: 'Estrias' },
    { id: 'bodySagging', label: 'Flacidez' },
    { id: 'hair', label: 'Pelos' }
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleFaceCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setFormData({
        ...formData,
        faceIssues: [...formData.faceIssues, e.target.value]
      })
    } else {
      setFormData({
        ...formData,
        faceIssues: formData.faceIssues.filter((item: string) => item !== e.target.value)
      })
    }
  }

  const handleBodyCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setFormData({
        ...formData,
        bodyIssues: [...formData.bodyIssues, e.target.value]
      })
    } else {
      setFormData({
        ...formData,
        bodyIssues: formData.bodyIssues.filter((item: string) => item !== e.target.value)
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-white rounded-2xl p-6 text-center border-2 border-blue-200">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Seus Objetivos 🎯</h2>
        <p className="text-gray-600">
          Queremos entender suas expectativas para oferecer o melhor resultado!
        </p>
      </div>

      {/* Goals Questions */}
      <div className="bg-white rounded-2xl p-6 space-y-6">
        <h3 className="font-semibold text-gray-900 mb-4">O que te traz aqui?</h3>

        {/* Main Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Qual o seu principal objetivo ao nos procurar?
          </label>
          <textarea
            name="mainGoal"
            value={formData.mainGoal}
            onChange={handleChange}
            placeholder="Ex: Quero tratar manchas no rosto, reduzir medidas na barriga, relaxar..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        {/* Face Issues */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Sparkles className="w-4 h-4 inline mr-1" />
            Quais áreas do rosto mais te incomodam? (pode marcar várias)
          </label>
          <div className="space-y-2">
            {faceIssuesList.map((issue) => (
              <label
                key={issue.id}
                className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all"
              >
                <input
                  type="checkbox"
                  value={issue.id}
                  checked={formData.faceIssues.includes(issue.id)}
                  onChange={handleFaceCheckbox}
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <span className="ml-3 text-gray-900">{issue.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Body Issues */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Sparkles className="w-4 h-4 inline mr-1" />
            Quais áreas do corpo mais te incomodam? (pode marcar várias)
          </label>
          <div className="space-y-2">
            {bodyIssuesList.map((issue) => (
              <label
                key={issue.id}
                className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-pink-300 transition-all"
              >
                <input
                  type="checkbox"
                  value={issue.id}
                  checked={formData.bodyIssues.includes(issue.id)}
                  onChange={handleBodyCheckbox}
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <span className="ml-3 text-gray-900">{issue.label}</span>
              </label>
            ))}
          </div>

          {(formData.bodyIssues.includes('localizedFat') || formData.bodyIssues.includes('cellulite')) && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Indique a(s) área(s):
              </label>
              <input
                type="text"
                name="bodyIssuesArea"
                value={formData.bodyIssuesArea}
                onChange={handleChange}
                placeholder="Ex: Barriga, culote, coxas..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          )}
        </div>

        {/* Previous Treatments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Já realizou algum tratamento estético antes?
          </label>
          <div className="flex space-x-4 mb-3">
            <label className="flex-1">
              <input
                type="radio"
                name="previousTreatments"
                value="yes"
                checked={formData.previousTreatments === 'yes'}
                onChange={(e) => setFormData({ ...formData, previousTreatments: e.target.value })}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Sim</span>
              </div>
            </label>
            <label className="flex-1">
              <input
                type="radio"
                name="previousTreatments"
                value="no"
                checked={formData.previousTreatments === 'no'}
                onChange={(e) => setFormData({ ...formData, previousTreatments: e.target.value })}
                className="sr-only peer"
              />
              <div className="p-4 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all">
                <span className="text-gray-900 font-medium">Não</span>
              </div>
            </label>
          </div>

          {formData.previousTreatments === 'yes' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qual(is) e qual foi sua experiência?
              </label>
              <textarea
                name="previousTreatmentsDetails"
                value={formData.previousTreatmentsDetails}
                onChange={handleChange}
                placeholder="Descreva os tratamentos anteriores e como foi..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-4">
        <Button type="button" variant="outline" className="flex-1 py-4" onClick={onPrevious}>
          ← Voltar
        </Button>
        <Button type="submit" variant="primary" className="flex-1 py-4">
          Finalizar →
        </Button>
      </div>
    </form>
  )
}

