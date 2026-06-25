import axios, { AxiosInstance, AxiosError } from 'axios'

interface RetryConfig {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
}

class APIServiceAdvanced {
  private api: AxiosInstance
  private retryConfig: RetryConfig

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }

    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: 30000,
    })

    // Add retry interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config
        if (!config) return Promise.reject(error)

        // @ts-ignore - Add retry count to config
        config.retryCount = config.retryCount || 0

        // Retry on network errors and 5xx responses
        const shouldRetry =
          error.message === 'Network Error' ||
          (error.response?.status ?? 0) >= 500

        // @ts-ignore
        if (shouldRetry && config.retryCount < this.retryConfig.maxRetries) {
          // @ts-ignore
          config.retryCount += 1

          const delay =
            this.retryConfig.retryDelay *
            Math.pow(
              this.retryConfig.backoffMultiplier,
              // @ts-ignore
              config.retryCount - 1
            )

          await new Promise((resolve) => setTimeout(resolve, delay))
          return this.api(config)
        }

        return Promise.reject(error)
      }
    )
  }

  get(url: string, config?: any) {
    return this.api.get(url, config)
  }

  post(url: string, data?: any, config?: any) {
    return this.api.post(url, data, config)
  }

  put(url: string, data?: any, config?: any) {
    return this.api.put(url, data, config)
  }

  delete(url: string, config?: any) {
    return this.api.delete(url, config)
  }
}

export const apiServiceAdvanced = new APIServiceAdvanced()
export default apiServiceAdvanced
