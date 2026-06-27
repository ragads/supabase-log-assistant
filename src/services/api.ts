import axios, { AxiosInstance } from 'axios'
import { LogFilters } from '@/lib/types'

class APIService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      // Use relative paths so Next.js rewrites forward to the correct backend
      // (localhost:8000 in dev, Render URL in prod via BACKEND_API_URL env var).
      baseURL: '',
      timeout: 70000, // 70s — Render free tier cold-start takes up to 60s
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Response interceptor to directly unpack data
    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        logger_error(error)
        return Promise.reject(error)
      }
    )
  }

  // Dashboard endpoints
  getDashboardMetrics() {
    return this.api.get('/api/dashboard/metrics')
  }

  getErrorRateData(timeRange: string) {
    return this.api.get(`/api/dashboard/error-rate?timeRange=${timeRange}`)
  }

  // Explorer endpoints
  getLogs(filters: LogFilters) {
    return this.api.post('/api/logs/search', filters)
  }

  getLogDetail(logId: string) {
    return this.api.get(`/api/logs/${logId}`)
  }

  // Chat endpoints
  sendChatMessage(message: string) {
    return this.api.post('/api/chat/message', { message })
  }

  // Settings endpoints
  getSettings() {
    return this.api.get('/api/settings')
  }

  updateSettings(settings: any) {
    return this.api.put('/api/settings', settings)
  }

  // Test connections endpoint
  testConnections() {
    return this.api.post('/api/test-connection')
  }
}

function logger_error(error: any) {
  console.error('API Error Response:', error.response?.data || error.message)
}

export const apiService = new APIService()
export default apiService
