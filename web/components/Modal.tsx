'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  expanded?: boolean
  footer?: ReactNode
  contentClassName?: string
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}

function useVisualViewportHeight(active: boolean) {
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!active) return

    const vv = window.visualViewport
    if (!vv) return

    const update = () => setHeight(vv.height)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [active])

  return height
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  expanded = false,
  footer,
  contentClassName = '',
}: ModalProps) {
  const isMobile = useIsMobile()
  const viewportHeight = useVisualViewportHeight(isOpen)

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-2xl',
    lg: 'sm:max-w-4xl',
    xl: 'sm:max-w-6xl',
    full: 'sm:max-w-full sm:mx-4',
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const mobileHeight = viewportHeight
    ? `${expanded ? viewportHeight : Math.round(viewportHeight * 0.92)}px`
    : undefined

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div
        className={`
          relative bg-white shadow-2xl w-full ${sizeClasses[size]}
          flex flex-col overflow-hidden min-w-0 max-w-full
          transition-[height] duration-300 ease-out
          ${expanded
            ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-[92vh] sm:max-h-[92vh] sm:rounded-2xl'
            : 'h-[92dvh] max-h-[92dvh] rounded-t-3xl sm:h-auto sm:min-h-[70vh] sm:max-h-[92vh] sm:rounded-2xl'
          }
        `}
        style={
          isMobile && mobileHeight
            ? {
                height: mobileHeight,
                maxHeight: viewportHeight ? `${viewportHeight}px` : undefined,
              }
            : undefined
        }
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 shrink-0">
          <h2
            id="admin-modal-title"
            className="text-lg sm:text-2xl font-bold text-gray-900 min-w-0 truncate"
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-pink-50 hover:border-pink-400 hover:text-pink-600 transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div
          className={`
            flex-1 min-h-0 min-w-0 overflow-x-hidden p-4 sm:p-6
            ${expanded ? 'overflow-y-hidden' : 'overflow-y-auto'}
            ${contentClassName}
          `}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
