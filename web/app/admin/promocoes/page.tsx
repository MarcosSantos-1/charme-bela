'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, X, Plus, Trash2, Loader2, GripVertical } from 'lucide-react'
import { Button } from '@/components/Button'
import Image from 'next/image'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'
import type { Banner, BannerLocation } from '@/lib/api'
import { HOME_BANNER, fileToHomeBannerDataUrl } from '@/lib/homeBanner'
import { MachineRentalsSection } from '@/components/admin/MachineRentalsSection'

type Draft = {
  title: string
  imageUrl: string | null
  imageWidth?: number
  imageHeight?: number
}

const emptyDraft = (): Draft => ({ title: '', imageUrl: null })

function positionLabel(index: number) {
  return String(index + 1).padStart(2, '0')
}

function sortBanners(list: Banner[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
}

export default function PromocoesPage() {
  const [landingBanners, setLandingBanners] = useState<Banner[]>([])
  const [clientBanners, setClientBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [savingLocation, setSavingLocation] = useState<BannerLocation | null>(null)
  const [reordering, setReordering] = useState<BannerLocation | null>(null)
  const [landingDraft, setLandingDraft] = useState<Draft>(emptyDraft)
  const [clientDraft, setClientDraft] = useState<Draft>(emptyDraft)

  const loadBanners = useCallback(async () => {
    setLoading(true)
    try {
      const [landing, client] = await Promise.all([
        api.getBanners({ location: 'LANDING' }),
        api.getBanners({ location: 'CLIENT' }),
      ])
      setLandingBanners(sortBanners(Array.isArray(landing) ? landing : []))
      setClientBanners(sortBanners(Array.isArray(client) ? client : []))
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar banners')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBanners()
  }, [loadBanners])

  const handleSave = async (location: BannerLocation) => {
    const draft = location === 'LANDING' ? landingDraft : clientDraft
    const existing = location === 'LANDING' ? landingBanners : clientBanners
    if (!draft.title.trim()) {
      toast.error('Informe o título do banner')
      return
    }
    if (!draft.imageUrl) {
      toast.error('Arraste ou selecione uma imagem 2:1')
      return
    }

    setSavingLocation(location)
    try {
      // Novo banner entra no fim da pilha (02, 03, 04…)
      const nextOrder =
        existing.length === 0
          ? 0
          : Math.max(...existing.map((b) => b.sortOrder)) + 1

      await api.createBanner({
        title: draft.title.trim(),
        imageUrl: draft.imageUrl,
        location,
        sortOrder: nextOrder,
        imageWidth: draft.imageWidth,
        imageHeight: draft.imageHeight,
        isActive: true,
      })
      toast.success(`Banner ${positionLabel(existing.length)} adicionado`)
      if (location === 'LANDING') setLandingDraft(emptyDraft())
      else setClientDraft(emptyDraft())
      await loadBanners()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Erro ao salvar banner')
    } finally {
      setSavingLocation(null)
    }
  }

  const handleToggle = async (banner: Banner) => {
    try {
      await api.updateBanner(banner.id, { isActive: !banner.isActive })
      await loadBanners()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao atualizar banner')
    }
  }

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`Remover o banner "${banner.title}"?`)) return
    try {
      await api.deleteBanner(banner.id)
      toast.success('Banner removido')
      await loadBanners()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao remover banner')
    }
  }

  const handleReorder = async (location: BannerLocation, next: Banner[]) => {
    const previous = location === 'LANDING' ? landingBanners : clientBanners
    if (location === 'LANDING') setLandingBanners(next)
    else setClientBanners(next)

    setReordering(location)
    try {
      const saved = await api.reorderBanners(
        location,
        next.map((b) => b.id),
      )
      const sorted = sortBanners(Array.isArray(saved) ? saved : next)
      if (location === 'LANDING') setLandingBanners(sorted)
      else setClientBanners(sorted)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao reordenar banners')
      if (location === 'LANDING') setLandingBanners(previous)
      else setClientBanners(previous)
    } finally {
      setReordering(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Promoções e Banners</h2>
        <p className="text-gray-600 mt-1">
          Gerencie o slider da landing e da área do cliente (app + web)
        </p>
      </div>

      <MachineRentalsSection />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-2">Dimensões e ordem</p>
        <div className="text-sm text-blue-700 space-y-1">
          <p>
            • <strong>Master:</strong> {HOME_BANNER.sizeHint}px (proporção {HOME_BANNER.aspectLabel})
          </p>
          <p>• Arraste pelo ícone ⋮⋮ para definir a posição (01, 02, 03…)</p>
          <p>• Novos banners entram no fim da pilha</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando banners…
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <BannerSection
            title="Banner — Landing Page"
            description='Exibido acima da seção "Nossos Tratamentos"'
            location="LANDING"
            banners={landingBanners}
            draft={landingDraft}
            setDraft={setLandingDraft}
            saving={savingLocation === 'LANDING'}
            reordering={reordering === 'LANDING'}
            onSave={() => handleSave('LANDING')}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onReorder={(next) => handleReorder('LANDING', next)}
          />
          <BannerSection
            title="Banner — Área do Cliente"
            description="Exibido no dashboard do cliente (web) e na home do app"
            location="CLIENT"
            banners={clientBanners}
            draft={clientDraft}
            setDraft={setClientDraft}
            saving={savingLocation === 'CLIENT'}
            reordering={reordering === 'CLIENT'}
            onSave={() => handleSave('CLIENT')}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onReorder={(next) => handleReorder('CLIENT', next)}
          />
        </div>
      )}
    </div>
  )
}

function BannerSection({
  title,
  description,
  location,
  banners,
  draft,
  setDraft,
  saving,
  reordering,
  onSave,
  onToggle,
  onDelete,
  onReorder,
}: {
  title: string
  description: string
  location: BannerLocation
  banners: Banner[]
  draft: Draft
  setDraft: (draft: Draft) => void
  saving: boolean
  reordering: boolean
  onSave: () => void
  onToggle: (banner: Banner) => void
  onDelete: (banner: Banner) => void
  onReorder: (next: Banner[]) => void
}) {
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= banners.length || to >= banners.length) return
    const next = [...banners]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onReorder(next)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <BannerDropzone
        imageUrl={draft.imageUrl}
        onImage={(imageUrl, width, height) =>
          setDraft({ ...draft, imageUrl, imageWidth: width, imageHeight: height })
        }
        onClear={() => setDraft({ ...draft, imageUrl: null })}
      />

      <input
        type="text"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Título do banner (ex: Promoção de Outubro)"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 placeholder:text-gray-500"
      />

      <Button variant="primary" className="w-full" onClick={onSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvando…
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar banner
          </>
        )}
      </Button>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-800">
            Ordem do carrossel ({banners.length})
          </h4>
          {reordering ? (
            <span className="text-xs text-pink-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Salvando ordem…
            </span>
          ) : null}
        </div>
        {banners.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum banner ainda. Adicione o primeiro acima.</p>
        ) : (
          <div className="space-y-2">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                draggable
                onDragStart={() => {
                  dragIndex.current = index
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverIndex(index)
                }}
                onDragLeave={() => {
                  if (overIndex === index) setOverIndex(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = dragIndex.current
                  dragIndex.current = null
                  setOverIndex(null)
                  if (from === null) return
                  move(from, index)
                }}
                onDragEnd={() => {
                  dragIndex.current = null
                  setOverIndex(null)
                }}
                className={`flex items-center gap-3 p-3 border rounded-lg bg-white transition-colors ${
                  overIndex === index ? 'border-pink-400 bg-pink-50' : 'border-gray-200'
                }`}
              >
                <div
                  className="flex flex-col items-center gap-1 text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
                  title="Arraste para reordenar"
                >
                  <GripVertical className="w-5 h-5" />
                  <span className="text-[10px] font-bold text-pink-600">{positionLabel(index)}</span>
                </div>
                <div className="relative w-28 aspect-[2/1] rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  {banner.imageUrl.startsWith('data:') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Image src={banner.imageUrl} alt={banner.title} fill className="object-cover" unoptimized />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{banner.title}</div>
                  <button
                    type="button"
                    onClick={() => onToggle(banner)}
                    className={`mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      banner.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {banner.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(banner)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500">
          Posição 01 = primeiro slide do carrossel ({location === 'CLIENT' ? 'antes do plano' : 'na landing'}).
        </p>
      </div>
    </div>
  )
}

function BannerDropzone({
  imageUrl,
  onImage,
  onClear,
}: {
  imageUrl: string | null
  onImage: (dataUrl: string, width: number, height: number) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)

  const processFile = async (file: File | undefined) => {
    if (!file) return
    setProcessing(true)
    try {
      const result = await fileToHomeBannerDataUrl(file)
      onImage(result.dataUrl, result.width, result.height)
      toast.success('Imagem pronta no formato 2:1')
    } catch (error: any) {
      toast.error(error?.message || 'Falha ao processar imagem')
    } finally {
      setProcessing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !processing && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void processFile(e.dataTransfer.files?.[0])
        }}
        className={`relative aspect-[2/1] border-2 border-dashed rounded-xl cursor-pointer overflow-hidden transition-colors ${
          dragging
            ? 'border-pink-500 bg-pink-50'
            : 'border-gray-300 hover:border-pink-400 bg-gray-50'
        }`}
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            {processing ? (
              <>
                <Loader2 className="w-10 h-10 text-pink-500 animate-spin mb-2" />
                <p className="text-sm text-gray-600">Processando imagem…</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-700 font-medium">Arraste a imagem ou clique</p>
                <p className="text-xs text-gray-500 mt-1">
                  {HOME_BANNER.sizeHint} ({HOME_BANNER.aspectLabel})
                </p>
              </>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void processFile(e.target.files?.[0])}
      />
    </div>
  )
}
