import React, { useState } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange?: (tags: string[]) => void
  placeholder?: string
  className?: string
}

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder = 'Add a tag and press Enter',
  className = '',
}) => {
  const [input, setInput] = useState('')

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (!value.includes(input.trim())) {
        onChange?.([...value, input.trim()])
        setInput('')
      }
    }
  }

  const removeTag = (tag: string) => {
    onChange?.(value.filter((t) => t !== tag))
  }

  return (
    <div className={`flex flex-wrap gap-2 p-3 border border-dark-border rounded-md bg-dark-surface-dark ${className}`}>
      {value.map((tag) => (
        <div
          key={tag}
          className="flex items-center gap-2 bg-accent-teal/20 text-accent-teal border border-accent-teal/50 rounded-full px-3 py-1"
        >
          <span className="text-sm">{tag}</span>
          <button
            onClick={() => removeTag(tag)}
            className="hover:opacity-70 transition-opacity"
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={placeholder}
        className="flex-1 min-w-[200px] bg-transparent text-text-primary placeholder-text-muted outline-none"
      />
    </div>
  )
}
