import { isIdentifier } from "@babel/types"
import { createError } from "@useflytrap/logs-shared"
import { Err, Ok } from "ts-results"
import { traverse } from "../import-utils"
import { parse } from "@babel/parser"

export function hoistChecker(code: string, filenamePath: string) {
  const functionDefinitions = new Map()
  const usedBeforeDefined: {
    functionName: string
    lineNumber: string
  }[] = []

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript"], // assuming TypeScript code
  })

  traverse(ast, {
    VariableDeclarator(path) {
      if (isIdentifier(path.node.id)) {
        functionDefinitions.set(path.node.id.name, path.node.loc?.start.line)
      }
    },

    Identifier(path) {
      if (path.parent.type === "CallExpression") {
        if (
          ["catchUncaughtAction", "catchUncaughtRoute"].includes(path.node.name)
        ) {
          return
        }
        if (!functionDefinitions.has(path.node.name)) {
          usedBeforeDefined.push({
            functionName: path.node.name,
            lineNumber: String(path.node.loc?.start.line),
          })
        }
      }
    },
  })

  if (usedBeforeDefined.length !== 0) {
    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["hoisting_error"],
        solutions: ["hoisting_fix_move_function_def", "request_hoisting_fix"],
        params: {
          filenamePath,
          functionName: usedBeforeDefined[0].functionName,
          definitionLine: String(
            functionDefinitions.get(usedBeforeDefined[0].functionName)
          ),
          lineNumber: usedBeforeDefined[0].lineNumber,
        },
      })
    )
  }

  return Ok(undefined)
}
