import { LogsPluginOptions } from "../types"
import {
  isMemberExpression,
  isIdentifier,
  callExpression,
  identifier,
  CallExpression,
  isReturnStatement,
  objectExpression,
  objectProperty,
  expressionStatement,
  NewExpression,
  Expression,
} from "@babel/types"
import { NodePath } from "@babel/traverse"

export function transformResponseInstance(
  path: NodePath<NewExpression>,
  options: LogsPluginOptions = {}
) {
  if (
    options.response?.classInstance !== false &&
    isIdentifier(path.node.callee, { name: "Response" }) &&
    path.node.arguments.length >= 1
  ) {
    // Create the `addContext` call expression
    const responseArg = path.node.arguments[0]

    const addContextCall = expressionStatement(
      callExpression(identifier("addContext"), [
        objectExpression([
          objectProperty(identifier("res"), responseArg as Expression),
        ]),
      ])
    )

    // Insert the `addContext` call before the `new Response` depending on context
    if (isReturnStatement(path.parent)) {
      // Add before the return statement
      path.parentPath.insertBefore(addContextCall)
    } else {
      // Insert directly before this statement
      path.insertBefore(addContextCall)
    }
  }
}

export function transformResponse(
  path: NodePath<CallExpression>,
  options: LogsPluginOptions = {}
) {
  // `Response.json`
  if (
    options.response?.json !== false &&
    isMemberExpression(path.node.callee) &&
    isIdentifier(path.node.callee.object, { name: "Response" }) &&
    isIdentifier(path.node.callee.property, { name: "json" })
  ) {
    // Ensure 'Response' is the global Web API Response object
    let currentScope = path.scope
    let isShadowed = false

    // Traverse up the scope chain to check if 'Response' is redefined
    while (currentScope) {
      if (currentScope.hasOwnBinding("Response")) {
        isShadowed = true
        break
      }
      currentScope = currentScope.parent
    }

    if (isShadowed === false) {
      // Replace `Response.json()` with `json()`
      path.replaceWith(callExpression(identifier("json"), path.node.arguments))
    }
  }

  // `Response.redirect`
  if (
    options.response?.redirect !== false &&
    isMemberExpression(path.node.callee) &&
    isIdentifier(path.node.callee.object, { name: "Response" }) &&
    isIdentifier(path.node.callee.property, { name: "redirect" })
  ) {
    // Ensure 'Response' is the global Web API Response object
    let currentScope = path.scope
    let isShadowed = false

    // Traverse up the scope chain to check if 'Response' is redefined
    while (currentScope) {
      if (currentScope.hasOwnBinding("Response")) {
        isShadowed = true
        break
      }
      currentScope = currentScope.parent
    }

    if (isShadowed === false) {
      // Replace `Response.redirect()` with `redirect()`
      path.replaceWith(
        callExpression(identifier("redirect"), path.node.arguments)
      )
    }
  }
}
