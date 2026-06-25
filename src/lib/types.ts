export interface LogEntry {
  id: string
  created_at: string
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'DEBUG'
  service: string
  source: string
  message: string
  metadata: Record<string, any>
}

export interface LogFilters {
  search?: string
  severity?: string[]
  source?: string[]
  timeRange?: string
  limit?: number
  offset?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string | Date
  toolUse?: any[]
}

export interface DashboardMetrics {
  totalLogs: number
  totalLogsChange: number
  criticalErrors: number
  criticalErrorsChange: number
  warnings: number
  warningsChange: number
  errorRate: number
}

export interface SeverityDistributionItem {
  name: string
  value: number
  color: string
}

export interface SourceDistributionItem {
  name: string
  count: number
}
