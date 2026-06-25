import React from 'react'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
  
  const variantStyles = {
    default: 'bg-dark-surface-dark text-text-secondary border-dark-border',
    success: 'bg-accent-green/20 text-accent-green border-accent-green/30',
    warning: 'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
    danger: 'bg-accent-red/20 text-accent-red border-accent-red/30',
    error: 'bg-accent-red/20 text-accent-red border-accent-red/30',
    info: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
  }
  
  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
