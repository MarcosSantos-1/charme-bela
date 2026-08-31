'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RiUploadCloud2Fill,
  RiCloseLine,
  RiAddLine,
  RiDeleteBin5Fill,
  RiLoader4Line,
  RiDraggable,
} from 'react-icons/ri'
import { Button } from '@/components/Button'
import Image from 'next/image'
import toast from 'react-hot-toast'
import * as api from '@/lib/api'
import type { Banner } from '@/lib/api'
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
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  const loadBanners = useCallback(async () => {
    setLoading(true)
    try {
      const client = await api.getBanners({ location: 'CLIENT' })
      const list = Array.isArray(client) && client.length > 0
        ? client
        : await api.getBanners({ location: 'LANDING' })
      setBanners(sortBanners(Array.isArray(list) ? list : []))
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

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error('Informe o título do banner')
      return
    }
    if (!draft.imageUrl) {
      toast.error('Arraste ou selecione uma imagem 2:1')
      return
    }

    setSaving(true)
    try {
      const nextOrder =
        banners.length === 0
          ? 0
          : Math.max(...banners.map((b) => b.sortOrder)) + 1

      // Salva para CLIENT (que é usado tanto na landing quanto na área do cliente)
      await api.createBanner({
        title: draft.title.trim(),
        imageUrl: draft.imageUrl,
        location: 'CLIENT',
        sortOrder: nextOrder,
        imageWidth: draft.imageWidth,
        imageHeight: draft.imageHeight,
        isActive: true,
      })
      toast.success(`Banner ${positionLabel(banners.length)} adicionado com sucesso`)
      setDraft(emptyDraft())
      await loadBanners()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Erro ao salvar banner')
    } finally {
      setSaving(false)
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

  const handleReorder = async (next: Banner[]) => {
    const previous = banners
    setBanners(next)
    setReordering(true)
    try {
      const saved = await api.reorderBanners(
        'CLIENT',
        next.map((b) => b.id),
      )
      const sorted = sortBanners(Array.isArray(saved) ? saved : next)
      setBanners(sorted)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao reordenar banners')
      setBanners(previous)
    } finally {
      setReordering(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Promoções e Banners</h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
          Gerencie máquinas alugadas e o carrossel promocional do site e aplicativo
        </p>
      </div>

      <MachineRentalsSection />

      <div className="bg-sky-50/80 border-2 border-sky-200/70 rounded-2xl p-4">
        <p className="text-xs sm:text-sm text-sky-900 font-extrabold mb-1">Dicas para os Banners Promocionais</p>
        <div className="text-xs font-semibold text-sky-800 space-y-0.5">
          <p>
            • <strong>Tamanho ideal:</strong> {HOME_BANNER.sizeHint}px (proporção {HOME_BANNER.aspectLabel})
          </p>
          <p>• Arraste pelo ícone ⋮⋮ para definir a posição (01, 02, 03…)</p>
          <p>• O carrossel é exibido automaticamente na Landing Page e na Área do Cliente / App</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <RiLoader4Line className="w-8 h-8 animate-spin text-rose-600 mr-2" />
          <span className="text-xs font-bold">Carregando banners…</span>
        </div>
      ) : (
        <div className="max-w-4xl">
          <BannerSection
            title="Banners Promocionais (Carrossel)"
            description="Exibido na Landing Page, no Dashboard Web e no App Mobile"
            banners={banners}
            draft={draft}
            setDraft={setDraft}
            saving={saving}
            reordering={reordering}
            onSave={handleSave}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        </div>
      )}
    </div>
  )
}

function BannerSection({
  title,
  description,
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
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-6 space-y-4 shadow-xs">
      <div>
        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">{description}</p>
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
        className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
      />

      <Button variant="primary" className="w-full text-xs sm:text-sm font-bold shadow-xs" onClick={onSave} disabled={saving}>
        {saving ? (
          <>
            <RiLoader4Line className="w-4 h-4 mr-1.5 animate-spin" />
            Salvando…
          </>
        ) : (
          <>
            <RiAddLine className="w-4 h-4 mr-1.5" />
            Adicionar Banner
          </>
        )}
      </Button>

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-800">
            Ordem do carrossel ({banners.length})
          </h4>
          {reordering ? (
            <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
              <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
              Salvando ordem…
            </span>
          ) : null}
        </div>
        {banners.length === 0 ? (
          <p className="text-xs font-semibold text-slate-400">Nenhum banner cadastrado. Adicione acima.</p>
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
                className={`flex items-center gap-3 p-2.5 sm:p-3 border-2 rounded-xl bg-white transition-colors ${
                  overIndex === index ? 'border-rose-400 bg-rose-50' : 'border-slate-100'
                }`}
              >
                <div
                  className="flex flex-col items-center gap-0.5 text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
                  title="Arraste para reordenar"
                >
                  <RiDraggable className="w-4 h-4" />
                  <span className="text-[10px] font-extrabold text-rose-600">{positionLabel(index)}</span>
                </div>
                <div className="relative w-24 sm:w-28 aspect-[2/1] rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  {banner.imageUrl.startsWith('data:') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Image src={banner.imageUrl} alt={banner.title} fill className="object-cover" unoptimized />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{banner.title}</div>
                  <button
                    type="button"
                    onClick={() => onToggle(banner)}
                    className={`mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      banner.isActive
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {banner.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(banner)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  aria-label="Remover"
                >
                  <RiDeleteBin5Fill className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] font-semibold text-slate-400">
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
        className={`relative aspect-[2/1] border-2 border-dashed rounded-2xl cursor-pointer overflow-hidden transition-colors ${
          dragging
            ? 'border-rose-500 bg-rose-50/50'
            : 'border-slate-300 hover:border-rose-400 bg-slate-50'
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
              className="absolute top-2.5 right-2.5 w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center hover:bg-rose-700 z-10 text-white shadow-md"
            >
              <RiCloseLine className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            {processing ? (
              <>
                <RiLoader4Line className="w-8 h-8 text-rose-500 animate-spin mb-1.5" />
                <p className="text-xs font-bold text-slate-600">Processando imagem…</p>
              </>
            ) : (
              <>
                <RiUploadCloud2Fill className="w-8 h-8 text-slate-400 mb-1.5" />
                <p className="text-xs sm:text-sm text-slate-800 font-bold">Arraste a imagem ou toque para escolher</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
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
