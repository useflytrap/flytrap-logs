import { LogsPluginOptions } from "../types"
import {
  isIdentifier,
  callExpression,
  identifier,
  Program,
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
  File,
} from "@babel/types"
import type { NodePath } from "@babel/traverse"
import { Err, Ok } from "ts-results"
import { generate, traverse } from "../import-utils"
import { filePathRelativeToPackageJsonDir } from "../path-utils"
import { cwd } from "process"
import { getCoreFunctionImportMap } from "./auto-import"
import { checkUnallowedSyntax } from "./server-actions"

function filePathToNextjsRoute(relativeFilePath: string) {
  const parts = relativeFilePath.split("/")

  return (
    "/" +
    parts
      .map((part) => {
        if (part === "app") return
        if (/page\.(t|j)sx?/.test(part)) return
        return part
      })
      .filter(Boolean)
      .join("/")
  )
}

export function createCatchUncaughtPage(
  funcNode: ArrowFunctionExpression | FunctionExpression,
  name: string,
  filepath: string,
  options: LogsPluginOptions
) {
  const { catchUncaughtPage } = getCoreFunctionImportMap(options)

  return callExpression(identifier(catchUncaughtPage), [
    funcNode,
    objectExpression([
      objectProperty(
        identifier("path"),
        stringLiteral(
          filePathToNextjsRoute(
            filePathRelativeToPackageJsonDir(
              filepath,
              options.packageJsonDirPath ?? cwd()
            )
          )
        )
      ),
    ]),
  ])
}

export function transformPageFunctions(
  path: NodePath<ArrowFunctionExpression | FunctionExpression>,
  exportNames: string[],
  filepath: string,
  options: LogsPluginOptions = {}
) {
  if (
    options.next?.pages !== false &&
    ["ArrowFunctionExpression", "FunctionExpression"].includes(path.node.type)
  ) {
    if (isVariableDeclarator(path.parent)) {
      const name = isIdentifier(path.parent.id)
        ? path.parent.id.name
        : undefined

      if (name && exportNames.includes(name)) {
        // Check for unallowed syntax
        const unallowedSyntax = checkUnallowedSyntax(
          generate(path.node).code,
          filepath
        )
        if (unallowedSyntax.err) {
          return unallowedSyntax
        }

        const wrapper = createCatchUncaughtPage(
          path.node,
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

export function transformPageFunctionDeclaration(
  path: NodePath<FunctionDeclaration>,
  exportNames: string[],
  filepath: string,
  options: LogsPluginOptions = {}
) {
  if (
    options.next?.pages !== false &&
    path.node.type === "FunctionDeclaration"
  ) {
    if (!path.node.id) {
      // @todo: replace with human-friendly error
      throw new Error(`Path node ID is null.`)
    }

    if (isExportDefaultDeclaration(path.parent)) {
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
      const wrapper = createCatchUncaughtPage(
        funcNode,
        path.node.id.name,
        filepath,
        options
      )

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

    if (exportNames.includes(path.node.id.name)) {
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
      const wrapper = createCatchUncaughtPage(
        funcNode,
        path.node.id.name,
        filepath,
        options
      )

      path.replaceWith(
        variableDeclaration("const", [
          variableDeclarator(identifier(path.node.id.name), wrapper),
        ])
      )
      return Ok(undefined)
    }
  }

  return Ok(undefined)
}
