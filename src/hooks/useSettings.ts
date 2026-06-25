import { useApp } from '@/context/AppContext'

export const useSettings = () => {
  const {
    settings,
    updateSettings,
    isLoadingSettings,
    isTestingConnection,
    supabaseStatus,
    geminiStatus,
    testConnections,
  } = useApp()

  return {
    settings,
    updateSettings,
    isLoading: isLoadingSettings,
    isTesting: isTestingConnection,
    supabaseStatus,
    geminiStatus,
    testConnections,
  }
}
