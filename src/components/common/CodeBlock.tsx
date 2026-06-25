import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  copyable?: boolean
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  copyable = true,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-dark-surface-dark border border-dark-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-surface border-b border-dark-border/50">
        <span className="text-xs text-text-muted font-mono">{language}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        )}
      </div>
      <pre className="px-4 py-3 overflow-x-auto">
        <code className="text-text-code text-sm font-mono">{code}</code>
      </pre>
    </div>
  )
}
