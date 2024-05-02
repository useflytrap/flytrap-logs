import type { UnpluginFactory } from "unplugin"
import { createUnplugin } from "unplugin"
import type { LogsPluginOptions } from "./types"
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
import { hoistChecker } from "./transforms/hoist-checker"
import {
  transformRouteFunctionDeclaration,
  transformRouteFunctions,
} from "./transforms/route-handlers"
import { writeDiff } from "./diff"
import { basename } from "path"
import { cwd } from "process"
import { parseCode } from "./parser"
import { addAutoImports } from "./transforms/auto-import"

export const unpluginFactory: UnpluginFactory<LogsPluginOptions | undefined> = (
  options
) => ({
  name: "flytrap-logs-transform",
  enforce: "pre",
  transformInclude(id) {
    if (id.includes("/node_modules/")) return false
    if (id.endsWith(".d.ts")) return false
    if (id.match(/\.((c|m)?j|t)sx?$/g)) return true
    return false
  },
  transform(code, id) {
    if (code.includes("@flytrap-ignore")) return code

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
    const ast = parseCode(code, id, options?.babel?.parserOptions).unwrap()

    // Traverse the AST and transform
    traverse(ast, {
      // Server Actions
      FunctionDeclaration(path) {
        transformFunctionDeclaration(path, exportNames, id, options).unwrap()
        transformRouteFunctionDeclaration(path, id, options).unwrap()
      },

      ArrowFunctionExpression(path) {
        transformFunctions(path, exportNames, id, options).unwrap()
        transformRouteFunctions(path, id, options).unwrap()
      },

      FunctionExpression(path) {
        transformFunctions(path, exportNames, id, options).unwrap()
        transformRouteFunctions(path, id, options).unwrap()
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

    const generatedCode = generate(ast, {}, code)

    // Hoist checker
    hoistChecker(generatedCode.code, id).unwrap()

    // Write diffs
    if (options?.diffs !== false) {
      writeDiff(
        options?.packageJsonDirPath ?? cwd(),
        basename(id),
        code,
        generatedCode.code
      ).unwrap()
    }

    // Add imports
    if (options?.autoImports !== false) {
      return addAutoImports(generatedCode.code, id, options).unwrap()
    }

    return generatedCode
  },
})

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)
