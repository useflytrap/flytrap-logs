import { LogsPluginOptions } from "../types"
import {
  isIdentifier,
  callExpression,
  identifier,
  stringLiteral,
  objectProperty,
  objectExpression,
  FunctionExpression,
  FunctionDeclaration,
  functionExpression,
  variableDeclaration,
  variableDeclarator,
  isExportDefaultDeclaration,
  ArrowFunctionExpression,
  isVariableDeclarator,
  exportDefaultDeclaration,
} from "@babel/types"
import type { NodePath } from "@babel/traverse"
import { Err, Ok } from "ts-results"
import { createError } from "@useflytrap/logs-shared"
import { generate } from "../import-utils"
import { filePathRelativeToPackageJsonDir } from "../path-utils"
import { cwd } from "process"
import { getCoreFunctionImportMap } from "./auto-import"
import { basename } from "path"

const ROUTE_HANDLER_REGEXP = /route\.(t|j)sx?/

const ROUTE_HANDLER_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]

export function createCatchUncaughtRoute(
  funcNode: ArrowFunctionExpression | FunctionExpression,
  name: string,
  method: string,
  filepath: string,
  options: LogsPluginOptions
) {
  const { catchUncaughtRoute } = getCoreFunctionImportMap(options)
  return callExpression(identifier(catchUncaughtRoute), [
    funcNode,
    objectExpression([
      objectProperty(
        identifier("path"),
        stringLiteral(
          filePathRelativeToPackageJsonDir(
            filepath,
            options.packageJsonDirPath ?? cwd()
          )
        )
      ),
      objectProperty(identifier("method"), stringLiteral(method)),
    ]),
  ])
}

// @todo: fix this super naive check
function checkUnallowedSyntax(code: string, filePath: string) {
  if (code.includes("this.")) {
    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["disallowed_syntax_found"],
        solutions: ["ignore_disallowed_syntax"],
        params: {
          filePath,
          syntax: "this.",
        },
      })
    )
  }
  if (code.includes("arguments[")) {
    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["disallowed_syntax_found"],
        solutions: ["ignore_disallowed_syntax"],
        params: {
          filePath,
          syntax: "arguments[",
        },
      })
    )
  }
  return Ok(undefined)
}

export function transformRouteFunctions(
  path: NodePath<ArrowFunctionExpression | FunctionExpression>,
  filepath: string,
  options: LogsPluginOptions = {}
) {
  if (
    options.next?.routeHandlers !== false &&
    ["ArrowFunctionExpression", "FunctionExpression"].includes(
      path.node.type
    ) &&
    ROUTE_HANDLER_REGEXP.test(basename(filepath))
  ) {
    if (isVariableDeclarator(path.parent)) {
      const name = isIdentifier(path.parent.id)
        ? path.parent.id.name
        : undefined

      if (name && ROUTE_HANDLER_METHODS.includes(name)) {
        // Check for unallowed syntax
        const unallowedSyntax = checkUnallowedSyntax(
          generate(path.node).code,
          filepath
        )
        if (unallowedSyntax.err) {
          return unallowedSyntax
        }

        const wrapper = createCatchUncaughtRoute(
          path.node,
          name,
          name,
          filepath,
          options
        )
        path.replaceWith(wrapper)
      }
    }
  }
  return Ok(undefined)
}

export function transformRouteFunctionDeclaration(
  path: NodePath<FunctionDeclaration>,
  filepath: string,
  options: LogsPluginOptions = {}
) {
  if (
    options.next?.serverActions !== false &&
    path.node.type === "FunctionDeclaration" &&
    ROUTE_HANDLER_REGEXP.test(basename(filepath))
  ) {
    if (!path.node.id) {
      // @todo: replace with human-friendly error
      throw new Error(`Path node ID is null.`)
    }

    if (ROUTE_HANDLER_METHODS.includes(path.node.id.name)) {
      // Check for unallowed syntax
      const unallowedSyntax = checkUnallowedSyntax(
        generate(path.node).code,
        filepath
      )
      if (unallowedSyntax.err) {
        return unallowedSyntax
      }

      const funcNode = functionExpression(
        path.node.id,
        path.node.params,
        path.node.body,
        path.node.generator,
        path.node.async
      )
      const wrapper = createCatchUncaughtRoute(
        funcNode,
        path.node.id.name,
        path.node.id.name,
        filepath,
        options
      )

      if (isExportDefaultDeclaration(path.parent)) {
        path.parentPath.replaceWith(
          variableDeclaration("const", [
            variableDeclarator(identifier(path.node.id.name), wrapper),
          ])
        )
        // Add export default for the new const variable
        path.parentPath.insertAfter(
          exportDefaultDeclaration(identifier(path.node.id.name))
        )
        return Ok(undefined)
      }

      path.replaceWith(
        variableDeclaration("const", [
          variableDeclarator(identifier(path.node.id.name), wrapper),
        ])
      )
    }
  }

  return Ok(undefined)
}
