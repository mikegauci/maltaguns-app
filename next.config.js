/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { appDir: true },
  output: "standalone", 
  trailingSlash: true,
};

module.exports = nextConfig;
