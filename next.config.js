/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['jotai-devtools'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'buqeowpqufayojbitiqp.supabase.co',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
};

module.exports = nextConfig;
