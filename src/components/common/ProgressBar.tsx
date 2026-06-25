import React from 'react'

interface ProgressBarProps {
  value: number // 0-100
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'default',
  showLabel = false,
  className = '',
}) => {
  const percentage = (value / max) * 100

  const variantColors = {
    default: 'bg-accent-teal',
    success: 'bg-accent-green',
    warning: 'bg-accent-orange',
    error: 'bg-accent-red',
  }

  return (
    <div className={className}>
      <div className="w-full h-2 bg-dark-surface-dark border border-dark-border rounded-full overflow-hidden">
        <div
          className={`h-full ${variantColors[variant]} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-2 text-xs text-text-secondary font-medium">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  )
}
