import type { UnpluginFactory } from "unplugin"
import { createUnplugin } from "unplugin"
import type { LogsPluginOptions } from "./types"

import { parse } from "@babel/parser"
import {
  transformResponse,
  transformResponseInstance,
} from "./transforms/response"
import { transformRequest } from "./transforms/request"
import { generate, traverse } from "./import-utils"

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
        // `Response.(json | text | redirect)`
        transformResponse(path, {
          ...options,
          response: {
            ...options?.response,
            ensureGlobalResponse:
              options?.response?.ensureGlobalResponse ?? true,
          },
        })
        // `NextResponse.(json | text | redirect)`
        transformResponse(path, {
          ...options,
          response: {
            json: options?.next?.nextResponse?.json ?? "nextJson",
            redirect: options?.next?.nextResponse?.redirect ?? "nextRedirect",
            classInstanceName: "NextResponse",
          },
        })

        transformRequest(path, options)
      },
      NewExpression(path) {
        // `new Response(...)`
        transformResponseInstance(path, {
          ...options,
          response: {
            ...options?.response,
            ensureGlobalResponse:
              options?.response?.ensureGlobalResponse ?? true,
          },
        })
        // `new NextResponse(...)`
        if (options?.next?.nextResponse?.classInstance !== false) {
          transformResponseInstance(path, {
            ...options,
            response: {
              json: options?.next?.nextResponse?.json ?? "nextJson",
              classInstance:
                options?.next?.nextResponse?.classInstance ?? "nextResponse",
              classInstanceName:
                options?.next?.nextResponse?.classInstanceName ??
                "NextResponse",
            },
          })
        }
      },
    })

    return generate(ast, {}, code)
  },
})

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)
