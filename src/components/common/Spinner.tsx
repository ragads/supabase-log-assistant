import React from 'react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary'
  text?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'default',
  text,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const colorClasses = {
    default: 'border-dark-border border-t-accent-teal',
    primary: 'border-accent-teal border-t-accent-cyan',
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizeClasses[size]} ${colorClasses[variant]} border-2 border-solid rounded-full animate-spin`}
        style={{
          borderTopColor:
            variant === 'primary'
              ? 'var(--color-accent-cyan)'
              : 'var(--color-accent-teal)',
        }}
      />
      {text && <span className="text-sm text-text-secondary">{text}</span>}
    </div>
  )
}
