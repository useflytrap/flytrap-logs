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
  isDirective,
  isDirectiveLiteral,
  isExportDefaultDeclaration,
  ArrowFunctionExpression,
  isVariableDeclarator,
  exportDefaultDeclaration,
  File,
} from "@babel/types"
import type { NodePath } from "@babel/traverse"
import { Err, Ok } from "ts-results"
import { createError } from "@useflytrap/logs-shared"
import { generate } from "../import-utils"
import { filePathRelativeToPackageJsonDir } from "../path-utils"
import { cwd } from "process"
import { getCoreFunctionImportMap } from "./auto-import"

function hasServerDirective(
  path: NodePath<
    ArrowFunctionExpression | FunctionExpression | FunctionDeclaration
  >
) {
  return (
    path.findParent((p) => p.isProgram()) as NodePath<Program> | undefined
  )?.node.directives.some(
    (directive) =>
      isDirective(directive) &&
      isDirectiveLiteral(directive.value) &&
      directive.value.value === "use server"
  )
}

export function createCatchUncaughtAction(
  funcNode: ArrowFunctionExpression | FunctionExpression,
  name: string,
  filepath: string,
  options: LogsPluginOptions
) {
  const { catchUncaughtAction } = getCoreFunctionImportMap(options)
  return callExpression(identifier(catchUncaughtAction), [
    funcNode,
    objectExpression([
      objectProperty(
        identifier("path"),
        stringLiteral(
          `${filePathRelativeToPackageJsonDir(
            filepath,
            options.packageJsonDirPath ?? cwd()
          )}/${name}`
        )
      ),
    ]),
  ])
}

// @todo: fix this super naive check
// @todo: remove code duplication
export function checkUnallowedSyntax(code: string, filePath: string) {
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

export function transformFunctions(
  path: NodePath<ArrowFunctionExpression | FunctionExpression>,
  exportNames: string[],
  filepath: string,
  options: LogsPluginOptions = {}
) {
  if (
    options.next?.serverActions !== false &&
    ["ArrowFunctionExpression", "FunctionExpression"].includes(
      path.node.type
    ) &&
    hasServerDirective(path)
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

        const wrapper = createCatchUncaughtAction(
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

export function transformFunctionDeclaration(
  path: NodePath<FunctionDeclaration>,
  exportNames: string[],
  filepath: string,
  options: LogsPluginOptions = {}
) {
  if (
    options.next?.serverActions !== false &&
    path.node.type === "FunctionDeclaration" &&
    hasServerDirective(path)
  ) {
    if (!path.node.id) {
      // @todo: replace with human-friendly error
      throw new Error(`Path node ID is null.`)
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
      const wrapper = createCatchUncaughtAction(
        funcNode,
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
