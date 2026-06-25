import React from 'react'
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react'

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  onClose?: () => void
  closeable?: boolean
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  closeable = false,
}) => {
  const typeStyles = {
    info: {
      bg: 'bg-accent-blue/20',
      border: 'border-accent-blue/50',
      text: 'text-accent-blue',
      icon: Info,
    },
    success: {
      bg: 'bg-accent-green/20',
      border: 'border-accent-green/50',
      text: 'text-accent-green',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-accent-orange/20',
      border: 'border-accent-orange/50',
      text: 'text-accent-orange',
      icon: AlertTriangle,
    },
    error: {
      bg: 'bg-accent-red/20',
      border: 'border-accent-red/50',
      text: 'text-accent-red',
      icon: AlertCircle,
    },
  }

  const style = typeStyles[type]
  const Icon = style.icon

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <div className="flex gap-3">
        <Icon className={style.text} size={20} style={{ flexShrink: 0 }} />
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold ${style.text} mb-1`}>{title}</h4>
          )}
          <p className={style.text}>{message}</p>
        </div>
        {closeable && (
          <button
            onClick={onClose}
            className={`${style.text} hover:opacity-70 transition-opacity`}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
