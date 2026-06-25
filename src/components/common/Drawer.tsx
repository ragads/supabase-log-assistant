import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'left' | 'right' | 'bottom'
  size?: 'sm' | 'md' | 'lg'
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const positionClasses = {
    left: 'left-0 top-0 h-full animate-slideIn',
    right: 'right-0 top-0 h-full animate-slideIn',
    bottom: 'bottom-0 left-0 w-full animate-slideIn',
  }

  const sizeClasses = {
    sm: position === 'bottom' ? 'h-1/3' : 'w-64',
    md: position === 'bottom' ? 'h-1/2' : 'w-96',
    lg: position === 'bottom' ? 'h-2/3' : 'w-2/5',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed ${positionClasses[position]} ${sizeClasses[size]} bg-dark-surface border border-dark-border z-50 flex flex-col`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </>
  )
}
