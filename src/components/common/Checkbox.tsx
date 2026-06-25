import React from 'react'
import { Check } from 'lucide-react'

interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className = '',
  ...props
}) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="appearance-none w-5 h-5 border border-dark-border rounded bg-dark-surface-dark cursor-pointer checked:bg-accent-teal checked:border-accent-teal transition-all"
          {...props}
        />
        {props.checked && (
          <Check
            size={14}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-dark-bg pointer-events-none"
          />
        )}
      </div>
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </label>
  )
}
