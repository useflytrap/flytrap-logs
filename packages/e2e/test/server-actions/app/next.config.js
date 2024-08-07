import { webpack } from "@useflytrap/logs-transform"

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.plugins = config.plugins ?? []
    config.infrastructureLogging = { level: "error" }

    config.plugins.push(
      webpack({
        next: {
          serverActionsPaths: ["./lib/actions.js"],
        },
      })
    )
    return config
  },
}

export default nextConfig
