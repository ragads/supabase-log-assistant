'use client'

import React from 'react'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/common/Input'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <header className="sticky top-0 z-40 bg-dark-surface/80 backdrop-blur-md border-b border-dark-border">
      <div className="px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
            <Input
              placeholder="Search logs..."
              className="pl-10 bg-dark-surface-dark border-dark-border"
            />
          </div>
          
          <button className="relative p-2 text-text-secondary hover:text-accent-teal transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full"></span>
          </button>

          {actions}
        </div>
      </div>
    </header>
  )
}
