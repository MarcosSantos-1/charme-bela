'use client'

import { useEffect, useState } from 'react'
import { getServices, Service } from '@/lib/api'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { Sparkles, Clock, DollarSign, ArrowLeft, Calendar, Check } from 'lucide-react'

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await getServices()
        setServices(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [])

  const categories = ['all', 'facial', 'corporal', 'depilacao', 'pos-operatorio', 'injetaveis']
  const categoryNames: Record<string, string> = {
    all: 'Todos',
    facial: 'Faciais',
    corporal: 'Corporais',
    depilacao: 'Depilação',
    'pos-operatorio': 'Pós-Operatório',
    injetaveis: 'Injetáveis'
  }

  // Função para categorizar serviços baseado no nome
  const categorizeService = (serviceName: string): string => {
    const nameLower = serviceName.toLowerCase()
    
    if (nameLower.includes('depilação') || nameLower.includes('laser')) {
      return 'depilacao'
    }
    if (nameLower.includes('pós-operatór') || nameLower.includes('pos-operator')) {
      return 'pos-operatorio'
    }
    if (nameLower.includes('botox') || nameLower.includes('preenchimento') || 
        nameLower.includes('injetá') || nameLower.includes('enzima') || 
        nameLower.includes('bioestimulador') || nameLower.includes('skinbooster')) {
      return 'injetaveis'
    }
    if (nameLower.includes('limpeza') || nameLower.includes('peeling') || 
        nameLower.includes('facial') || nameLower.includes('microagulhamento') || 
        nameLower.includes('máscara') || nameLower.includes('hidratação facial') || 
        nameLower.includes('acne') || nameLower.includes('led')) {
      return 'facial'
    }
    // Default para corporal
    return 'corporal'
  }

  // Filtrar serviços baseado na categoria selecionada
  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(service => categorizeService(service.name) === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-pink-600">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>

            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-pink-600" />
              <span className="text-2xl font-bold text-gray-900">
                Charme & Bela
              </span>
            </div>

            <Link href="/login">
              <Button variant="outline" size="sm">
                Área do Cliente
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-pink-600 to-pink-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nossos Tratamentos
          </h1>
          <p className="text-xl text-pink-100 max-w-2xl mx-auto">
            Descubra o tratamento perfeito para realçar sua beleza e cuidar da sua saúde
          </p>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {categoryNames[category]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 group"
                >
                  {/* Service Image/Icon */}
                  <div className="h-56 bg-gradient-to-br from-pink-100 via-pink-50 to-white flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 to-transparent group-hover:scale-110 transition-transform duration-500"></div>
                    <Sparkles className="w-24 h-24 text-pink-600 relative z-10 group-hover:scale-110 transition-transform" />
                  </div>

                  {/* Service Content */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {service.name}
                    </h3>

                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {service.description}
                    </p>

                    {/* Service Details */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-700">
                        <Clock className="w-5 h-5 mr-3 text-pink-600" />
                        <span className="text-sm">Duração: {service.duration} minutos</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <DollarSign className="w-5 h-5 mr-3 text-pink-600" />
                        <span className="text-sm font-semibold">
                          A partir de R$ {service.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Benefits (mock data) */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">Benefícios:</h4>
                      <ul className="space-y-1">
                        {[
                          'Resultados visíveis',
                          'Procedimento seguro',
                          'Profissionais qualificados'
                        ].map((benefit, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-600">
                            <Check className="w-4 h-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <Button variant="primary" className="w-full group-hover:bg-pink-700">
                      <Calendar className="w-5 h-5 mr-2" />
                      Agendar Consulta
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredServices.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600">
                {selectedCategory === 'all' 
                  ? 'Nenhum serviço disponível no momento' 
                  : `Nenhum serviço encontrado na categoria "${categoryNames[selectedCategory]}"`
                }
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-pink-600 to-pink-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronta para começar?
          </h2>
          <p className="text-xl text-pink-100 mb-8">
            Agende uma consulta e descubra qual tratamento é ideal para você
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg">
              <Calendar className="w-5 h-5 mr-2" />
              Agendar Agora
            </Button>
            <a href="https://wa.me/5511913129669" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent border-white text-white hover:bg-white hover:text-pink-600"
              >
                Falar no WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2025 Charme & Bela. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

