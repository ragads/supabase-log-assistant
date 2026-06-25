'use client'

import React, { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { Alert } from '@/components/common/Alert'
import { Spinner } from '@/components/common/Spinner'
import { Badge } from '@/components/common/Badge'
import { useSettings } from '@/hooks/useSettings'
import { ShieldAlert, CheckCircle2, AlertTriangle, Key, Database, Settings2 } from 'lucide-react'

export default function SettingsPage() {
  const { settings, updateSettings, isLoading, isTesting, supabaseStatus, geminiStatus, testConnections } = useSettings()
  const [activeTab, setActiveTab] = useState<'general' | 'api'>('general')

  // Form states
  const [appName, setAppName] = useState('')
  const [logFetchInterval, setLogFetchInterval] = useState(300000)
  const [maxLogsPerQuery, setMaxLogsPerQuery] = useState(1000)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabasePat, setSupabasePat] = useState('')

  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (settings) {
      setAppName(settings.appName)
      setLogFetchInterval(settings.logFetchInterval)
      setMaxLogsPerQuery(settings.maxLogsPerQuery)
      setGeminiApiKey(settings.geminiApiKey)
      setSupabaseUrl(settings.supabaseUrl)
      setSupabasePat(settings.supabasePat)
    }
  }, [settings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlertInfo(null)
    const success = await updateSettings({
      appName,
      logFetchInterval,
      maxLogsPerQuery,
      geminiApiKey,
      supabaseUrl,
      supabasePat,
    })

    if (success) {
      setAlertInfo({ type: 'success', message: 'Settings saved successfully!' })
    } else {
      setAlertInfo({ type: 'error', message: 'Failed to update settings. Please check backend logs.' })
    }
  }

  const handleTestConnection = async () => {
    await testConnections()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" text="Loading settings..." />
      </div>
    )
  }

  return (
    <>
      <Header title="Settings" subtitle="Configure system credentials and dashboard settings" />

      <div className="p-8 space-y-6 max-w-5xl">
        {alertInfo && (
          <Alert
            type={alertInfo.type}
            message={alertInfo.message}
            closeable
            onClose={() => setAlertInfo(null)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation Tab Panel */}
          <div className="space-y-2 md:col-span-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                activeTab === 'general'
                  ? 'bg-dark-surface border border-accent-teal text-accent-teal'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-surface'
              }`}
            >
              <Settings2 size={18} />
              General
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                activeTab === 'api'
                  ? 'bg-dark-surface border border-accent-teal text-accent-teal'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-surface'
              }`}
            >
              <Database size={18} />
              API Credentials
            </button>

            {/* Connection status card */}
            <Card className="p-4 mt-6 border-dark-border bg-dark-surface-dark/20 space-y-4">
              <h5 className="text-xs uppercase font-semibold text-text-muted">Connection status</h5>
              
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-secondary font-medium">Supabase Logs:</span>
                    <Badge variant={supabaseStatus.connected ? 'success' : 'danger'}>
                      {supabaseStatus.connected ? 'OK' : 'Error'}
                    </Badge>
                  </div>
                  <p className="text-text-muted leading-tight">{supabaseStatus.message}</p>
                </div>

                <div className="border-t border-dark-border/50 pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-secondary font-medium">Gemini LLM:</span>
                    <Badge variant={geminiStatus.connected ? 'success' : 'danger'}>
                      {geminiStatus.connected ? 'OK' : 'Error'}
                    </Badge>
                  </div>
                  <p className="text-text-muted leading-tight">{geminiStatus.message}</p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Connections'}
              </Button>
            </Card>
          </div>

          {/* Form Content Panel */}
          <div className="md:col-span-3">
            <Card className="p-6">
              <form onSubmit={handleSave} className="space-y-6">
                {activeTab === 'general' ? (
                  <>
                    <h3 className="text-lg font-semibold text-text-primary border-b border-dark-border pb-3 mb-4">
                      General Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">
                          Application Name
                        </label>
                        <Input
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          placeholder="Supabase Log AI Assistant"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">
                          Log Refresh Interval (milliseconds)
                        </label>
                        <Select
                          options={[
                            { value: 60000, label: '1 minute' },
                            { value: 300000, label: '5 minutes' },
                            { value: 600000, label: '10 minutes' },
                          ]}
                          value={logFetchInterval}
                          onChange={(val) => setLogFetchInterval(Number(val))}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">
                          Maximum Logs per Query
                        </label>
                        <Select
                          options={[
                            { value: 100, label: '100 logs' },
                            { value: 500, label: '500 logs' },
                            { value: 1000, label: '1,000 logs' },
                            { value: 5000, label: '5,000 logs' },
                          ]}
                          value={maxLogsPerQuery}
                          onChange={(val) => setMaxLogsPerQuery(Number(val))}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-text-primary border-b border-dark-border pb-3 mb-4">
                      API Credentials Setup
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1 flex items-center gap-2">
                          <Key size={14} className="text-accent-cyan" />
                          Gemini API Key
                        </label>
                        <Input
                          type="password"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">
                          Supabase Project URL
                        </label>
                        <Input
                          value={supabaseUrl}
                          onChange={(e) => setSupabaseUrl(e.target.value)}
                          placeholder="https://your-project-ref.supabase.co"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">
                          Supabase Personal Access Token (PAT)
                        </label>
                        <Input
                          type="password"
                          value={supabasePat}
                          onChange={(e) => setSupabasePat(e.target.value)}
                          placeholder="sbp_..."
                        />
                        <p className="text-xs text-text-muted mt-1">
                          Personal access tokens must start with `sbp_`. You can generate one from the Supabase Dashboard accounts tokens tab.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-4 border-t border-dark-border gap-2">
                  <Button type="submit" variant="primary">
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
