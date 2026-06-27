import { useState, useCallback, useEffect } from 'react'
import { apiService } from '@/services/api'
import { DashboardMetrics, SeverityDistributionItem, SourceDistributionItem, LogEntry } from '@/lib/types'

export const useDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [errorRateData, setErrorRateData] = useState<{ time: string; value: number }[]>([])
  const [severityData, setSeverityData] = useState<SeverityDistributionItem[]>([])
  const [sourcesData, setSourcesData] = useState<SourceDistributionItem[]>([])
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [nextRefreshIn, setNextRefreshIn] = useState(15)

  const fetchDashboard = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    try {
      const metricsRes = await apiService.getDashboardMetrics() as any
      const errorRateRes = await apiService.getErrorRateData('24h') as any

      setMetrics({
        totalLogs: metricsRes.totalLogs,
        totalLogsChange: metricsRes.totalLogsChange,
        criticalErrors: metricsRes.criticalErrors,
        criticalErrorsChange: metricsRes.criticalErrorsChange,
        warnings: metricsRes.warnings,
        warningsChange: metricsRes.warningsChange,
        errorRate: metricsRes.errorRate,
      })
      setErrorRateData(errorRateRes.data || [])
      setSeverityData(metricsRes.severityDistribution || [])
      setSourcesData(metricsRes.sourceDistribution || [])
      setRecentLogs(metricsRes.recentLogs || [])
      setLastUpdated(new Date())
      setNextRefreshIn(15)
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to fetch dashboard data')
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Auto-refresh every 15s
  useEffect(() => {
    fetchDashboard(false)
    const interval = setInterval(() => fetchDashboard(true), 15000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  // Countdown ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setNextRefreshIn(prev => (prev <= 1 ? 15 : prev - 1))
    }, 1000)
    return () => clearInterval(ticker)
  }, [])

  return {
    metrics,
    errorRateData,
    severityData,
    sourcesData,
    recentLogs,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    nextRefreshIn,
    refetch: () => fetchDashboard(false),
  }
}
