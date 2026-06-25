import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'subtle'
  icon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  variant = 'default',
  icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'w-full px-4 py-2 rounded-md border bg-dark-surface-dark text-text-primary placeholder-text-muted transition-all duration-200 focus:outline-none focus:border-accent-teal focus:shadow-lg'
  
  const variantStyles = {
    default: 'border-dark-border focus:border-accent-teal focus:ring-1 focus:ring-accent-teal/30',
    subtle: 'border-dark-border/50 focus:border-dark-border',
  }
  
  return (
    <div className={`relative ${className}`}>
      {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">{icon}</div>}
      <input
        className={`${baseStyles} ${variantStyles[variant]} ${icon ? 'pl-10' : ''}`}
        {...props}
      />
    </div>
  )
}
