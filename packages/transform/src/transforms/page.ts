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
  File,
  Identifier,
} from "@babel/types"
import type { NodePath } from "@babel/traverse"
import { Ok } from "ts-results"
import { generate, traverse } from "../import-utils"
import { filePathRelativeToPackageJsonDir } from "../path-utils"
import { cwd } from "process"
import { getCoreFunctionImportMap } from "./auto-import"
import { checkUnallowedSyntax } from "./server-actions"
import { basename } from "path"
import { ParseResult } from "@babel/parser"

const PAGE_FILE_REGEXP = /page\.(t|j)sx?/

export function astHasClientDirective(ast: ParseResult<File>) {
  let hasClientDirective = false
  traverse(ast, {
    Directive(path) {
      if (path.node.value.value === "use client") {
        hasClientDirective = true
      }
    },
  })
  return hasClientDirective
}

function filePathToNextjsRoute(relativeFilePath: string) {
  const parts = relativeFilePath.split("/")

  return (
    "/" +
    parts
      .map((part) => {
        if (part.at(0) === "(" && part.at(-1) === ")") return
        if (part === "app") return
        if (PAGE_FILE_REGEXP.test(part)) return
        return part
      })
      .filter(Boolean)
      .join("/")
  )
}

export function createCatchUncaughtPage(
  funcNode: ArrowFunctionExpression | FunctionExpression,
  name: string,
  params: Identifier | undefined,
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
      ...(params
        ? [objectProperty(identifier("params"), identifier(params.name))]
        : []),
    ]),
  ])
}

export function transformPageFunctions(
  path: NodePath<ArrowFunctionExpression | FunctionExpression>,
  defaultExportNames: string[],
  filepath: string,
  ast: ParseResult<File>,
  options: LogsPluginOptions = {}
) {
  if (
    options.next?.pages !== false &&
    ["ArrowFunctionExpression", "FunctionExpression"].includes(
      path.node.type
    ) &&
    PAGE_FILE_REGEXP.test(basename(filepath)) &&
    astHasClientDirective(ast) === false &&
    isVariableDeclarator(path.parent)
  ) {
    const name = isIdentifier(path.parent.id) ? path.parent.id.name : undefined

    const params = isIdentifier(path.node.params[0])
      ? path.node.params[0]
      : undefined

    if (name && defaultExportNames.includes(name)) {
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
        params,
        filepath,
        options
      )
      path.replaceWith(wrapper)
    }
  }
  return Ok(undefined)
}

export function transformPageFunctionDeclaration(
  path: NodePath<FunctionDeclaration>,
  defaultExportNames: string[],
  filepath: string,
  ast: ParseResult<File>,
  options: LogsPluginOptions = {}
) {
  if (
    options.next?.pages !== false &&
    path.node.type === "FunctionDeclaration" &&
    PAGE_FILE_REGEXP.test(basename(filepath)) &&
    astHasClientDirective(ast) === false &&
    (isExportDefaultDeclaration(path.parent) ||
      defaultExportNames.includes(path.node.id?.name ?? ""))
  ) {
    if (!path.node.id) {
      // @todo: replace with human-friendly error
      throw new Error(`Path node ID is null.`)
    }

    // Check for unallowed syntax
    const unallowedSyntax = checkUnallowedSyntax(
      generate(path.node).code,
      filepath
    )
    if (unallowedSyntax.err) {
      return unallowedSyntax
    }

    const params = path.node.params[0] as Identifier | undefined

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
      params,
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

    if (defaultExportNames.includes(path.node.id.name)) {
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
