'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/Button'
import { SavedAccountButton } from '@/components/SavedAccountButton'
import {
  Sparkles,
  Calendar,
  Heart,
  Star,
  Phone,
  MapPin,
  Instagram,
  Clock,
  Award,
  Users,
  TrendingUp,
  Mail,
  Facebook,
  Linkedin,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const galleryImages = Array.from({ length: 9 }, (_, i) => `/gallery/${i + 1}.jpeg`)

  // Controle do modal e navegação
  const openModal = (index: number) => {
    setCurrentImageIndex(index)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }

  // Fechar modal com ESC e navegar com setas
  useEffect(() => {
    if (!isModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false)
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length)
      } else if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, galleryImages.length])

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navbar */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="/images/logo.png"
                alt="Charme & Bela Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="text-2xl font-bold text-gray-900">
                Charme & Bela
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="#servicos" className="text-gray-700 hover:text-pink-600 transition">
                Serviços
              </Link>
              <Link href="#planos" className="text-gray-700 hover:text-pink-600 transition font-semibold">
                Planos
              </Link>
              <Link href="#galeria" className="text-gray-700 hover:text-pink-600 transition">
                Galeria
              </Link>
              <Link href="#sobre" className="text-gray-700 hover:text-pink-600 transition">
                Sobre
              </Link>
              <Link href="#contato" className="text-gray-700 hover:text-pink-600 transition">
                Contato
              </Link>
              <SavedAccountButton />
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Área do Cliente
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Entrar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-pink-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Especialistas em Estética 
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Sua beleza,
                <span className="text-pink-600"> nosso cuidado</span>
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed">
                Mais que uma clínica, um universo de possibilidades para revelar a sua beleza única.
                Tratamentos personalizados com tecnologia de ponta e profissionais altamente capacitados.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="primary" size="lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  Agendar Consulta
                </Button>
                <a href="https://wa.me/5511913129669" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg">
                    <Phone className="w-5 h-5 mr-2" />
                    Fale Conosco
                  </Button>
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-pink-100">
                <div>
                  <div className="text-3xl font-bold text-pink-600">Centenas</div>
                  <div className="text-sm text-gray-600">Clientes Felizes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-pink-600">10+</div>
                  <div className="text-sm text-gray-600">Anos de Experiência</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-pink-600">98%</div>
                  <div className="text-sm text-gray-600">Satisfação</div>
                </div>
              </div>
            </div>

            {/* Image/Visual */}
            <div className="relative">
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
        <Image
                  src="/images/beautiful-face.png"
                  alt="Charme & Bela"
                  fill
                  className="object-cover"
          priority
        />
              </div>
              
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 border border-pink-100">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">4.9</div>
                    <div className="text-sm text-gray-600">Avaliação</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Treatment Categories Section */}
      <section id="servicos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Nossos Tratamentos
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Descubra nossas categorias de procedimentos estéticos personalizados para você
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                title: 'Tratamentos Faciais',
                description: 'Limpeza de pele, peelings, microagulhamento, máscaras e tratamentos para acne. Realce sua beleza natural com cuidados especializados.',
                icon: '💆‍♀️',
                gradient: 'from-pink-100 to-pink-200'
              },
              {
                title: 'Tratamentos Corporais',
                description: 'Drenagem linfática, massagem modeladora, radiofrequência e criolipólise. Conquiste o corpo dos seus sonhos.',
                icon: '👙',
                gradient: 'from-purple-100 to-purple-200'
              },
              {
                title: 'Procedimentos Injetáveis',
                description: 'Botox, preenchimentos, bioestimuladores e skinbooster. Rejuvenescimento e harmonização facial com resultados naturais.',
                icon: '💉',
                gradient: 'from-blue-100 to-blue-200'
              },
              {
                title: 'Pós-Operatório',
                description: 'Drenagem especializada, ultrassom e radiofrequência pós-cirúrgica. Acelere sua recuperação com cuidado profissional.',
                icon: '🩺',
                gradient: 'from-green-100 to-green-200'
              }
            ].map((category, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl border border-gray-200 hover:border-pink-300 hover:shadow-xl transition-all duration-300 overflow-hidden p-6"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${category.gradient} rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                  {category.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {category.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {category.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/servicos">
              <Button variant="primary" size="lg">
                Ver Todos os Serviços
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeria" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Nossa Galeria
            </h2>
            <p className="text-xl text-gray-600">
              Conheça nosso espaço e alguns dos nossos trabalhos
            </p>
          </div>

          {/* Gallery Grid 3x3 - Desktop / Carousel - Mobile */}
          <div className="max-w-6xl mx-auto">
            {/* Mobile Carousel */}
            <div className="md:hidden relative">
              <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg">
                <Image
                  src={galleryImages[currentImageIndex]}
                  alt={`Galeria ${currentImageIndex + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
                
                {/* Navigation Arrows */}
                <button
                  onClick={(e) => { e.stopPropagation(); previousImage() }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center transition-colors shadow-lg"
                  aria-label="Imagem anterior"
                >
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); nextImage() }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center transition-colors shadow-lg"
                  aria-label="Próxima imagem"
                >
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
                  {currentImageIndex + 1} / {galleryImages.length}
                </div>
              </div>

              {/* Dots Navigation */}
              <div className="flex justify-center space-x-2 mt-4">
                {galleryImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-pink-600 w-8'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Ir para imagem ${index + 1}`}
                  />
                ))}
              </div>

              {/* Expand Button */}
              <button
                onClick={() => openModal(currentImageIndex)}
                className="mt-4 w-full px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium transition-colors"
              >
                Ver em tela cheia
              </button>
            </div>

            {/* Desktop Grid 3x3 */}
            <div className="hidden md:grid grid-cols-3 gap-4">
              {galleryImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => openModal(index)}
                  className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow group cursor-pointer"
                >
                  <Image
                    src={img}
                    alt={`Galeria ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Fechar galeria"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white font-medium z-10">
            {currentImageIndex + 1} / {galleryImages.length}
          </div>

          {/* Previous button */}
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          {/* Next button */}
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Main image */}
          <div 
            className="relative w-full h-full max-w-7xl max-h-[90vh] mx-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <Image
              src={galleryImages[currentImageIndex]}
              alt={`Galeria ${currentImageIndex + 1}`}
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Thumbnail strip */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 bg-white/10 backdrop-blur-sm rounded-full p-2">
            {galleryImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentImageIndex
                    ? 'w-8 bg-white'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Ir para imagem ${index + 1}`}
              />
            ))}
          </div>

          {/* Instructions */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-sm text-center">
            <p className="hidden md:block">Use as setas do teclado para navegar • ESC para fechar</p>
          </div>
        </div>
      )}

      {/* Subscription CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-pink-600 via-pink-700 to-purple-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-white">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4 mr-2" />
                Novidade: Charme & Bela Club
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Assine e Economize até 60% nos Tratamentos
              </h2>
              <p className="text-xl text-pink-100 mb-6">
                Tenha acesso ilimitado aos melhores tratamentos estéticos por um valor fixo mensal. 
                Até <strong>4 procedimentos por mês</strong>, 1 por semana!
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Sem taxa de adesão',
                  'Cancele quando quiser após 3 meses',
                  'Agende online 24/7',
                  'Tratamentos exclusivos para assinantes'
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-pink-50">
                    <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-shrink-0">
              <Button variant="secondary" size="lg" className="text-lg px-8 py-6">
                <Calendar className="w-6 h-6 mr-2" />
                Quero Assinar Agora
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Plans Section */}
      <section id="planos" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Planos Charme & Bela Club
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Escolha o plano perfeito para você e transforme sua rotina de cuidados com economia e praticidade
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plano Essencial */}
            <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden border-2 border-gray-200">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-6 text-white">
                <div className="text-3xl mb-2">🥉</div>
                <h3 className="text-2xl font-bold mb-1">Essencial Beauty</h3>
                <p className="text-amber-100 text-sm">Perfeito para começar</p>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">R$ 149</span>
                    <span className="text-gray-600 ml-2">/mês</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Até 4 procedimentos/mês</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {[
                    'Limpeza de pele completa',
                    'Máscara de LED',
                    'Drenagem linfática',
                    'Pump e carboxiterapia',
                    'Massagem nos pés',
                    'Vacuoterapia e vibrocel'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <span className="text-amber-600 text-xs">✓</span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Button variant="outline" className="w-full">
                  Escolher Plano
                </Button>
              </div>
            </div>

            {/* Plano Plus - Destaque */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-pink-500 transform md:scale-105 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="bg-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  MAIS POPULAR
                </span>
              </div>
              
              <div className="bg-gradient-to-br from-pink-500 to-pink-700 p-6 text-white mt-4">
                <div className="text-3xl mb-2">🥈</div>
                <h3 className="text-2xl font-bold mb-1">Plus Care</h3>
                <p className="text-pink-100 text-sm">Tecnologia avançada</p>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">R$ 249</span>
                    <span className="text-gray-600 ml-2">/mês</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Até 4 procedimentos/mês</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {[
                    'TUDO do plano Essencial',
                    'Radiofrequência facial',
                    'Jato de plasma',
                    'Radiofrequência corporal',
                    'Massagem modeladora',
                    'Tratamento para celulite',
                    'Depilação a cera',
                    'Massagem com pedras quentes'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <span className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <span className="text-pink-600 text-xs">✓</span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Button variant="primary" className="w-full">
                  Escolher Plano
                </Button>
              </div>
            </div>

            {/* Plano Premium */}
            <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden border-2 border-gray-200">
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-6 text-white">
                <div className="text-3xl mb-2">🥇</div>
                <h3 className="text-2xl font-bold mb-1">Premium Experience</h3>
                <p className="text-purple-100 text-sm">Acesso total VIP</p>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">R$ 399</span>
                    <span className="text-gray-600 ml-2">/mês</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Até 4 procedimentos/mês</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {[
                    'TUDO dos planos anteriores',
                    'Microagulhamento',
                    'Peeling químico',
                    'Skinbooster',
                    'Hidrolipoclasia',
                    'Tratamento para melasma',
                    'Massagem pós-operatório',
                    'Lipo sem corte'
                  ].map((item, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <span className="text-purple-600 text-xs">✓</span>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Button variant="outline" className="w-full">
                  Escolher Plano
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-sm text-gray-600">
              🎁 <strong>Sem taxas ocultas.</strong> Contrato mínimo de 3 meses • Cancele online quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              O Que Nossas Clientes Dizem
            </h2>
            <p className="text-xl text-gray-600">
              Transformações reais de quem confia no Charme & Bela
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Maria Silva',
                role: 'Assinante Plus Care',
                avatar: 'M',
                text: 'Há 6 meses faço parte do Charme & Bela Club e minha pele nunca esteve tão bonita! A economia é real e os tratamentos são impecáveis. Super recomendo!',
                rating: 5
              },
              {
                name: 'Ana Oliveira',
                role: 'Assinante Premium',
                avatar: 'A',
                text: 'O melhor investimento que fiz em mim mesma! Faço microagulhamento e skinbooster todo mês. O plano premium vale cada centavo, economizo muito.',
                rating: 5
              },
              {
                name: 'Julia Santos',
                role: 'Assinante Essencial',
                avatar: 'J',
                text: 'Comecei com o plano Essencial e já vi resultados incríveis. A drenagem e limpeza de pele são maravilhosas. Equipe super atenciosa e profissional!',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>
                
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-lg mr-3">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="sobre" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Por que escolher o Charme & Bela?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Award,
                title: 'Profissionais Qualificados',
                description: 'Equipe experiente e certificada desde 2015'
              },
              {
                icon: TrendingUp,
                title: 'Tecnologia Avançada',
                description: 'Equipamentos de última geração'
              },
              {
                icon: Users,
                title: 'Atendimento Personalizado',
                description: 'Cada cliente é único para nós'
              },
              {
                icon: Heart,
                title: 'Resultados Comprovados',
                description: 'Centenas de clientes satisfeitos'
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
                  <item.icon className="w-8 h-8 text-pink-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Subscription */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-medium mb-4">
              <Heart className="w-4 h-4 mr-2" />
              Charme & Bela Club
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Como Funciona a Assinatura?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              É simples, econômico e sem complicações. Você paga um valor fixo e tem acesso aos tratamentos quando quiser!
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {[
              {
                step: '1',
                title: 'Escolha Seu Plano',
                description: 'Selecione o plano ideal para suas necessidades e objetivos de beleza',
                icon: '📋'
              },
              {
                step: '2',
                title: 'Assine Online',
                description: 'Cadastro rápido e pagamento seguro via cartão de crédito com Stripe',
                icon: '💳'
              },
              {
                step: '3',
                title: 'Agende Quando Quiser',
                description: 'Até 4 procedimentos por mês, 1 por semana, direto pelo aplicativo',
                icon: '📅'
              },
              {
                step: '4',
                title: 'Aproveite e Economize',
                description: 'Realize seus tratamentos e economize até 60% comparado ao valor avulso',
                icon: '✨'
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Benefits highlight */}
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Por que assinar é mais vantajoso?
                </h3>
                <p className="text-gray-600 mb-6">
                  Compare: uma única sessão de Limpeza de Pele (R$ 120) + Drenagem Linfática (R$ 100) 
                  já custaria R$ 220 avulso. Com o plano Essencial por R$ 149,90, você tem direito a 
                  <strong> 4 procedimentos no mês</strong>!
                </p>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Economia mensal média',
                      value: 'R$ 300 - R$ 800',
                      color: 'text-green-600'
                    },
                    {
                      label: 'Flexibilidade total',
                      value: 'Escolha o que fazer a cada semana',
                      color: 'text-pink-600'
                    },
                    {
                      label: 'Sem surpresas',
                      value: 'Valor fixo e previsível',
                      color: 'text-blue-600'
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-lg p-4">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-pink-200">
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  💡 Exemplo Real:
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Semana 1:</span>
                    <span className="font-medium text-pink-700">Limpeza de Pele</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Semana 2:</span>
                    <span className="font-medium text-pink-700">Drenagem Linfática</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Semana 3:</span>
                    <span className="font-medium text-pink-700">Massagem Modeladora</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Semana 4:</span>
                    <span className="font-medium text-pink-700">Radiofrequência</span>
                  </div>
                  <div className="pt-3 border-t-2 border-pink-200">
                    <div className="flex justify-between text-gray-500 mb-2">
                      <span>Valor avulso:</span>
                      <span className="line-through">R$ 480,00</span>
                    </div>
                    <div className="flex justify-between font-bold text-pink-600 text-lg">
                      <span>Você paga:</span>
                      <span>R$ 249,90</span>
                    </div>
                    <div className="text-center mt-2">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        Economize R$ 230,10! 🎉
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button variant="primary" size="lg" className="text-lg px-10">
              <Heart className="w-6 h-6 mr-2" />
              Ver Planos e Assinar
            </Button>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Nossa Localização
            </h2>
            <p className="text-xl text-gray-600">
              Visite-nos e conheça nosso espaço
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-2xl h-[400px] md:h-[500px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.9177647892334!2d-46.47708492408!3d-23.543891560976!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce66e0c6f0c1af%3A0x7e0b6c6f1c8d0f1e!2sAv.%20Paranagu%C3%A1%2C%201672%20-%20Ermelino%20Matarazzo%2C%20S%C3%A3o%20Paulo%20-%20SP!5e0!3m2!1spt-BR!2sbr!4v1697234567890!5m2!1spt-BR!2sbr"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* CTA Section - Subscription Focus */}
      <section className="py-24 bg-gradient-to-r from-pink-600 to-pink-700 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-white text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Oferta Especial - Primeiros 50 Assinantes
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Comece Sua Transformação Hoje
          </h2>
          <p className="text-xl text-pink-100 mb-4">
            Assine o Charme & Bela Club e ganhe <strong>1 tratamento extra</strong> no primeiro mês!
          </p>
          <p className="text-lg text-pink-200 mb-8">
            🎁 Sem taxa de adesão • 💳 Primeira mensalidade com desconto • 📅 Agende quando quiser
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button variant="secondary" size="lg" className="text-lg px-8">
              <Heart className="w-5 h-5 mr-2" />
              Quero Assinar Agora
            </Button>
            <a href="https://wa.me/5511913129669" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent border-white text-white hover:bg-white hover:text-pink-600 text-lg px-8"
              >
                <Phone className="w-5 h-5 mr-2" />
                Tire Suas Dúvidas
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto pt-8 border-t border-white/20">
            <div className="text-white">
              <div className="text-3xl font-bold mb-1">60%</div>
              <div className="text-sm text-pink-100">De economia</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold mb-1">4x</div>
              <div className="text-sm text-pink-100">Por mês</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold mb-1">0</div>
              <div className="text-sm text-pink-100">Taxa de adesão</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <Image
                  src="/images/logo.png"
                  alt="Charme & Bela Logo"
                  width={40}
                  height={40}
                  className="object-contain brightness-0 invert"
                />
                <span className="text-2xl font-bold">Charme & Bela</span>
              </div>
              <p className="text-gray-400 mb-4">
                Mais que uma clínica, um universo de possibilidades para revelar a sua beleza única.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://www.facebook.com/espaco.charmebela"
          target="_blank"
          rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition"
                >
                  <Facebook className="w-5 h-5" />
        </a>
        <a
                  href="https://www.instagram.com/charme.bela"
          target="_blank"
          rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition"
                >
                  <Instagram className="w-5 h-5" />
        </a>
        <a
                  href="https://www.linkedin.com/company/charme-bela"
          target="_blank"
          rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-bold mb-4">Links Rápidos</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#servicos" className="hover:text-pink-500">Serviços</Link></li>
                <li><Link href="#planos" className="hover:text-pink-500">Planos</Link></li>
                <li><Link href="#galeria" className="hover:text-pink-500">Galeria</Link></li>
                <li><Link href="#sobre" className="hover:text-pink-500">Sobre Nós</Link></li>
                <li><Link href="/login" className="hover:text-pink-500">Área do Cliente</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-bold mb-4">Contato</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    Av. Paranaguá, 1672 - Sala 02<br />
                    Ermelino Matarazzo<br />
                    São Paulo - SP
                  </span>
                </li>
                <li className="flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  <span>(11) 91312-9669</span>
                </li>
                <li className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  <span>contato@charmeebela.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>© 2025 Espaço Estético Charme & Bela. Todos os direitos reservados.</p>
            <p className="text-sm mt-2">Fundado em 2015</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
