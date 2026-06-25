import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
  
  const variantStyles = {
    primary: 'bg-accent-teal text-dark-bg hover:bg-accent-cyan border border-accent-teal/30',
    secondary: 'bg-dark-surface text-text-primary hover:bg-dark-border border border-dark-border',
    ghost: 'text-text-secondary hover:text-accent-teal border border-transparent hover:border-dark-border',
    danger: 'bg-accent-red/20 text-accent-red hover:bg-accent-red/30 border border-accent-red/50',
  }
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></span>
      ) : null}
      {children}
    </button>
  )
}
