import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
}

export default nextConfig
