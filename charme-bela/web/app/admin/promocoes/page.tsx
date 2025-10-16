'use client'

import { useState } from 'react'
import { Upload, X, Eye, Save } from 'lucide-react'
import { Button } from '@/components/Button'
import Image from 'next/image'

interface Banner {
  id: string
  title: string
  imageUrl: string
  location: 'landing' | 'cliente'
  isActive: boolean
}

export default function PromocoesPage() {
  const [banners, setBanners] = useState<Banner[]>([
    {
      id: '1',
      title: 'Promoção de Outubro',
      imageUrl: '/images/promo-placeholder.jpg',
      location: 'landing',
      isActive: true
    }
  ])

  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, location: 'landing' | 'cliente') => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Promoções e Banners</h2>
        <p className="text-gray-600 mt-1">Gerencie os banners promocionais do site e área do cliente</p>
      </div>

      {/* Banner Dimensions Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-2">
          📐 Dimensões recomendadas:
        </p>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Desktop:</strong> 1400px × 400px (proporção 7:2)</p>
          <p>• <strong>Mobile:</strong> A imagem será redimensionada automaticamente</p>
          <p>• <strong>Formato:</strong> JPG, PNG ou WebP</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Banner Landing Page */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Banner - Landing Page
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Será exibido acima da seção "Nossos Tratamentos"
          </p>

          {/* Upload Area */}
          <div className="mb-4">
            <label className="block">
              <div className="relative aspect-[7/2] border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-400 transition-colors cursor-pointer overflow-hidden bg-gray-50">
                {previewImage ? (
                  <>
                    <Image
                      src={previewImage}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setPreviewImage(null)
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Clique para fazer upload</p>
                    <p className="text-xs text-gray-500 mt-1">1400px × 400px</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'landing')}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título do banner (ex: Promoção de Outubro)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />

            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </Button>
              <Button variant="primary" className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>

        {/* Banner Área do Cliente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Banner - Área do Cliente
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Será exibido no dashboard do cliente
          </p>

          {/* Upload Area */}
          <div className="mb-4">
            <label className="block">
              <div className="relative aspect-[7/2] border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-400 transition-colors cursor-pointer overflow-hidden bg-gray-50">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Clique para fazer upload</p>
                  <p className="text-xs text-gray-500 mt-1">1400px × 400px</p>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'cliente')}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título do banner"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
            />

            <div className="flex space-x-2">
              <Button variant="outline" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </Button>
              <Button variant="primary" className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Banners Ativos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Banners Ativos
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-32 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  Preview
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900">Banner Landing Page</div>
                <div className="text-sm text-gray-500">Criado em 14/10/2025</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Ativo
              </span>
              <Button variant="ghost" size="sm">
                Editar
              </Button>
              <Button variant="ghost" size="sm">
                <X className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


