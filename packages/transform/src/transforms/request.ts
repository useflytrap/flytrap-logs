import { LogsPluginOptions } from "../types"
import {
  isMemberExpression,
  isIdentifier,
  callExpression,
  identifier,
  CallExpression,
} from "@babel/types"
import { NodePath } from "@babel/traverse"

export function transformRequest(
  path: NodePath<CallExpression>,
  options: LogsPluginOptions = {}
) {
  // `Request.json`
  if (
    options.request?.json !== false &&
    isMemberExpression(path.node.callee) &&
    isIdentifier(path.node.callee.property, { name: "json" }) &&
    path.node.arguments.length === 0
  ) {
    // Create the `parseJson(x)` call expression
    const newCall = callExpression(
      identifier("parseJson"),
      [path.node.callee.object] // `x` in `x.json()`
    )

    // Replace `x.json()` with `parseJson(x)`
    path.replaceWith(newCall)
  }

  // `Request.text`
  if (
    options.request?.text !== false &&
    isMemberExpression(path.node.callee) &&
    isIdentifier(path.node.callee.property, { name: "text" }) &&
    path.node.arguments.length === 0
  ) {
    // Create the `parseText(x)` call expression
    const newCall = callExpression(
      identifier("parseText"),
      [path.node.callee.object] // `x` in `x.text()`
    )

    // Replace `x.text()` with `parseText(x)`
    path.replaceWith(newCall)
  }

  // `Request.formData`
  if (
    options.request?.formData !== false &&
    isMemberExpression(path.node.callee) &&
    isIdentifier(path.node.callee.property, { name: "formData" }) &&
    path.node.arguments.length === 0
  ) {
    // Create the `formData(x)` call expression
    const newCall = callExpression(
      identifier("parseFormData"),
      [path.node.callee.object] // `x` in `x.formData()`
    )

    // Replace `x.formData()` with `parseFormData(x)`
    path.replaceWith(newCall)
  }
}
