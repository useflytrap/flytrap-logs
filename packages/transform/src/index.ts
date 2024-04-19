import type { UnpluginFactory } from "unplugin"
import { createUnplugin } from "unplugin"
import type { LogsPluginOptions } from "./types"

import { parse } from "@babel/parser"
import traverse from "@babel/traverse"
import generate from "@babel/generator"
import { transformResponse } from "./transforms/response"
import { transformRequest } from "./transforms/request"

export const unpluginFactory: UnpluginFactory<LogsPluginOptions | undefined> = (
  options
) => ({
  name: "flytrap-logs-transform",
  transformInclude(id) {
    // Only Route Handlers
    // Server Actions

    if (id.endsWith(".d.ts")) return false
    if (id.match(/\.((c|m)?j|t)sx?$/g)) return true
    return false
  },
  transform(code) {
    if (code.includes("@flytrap-ignore")) return code

    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript"], // assuming TypeScript code
    })

    // Traverse the AST and transform
    traverse(ast, {
      CallExpression(path) {
        transformResponse(path, options)
        transformRequest(path, options)
      },
    })

    return generate(ast, {}, code)
  },
})

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export * from "./exports"
