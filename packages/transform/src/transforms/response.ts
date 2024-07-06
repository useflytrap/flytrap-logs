import { LogsPluginOptions } from "../types"
import {
  isMemberExpression,
  isIdentifier,
  callExpression,
  identifier,
  CallExpression,
  NewExpression,
} from "@babel/types"
import type { NodePath } from "@babel/traverse"
import { getCoreFunctionImportMap } from "./auto-import"

export function transformResponseInstance(
  path: NodePath<NewExpression>,
  options: LogsPluginOptions = {}
) {
  if (
    options.response?.classInstance !== false &&
    isIdentifier(path.node.callee, {
      name: options.response?.classInstanceName ?? "Response",
    })
  ) {
    const { response } = getCoreFunctionImportMap(options)
    if (options.response?.ensureGlobalResponse) {
      // Ensure 'Response' is the global Web API Response object
      let currentScope = path.scope
      let isShadowed = false

      // Traverse up the scope chain to check if 'Response' is redefined
      while (currentScope) {
        if (
          currentScope.hasOwnBinding(
            options.response?.classInstanceName ?? "Response"
          )
        ) {
          isShadowed = true
          break
        }
        currentScope = currentScope.parent
      }

      if (isShadowed === false) {
        // Replace `new Response(...)` with `response(...)`
        path.replaceWith(
          callExpression(identifier(response), path.node.arguments)
        )
      }
    } else {
      // Replace `new Response(...)` with `response(...)`
      path.replaceWith(
        callExpression(identifier(response), path.node.arguments)
      )
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
    isIdentifier(path.node.callee.object, {
      name: options.response?.classInstanceName ?? "Response",
    }) &&
    isIdentifier(path.node.callee.property, { name: "json" })
  ) {
    const { json } = getCoreFunctionImportMap(options)
    if (options.response?.ensureGlobalResponse) {
      // Ensure 'Response' is the global Web API Response object
      let currentScope = path.scope
      let isShadowed = false

      // Traverse up the scope chain to check if 'Response' is redefined
      while (currentScope) {
        if (
          currentScope.hasOwnBinding(
            options.response?.classInstanceName ?? "Response"
          )
        ) {
          isShadowed = true
          break
        }
        currentScope = currentScope.parent
      }

      if (isShadowed === false) {
        // Replace `Response.json()` with `json()`
        path.replaceWith(callExpression(identifier(json), path.node.arguments))
      }
    } else {
      path.replaceWith(callExpression(identifier(json), path.node.arguments))
    }
  }

  // `Response.redirect`
  if (
    options.response?.redirect !== false &&
    isMemberExpression(path.node.callee) &&
    isIdentifier(path.node.callee.object, {
      name: options.response?.classInstanceName ?? "Response",
    }) &&
    isIdentifier(path.node.callee.property, { name: "redirect" })
  ) {
    const { redirect } = getCoreFunctionImportMap(options)
    if (options.response?.ensureGlobalResponse) {
      // Ensure 'Response' is the global Web API Response object
      let currentScope = path.scope
      let isShadowed = false

      // Traverse up the scope chain to check if 'Response' is redefined
      while (currentScope) {
        if (
          currentScope.hasOwnBinding(
            options.response?.classInstanceName ?? "Response"
          )
        ) {
          isShadowed = true
          break
        }
        currentScope = currentScope.parent
      }

      if (isShadowed === false) {
        // Replace `Response.redirect()` with `redirect()`
        path.replaceWith(
          callExpression(identifier(redirect), path.node.arguments)
        )
      }
    } else {
      path.replaceWith(
        callExpression(identifier(redirect), path.node.arguments)
      )
    }
  }
}
