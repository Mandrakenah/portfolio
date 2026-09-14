import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  images: { qualities: [60, 75, 90] },
}

export default nextConfig
