import type { Metadata } from 'next'
import { MainLayout } from '@/components/layout/MainLayout'
import { AppProvider } from '@/context/AppContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Supabase Log AI Assistant',
  description: 'AI-powered log analysis for Supabase projects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <MainLayout>{children}</MainLayout>
        </AppProvider>
      </body>
    </html>
  )
}
