'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  MessageCircle,
  Settings,
  Book,
  LogOut,
} from 'lucide-react'

export const Sidebar: React.FC = () => {
  const pathname = usePathname()
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Search, label: 'Log Explorer', href: '/explorer' },
    { icon: MessageCircle, label: 'AI Chat', href: '/chat' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]
  
  const isActive = (href: string) => pathname === href

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-surface border-r border-dark-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-dark-border">
        <h1 className="text-xl font-bold text-accent-teal flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-teal rounded-md flex items-center justify-center text-dark-bg font-bold">
            🛡️
          </div>
          Supabase
        </h1>
        <p className="text-xs text-text-muted mt-1">Log AI Assistant</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all duration-300 ${
                active
                  ? 'bg-dark-surface-dark border border-accent-teal text-accent-teal'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-surface-dark'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer Section */}
      <div className="border-t border-dark-border p-4">
        <div className="text-xs text-center text-text-muted">
          v1.0 (MCP Protocol)
        </div>
      </div>
    </aside>
  )
}
