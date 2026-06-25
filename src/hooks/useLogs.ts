import { useState, useCallback, useEffect } from 'react'
import { apiService } from '@/services/api'
import { LogFilters, LogEntry } from '@/lib/types'

export const useLogs = (initialFilters: LogFilters = {}) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFilters] = useState<LogFilters>({
    limit: 50,
    offset: 0,
    timeRange: '24h',
    severity: [],
    source: [],
    search: '',
    ...initialFilters
  })
  const [total, setTotal] = useState(0)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiService.getLogs(filters) as any
      setLogs(response.data || [])
      setTotal(response.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch logs'))
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return {
    logs,
    isLoading,
    error,
    filters,
    setFilters,
    total,
    refetch: fetchLogs,
  }
}
