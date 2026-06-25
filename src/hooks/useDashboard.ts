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
  const [error, setError] = useState<Error | null>(null)

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true)
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to fetch dashboard data')
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchDashboard])

  return {
    metrics,
    errorRateData,
    severityData,
    sourcesData,
    recentLogs,
    isLoading,
    error,
    refetch: fetchDashboard,
  }
}
