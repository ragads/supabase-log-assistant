/** @type {import('next').NextConfig} */
const config = {
  // Image optimization settings
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables accessible on the client
  env: {
    APP_NAME: 'Supabase Log AI Assistant',
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Redirect root path to dashboard
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ]
  },

  // Proxy API requests to the Python FastAPI backend
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },

  // Skip ESLint errors during production build (Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript type errors during production build (Vercel)
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default config
