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

export const rollup = createRollupPlugin(unpluginFactory)
export const vite = createVitePlugin(unpluginFactory)
export const webpack = createWebpackPlugin(unpluginFactory)
export const esbuild = createEsbuildPlugin(unpluginFactory)
export const farm = createFarmPlugin(unpluginFactory)

// Experimental
export const rolldown = createRolldownPlugin(unpluginFactory)
export const rspack = createRspackPlugin(unpluginFactory)
