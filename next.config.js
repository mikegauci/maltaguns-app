/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export mode to allow dynamic API routes.
  // output: "export",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
