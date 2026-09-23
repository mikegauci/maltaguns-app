const { withBotId } = require('botid/next/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/cookies',
        destination: '/cookie-policy',
        permanent: true,
      },
      {
        source: '/establishments/store/:slug',
        destination: '/establishments/stores/:slug',
        permanent: true,
      },
      {
        source: '/establishments/club/:slug',
        destination: '/establishments/clubs/:slug',
        permanent: true,
      },
      {
        source: '/establishments/range/:slug',
        destination: '/establishments/ranges/:slug',
        permanent: true,
      },
    ]
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@tanstack/react-table',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'buqeowpqufayojbitiqp.supabase.co',
      },
    ],
  },
  serverExternalPackages: ['sharp'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        bufferutil: 'bufferutil',
        'utf-8-validate': 'utf-8-validate',
      })
    }
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Critical dependency/,
      },
    ]
    return config
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === '1',
})

module.exports = withBundleAnalyzer(withBotId(nextConfig))
