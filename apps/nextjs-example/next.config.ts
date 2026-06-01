import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@liquid-ai/renderer'],
  webpack: (config) => {
    // PGlite (used by @liquid-ai/core persistence layer) requires WebAssembly
    // and IndexedDB which are unavailable during Next.js SSR/bundling.
    // The persistence layer is only loaded lazily at runtime in the browser.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@electric-sql/pglite': false,
    }
    return config
  },
}

export default nextConfig
