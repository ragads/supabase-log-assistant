export const APP_NAME = 'Supabase Log AI Assistant'

export const LOG_SOURCES = [
  { value: 'edge_logs', label: 'API / Edge Gateway' },
  { value: 'postgres_logs', label: 'Postgres Database' },
  { value: 'auth_logs', label: 'Auth Service' },
  { value: 'function_edge_logs', label: 'Edge Functions' },
]

export const SEVERITY_LEVELS = [
  { value: 'INFO', label: 'Info' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
  { value: 'DEBUG', label: 'Debug' },
]

export const TIME_RANGES = [
  { value: '1h', label: 'Last Hour' },
  { value: '6h', label: 'Last 6 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
]
