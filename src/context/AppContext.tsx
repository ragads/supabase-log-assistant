'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiService } from '@/services/api'

interface Settings {
  appName: string
  logFetchInterval: number
  maxLogsPerQuery: number
  geminiApiKey: string
  supabaseUrl: string
  supabasePat: string
}

interface ConnectionStatus {
  connected: boolean
  message: string
}

interface AppContextType {
  settings: Settings | null
  supabaseStatus: ConnectionStatus
  geminiStatus: ConnectionStatus
  isLoadingSettings: boolean
  isTestingConnection: boolean
  loadSettings: () => Promise<void>
  updateSettings: (newSettings: Partial<Settings>) => Promise<boolean>
  testConnections: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<ConnectionStatus>({
    connected: false,
    message: 'Checking...',
  })
  const [geminiStatus, setGeminiStatus] = useState<ConnectionStatus>({
    connected: false,
    message: 'Checking...',
  })

  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true)
    try {
      const data = await apiService.getSettings() as any
      setSettings(data)
    } catch (err) {
      console.error('Failed to load settings from server:', err)
    } finally {
      setIsLoadingSettings(false)
    }
  }, [])

  const testConnections = useCallback(async () => {
    setIsTestingConnection(true)
    try {
      const status = await apiService.testConnections() as any
      setSupabaseStatus(status.supabase)
      setGeminiStatus(status.gemini)
    } catch (err) {
      console.error('Failed to test connections:', err)
      setSupabaseStatus({ connected: false, message: 'Server connection error' })
      setGeminiStatus({ connected: false, message: 'Server connection error' })
    } finally {
      setIsTestingConnection(false)
    }
  }, [])

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      const response = await apiService.updateSettings(newSettings) as any
      if (response.status === 'success') {
        await loadSettings()
        // Re-test connection automatically
        testConnections()
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to update settings:', err)
      return false
    }
  }, [loadSettings, testConnections])

  useEffect(() => {
    loadSettings().then(() => {
      testConnections()
    })
  }, [loadSettings, testConnections])

  return (
    <AppContext.Provider
      value={{
        settings,
        supabaseStatus,
        geminiStatus,
        isLoadingSettings,
        isTestingConnection,
        loadSettings,
        updateSettings,
        testConnections,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
