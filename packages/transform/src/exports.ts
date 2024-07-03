// Exports for bundlers & frameworks
import {
  createEsbuildPlugin,
  createFarmPlugin,
  createRolldownPlugin,
  createRollupPlugin,
  createRspackPlugin,
  createVitePlugin,
  createWebpackPlugin,
} from "unplugin"
import { unpluginFactory } from "./index"
import type { LogsPluginOptions } from "./types"

export * from "./index"

export const rollup = createRollupPlugin(unpluginFactory)
export const vite = createVitePlugin(unpluginFactory)
export const webpack = createWebpackPlugin(unpluginFactory)
export const esbuild = createEsbuildPlugin(unpluginFactory)
export const farm = createFarmPlugin(unpluginFactory)

// Experimental
export const rolldown = createRolldownPlugin(unpluginFactory)
export const rspack = createRspackPlugin(unpluginFactory)

// Helper export for Next.js
export const nextjs = (options: LogsPluginOptions) => {
  return (config: any) => {
    config.plugins = config.plugins ?? []
    // This is here to disable the annoying logs from webpack
    config.infrastructureLogging = { level: "error" }
    config.plugins.push(webpack(options))
    return config
  }
}
