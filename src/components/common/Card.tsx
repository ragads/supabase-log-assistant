import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  variant?: 'default' | 'subtle'
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  variant = 'default',
  onClick,
}) => {
  const baseStyles = 'rounded-lg border backdrop-blur-sm'
  
  const variantStyles = {
    default: 'bg-dark-surface/50 border-dark-border',
    subtle: 'bg-dark-surface-dark/30 border-dark-border/50',
  }
  
  const hoverStyles = hoverable ? 'hover:border-accent-teal transition-all duration-300 hover:shadow-glow cursor-pointer' : ''
  
  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
