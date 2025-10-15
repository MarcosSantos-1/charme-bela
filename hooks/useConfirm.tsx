'use client'

import { useState } from 'react'
import { X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/Button'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'warning' | 'danger' | 'info'
}

export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmDialogProps) {
  const colors = {
    warning: 'from-yellow-500 to-orange-500',
    danger: 'from-red-500 to-pink-500',
    info: 'from-blue-500 to-purple-500'
  }

  const icons = {
    warning: AlertCircle,
    danger: AlertCircle,
    info: CheckCircle
  }

  const Icon = icons[type]

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 bg-gradient-to-br ${colors[type]} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{message}</p>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [dialogProps, setDialogProps] = useState<ConfirmDialogProps | null>(null)

  const confirm = (props: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogProps({
        ...props,
        onConfirm: () => {
          setDialogProps(null)
          resolve(true)
        },
        onCancel: () => {
          setDialogProps(null)
          resolve(false)
        }
      })
    })
  }

  const ConfirmDialogComponent = dialogProps ? <ConfirmDialog {...dialogProps} /> : null

  return { confirm, ConfirmDialogComponent }
}

