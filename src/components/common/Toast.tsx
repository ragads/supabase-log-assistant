import React, { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const typeStyles = {
    success: 'bg-accent-green/20 border-accent-green text-accent-green',
    error: 'bg-accent-red/20 border-accent-red text-accent-red',
    warning: 'bg-accent-orange/20 border-accent-orange text-accent-orange',
    info: 'bg-accent-blue/20 border-accent-blue text-accent-blue',
  }

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  }[type]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${typeStyles[type]} animate-slideIn`}
      role="alert"
    >
      <Icon size={20} />
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current hover:opacity-70 transition-opacity"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}
