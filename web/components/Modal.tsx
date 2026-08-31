'use client'

import { useEffect, type ReactNode } from 'react'
import { RiCloseLine } from 'react-icons/ri'

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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div
        className={`
          relative bg-white shadow-2xl w-full ${sizeClasses[size]}
          flex flex-col overflow-hidden min-w-0 max-w-full
          ${expanded
            ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-[90vh] sm:max-h-[90vh] sm:rounded-3xl'
            : 'h-[92dvh] max-h-[92dvh] rounded-t-3xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl border-t-2 sm:border-2 border-slate-200'
          }
        `}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-white shrink-0">
          <h2
            id="admin-modal-title"
            className="text-base sm:text-xl font-extrabold text-slate-900 min-w-0 truncate tracking-tight"
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <RiCloseLine className="w-5 h-5 sm:w-6 sm:h-6" />
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
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 sm:px-6 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
