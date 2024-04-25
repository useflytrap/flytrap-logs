import { LogsPluginOptions } from "../types"
import {
  isMemberExpression,
  isIdentifier,
  callExpression,
  identifier,
  CallExpression,
  Program,
  isExpressionStatement,
  isStringLiteral,
  stringLiteral,
  objectProperty,
  objectExpression,
  FunctionExpression,
  FunctionDeclaration,
  functionExpression,
  variableDeclaration,
  variableDeclarator,
  isArrowFunctionExpression,
  isFunctionExpression,
  VariableDeclaration,
  isDirective,
  isDirectiveLiteral,
} from "@babel/types"
import type { NodePath } from "@babel/traverse"

function hasServerDirective(
  path: NodePath<FunctionDeclaration | VariableDeclaration>
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
  funcNode: FunctionExpression,
  name: string
) {
  return callExpression(identifier("catchUncaughtAction"), [
    funcNode,
    objectExpression([
      objectProperty(
        identifier("path"),
        stringLiteral(`@/lib/actions/${name}`)
      ),
    ]),
  ])
}

export function transformFunctionDeclaration(
  path: NodePath<FunctionDeclaration>,
  options: LogsPluginOptions = {}
) {
  if (hasServerDirective(path) === false) return

  if (options.next?.serverActions !== false) {
    const funcNode = functionExpression(
      path.node.id,
      path.node.params,
      path.node.body,
      path.node.generator,
      path.node.async
    )
    const wrapper = createCatchUncaughtAction(funcNode, path.node.id.name)

    // if ()
    /* if (path.parentPath.isExportNamedDeclaration()) {
      console.log(" IS ANMED AD D_- - - -- - -- - -- - -");
      path.parentPath.node.declaration = wrapper
      return
      // return path.replaceWith(wrapper)
    } */

    path.replaceWith(
      variableDeclaration("const", [
        variableDeclarator(identifier(path.node.id.name), wrapper),
      ])
    )
  }
}

export function transformVariableDeclaration(
  path: NodePath<VariableDeclaration>,
  options: LogsPluginOptions = {}
) {
  if (hasServerDirective(path) === false) return

  if (options.next?.serverActions !== false) {
    path.node.declarations.forEach((declaration) => {
      if (
        isFunctionExpression(declaration.init) ||
        isArrowFunctionExpression(declaration.init)
      ) {
        const wrapper = createCatchUncaughtAction(
          declaration.init,
          declaration.id.name
        )
        declaration.init = wrapper
      }
    })
  }
}
