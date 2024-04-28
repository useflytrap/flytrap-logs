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
} from "@babel/types"
import type { NodePath } from "@babel/traverse"
import { Err, Ok } from "ts-results"
import { createError } from "@useflytrap/logs-shared"
import { generate } from "../import-utils"

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
  filepath: string
) {
  return callExpression(identifier("catchUncaughtAction"), [
    funcNode,
    objectExpression([
      objectProperty(identifier("path"), stringLiteral(`${filepath}/${name}`)),
    ]),
  ])
}

// @todo: fix this super naive check
function checkUnallowedSyntax(code: string, filenamePath: string) {
  if (code.includes("this.")) {
    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["disallowed_syntax_found"],
        solutions: ["ignore_disallowed_syntax"],
        params: {
          filenamePath,
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
          filenamePath,
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
  if (hasServerDirective(path) === false) return Ok(undefined)

  if (
    options.next?.serverActions !== false &&
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

        const wrapper = createCatchUncaughtAction(path.node, name, filepath)
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
  if (hasServerDirective(path) === false) return Ok(undefined)

  if (
    options.next?.serverActions !== false &&
    path.node.type === "FunctionDeclaration"
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
        filepath
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
