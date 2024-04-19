import { LogsPluginOptions } from "../types"
import {
  isMemberExpression,
  isIdentifier,
  callExpression,
  identifier,
  CallExpression,
} from "@babel/types"
import { NodePath } from "@babel/traverse"

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
