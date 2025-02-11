/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed static export mode to enable dynamic functionality.
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
