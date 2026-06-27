'use client'

import React from 'react'
import { Sidebar } from './Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-[#060d1a]">
      {/* Aurora gradient blobs */}
      <div className="blob blob-teal" />
      <div className="blob blob-purple" />
      <div className="blob blob-blue" />

      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto relative z-10">
        {children}
      </main>
    </div>
  )
}
