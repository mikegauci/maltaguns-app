/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/cookies',
        destination: '/cookie-policy',
        permanent: true,
      },
    ]
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
    return config
  },
}

module.exports = nextConfig
