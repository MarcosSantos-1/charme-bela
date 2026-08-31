import { useState } from 'react'
import { RiAlertFill, RiCheckboxCircleFill, RiInformationFill } from 'react-icons/ri'
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
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-rose-600 to-red-600',
    info: 'from-blue-600 to-indigo-600'
  }

  const icons = {
    warning: RiAlertFill,
    danger: RiAlertFill,
    info: RiCheckboxCircleFill
  }

  const Icon = icons[type]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border-2 border-slate-200">
        <div className="text-center mb-6">
          <div className={`w-14 h-14 bg-gradient-to-br ${colors[type]} rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-md`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-1.5 tracking-tight">{title}</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-2.5">
          <Button
            variant="outline"
            className="flex-1 font-bold text-xs"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            className="flex-1 font-bold text-xs shadow-xs"
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


