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
  const baseStyles = 'rounded-xl'

  const variantStyles = {
    default: 'glass-card',
    subtle: 'glass-card-subtle',
  }

  const hoverStyles = hoverable ? 'transition-all duration-300 cursor-pointer' : ''
  
  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
