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

import {
  transformFunctionDeclaration,
  transformFunctions,
} from "./transforms/server-actions"

export const DEFAULT_ROUTE_HANDLER_PATHS = [
  "app/**/*.(t|j)s",
  "src/app/**/*.(t|j)s",
]
export const DEFAULT_SERVER_ACTIONS_PATHS = [
  "lib/actions/**/*.(t|j)s",
  "src/lib/actions/**/*.(t|j)s",
  "lib/actions.(t|j)s",
  "src/lib/actions.(t|j)s",
]

import { findExports } from "mlly"

export const unpluginFactory: UnpluginFactory<LogsPluginOptions | undefined> = (
  options
) => ({
  name: "flytrap-logs-transform",
  transformInclude(id) {
    // @note: we should match almost everything, and transform almost evertyhign
    // but do the route transforms and actions transforms only after confirming from AST that the file is
    // A route handler file or a server action

    /* console.log("transformInclude CWD:  ", cwd())
    const allowedRoutes = [
      ...options?.next?.routeHandlerPaths ?? DEFAULT_ROUTE_HANDLER_PATHS,
      ...options?.next?.serverActionsPaths ?? DEFAULT_SERVER_ACTIONS_PATHS
    ]
    console.log("allowed routes .")

    let isMatched = false

    // we shou

    for (let i = 0; i < allowedRoutes.length; i++) {
      const isMatch = picomatch(allowedRoutes[i])
      if (isMatch(id)) {
        isMatched = true
      }
    }

    return isMatched;

    /* if (isMatched === false) {
      return false
    } */

    // if (options?.next.server)
    // Server Actions

    if (id.endsWith(".d.ts")) return false
    if (id.match(/\.((c|m)?j|t)sx?$/g)) return true
    return false
  },
  transform(code, id) {
    if (code.includes("@flytrap-ignore")) return code

    // @todo: this logic shouldn't be here
    // Exports
    const exports = findExports(code)
    const exportNames = exports
      .map((e) => {
        if (e.name !== "default") return e.name
        if (e.defaultName) return e.defaultName

        if (e.code.includes("function")) {
          const nextOpenParenIndex = code.substring(e.end).indexOf("(")
          return code.substring(e.end, e.end + nextOpenParenIndex).trim()
        }
        return undefined
      })
      .filter(Boolean) as string[]

    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript"], // assuming TypeScript code
    })

    // Traverse the AST and transform
    traverse(ast, {
      // Server Actions
      FunctionDeclaration(path) {
        transformFunctionDeclaration(path, exportNames, id, options).unwrap()
      },

      ArrowFunctionExpression(path) {
        transformFunctions(path, exportNames, id, options).unwrap()
      },

      FunctionExpression(path) {
        transformFunctions(path, exportNames, id, options).unwrap()
      },

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
