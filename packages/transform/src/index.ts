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

import picomatch from "picomatch"
import { cwd } from "process"
import {
  createCatchUncaughtAction,
  transformFunctionDeclaration,
  transformVariableDeclaration,
} from "./transforms/server-actions"
import {
  functionExpression,
  identifier,
  isIdentifier,
  isVariableDeclarator,
  variableDeclaration,
  variableDeclarator,
} from "@babel/types"

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

import t from "@babel/types"
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
  transform(code) {
    if (code.includes("@flytrap-ignore")) return code

    // @todo: this logic shouldn't be here
    // Exports
    const exports = findExports(code)
    const exportNames = exports.map((e) => {
      if (e.name !== "default") return e.name
      return code.substring(e.start, e.end).split("default ").at(-1)?.trim()
    })

    // Parse the code into an AST
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript"], // assuming TypeScript code
    })

    // Traverse the AST and transform
    traverse(ast, {
      // Server Actions
      FunctionDeclaration(path) {
        transformFunctionDeclaration(path, options)
      },

      ArrowFunctionExpression(path) {
        console.log(" XAXA ")
        console.log(path.node)

        if (isVariableDeclarator(path.parent)) {
          const name = isIdentifier(path.parent.id)
            ? path.parent.id.name
            : "unknown"
          // Check if it's in exports
          console.log("NAME ", name)
        }
      },

      FunctionExpression(path) {
        // const name
      },

      ExportNamedDeclaration(path) {
        // Check if the declaration is a variable declaration
        if (t.isVariableDeclaration(path.node.declaration)) {
          path.node.declaration.declarations.forEach((declar) => {
            if (
              t.isVariableDeclarator(declar) &&
              t.isArrowFunctionExpression(declar.init)
            ) {
              const variableName = t.isIdentifier(declar.id)
                ? declar.id.name
                : "unknown"
              const catchPath = `@/lib/actions/${variableName}`

              // Wrap the arrow function with catchUncaughtAction
              declar.init = t.callExpression(
                t.identifier("catchUncaughtAction"),
                [
                  declar.init,
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier("path"),
                      t.stringLiteral(catchPath)
                    ),
                  ]),
                ]
              )
            }
          })
        }
      },

      ExportDefaultDeclaration(path) {
        if (t.isFunctionDeclaration(path.node.declaration)) {
          const funcNode = functionExpression(
            path.node.declaration.id,
            path.node.declaration.params,
            path.node.declaration.body,
            path.node.declaration.generator,
            path.node.declaration.async
          )
          path.node.declaration = createCatchUncaughtAction(
            funcNode,
            path.node.declaration.id?.name ?? "anonymous"
          )

          path.replaceWith(path)

          /* const functionName = path.node.declaration.id ? path.node.declaration.id.name : 'unknown';
          const catchPath = `@/lib/actions/${functionName}`; */

          /* path.node.declaration = t.callExpression(t.identifier('catchUncaughtAction'), [
            path.node.declaration,
            t.objectExpression([
              t.objectProperty(t.identifier('path'), t.stringLiteral(catchPath))
            ])
          ]); */
        }
      },

      /* ArrowFunctionExpression(path) {
        console.log("ARROW FUNC PATH ")

        console.log(path.node)

        const funcNode = functionExpression(path.node.id, path.node.params, path.node.body, path.node.generator, path.node.async);
        const wrapper = createCatchUncaughtAction(funcNode, path.node.id?.name ?? "fooBarX");

        path.replaceWith(variableDeclaration('const', [
          variableDeclarator(identifier(path.node.id?.name ?? "fooBARX"), wrapper)
        ]));
        // wrapFunctionExpression(path);
      }, */

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
