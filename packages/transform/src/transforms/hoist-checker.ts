import { isIdentifier } from "@babel/types"
import { createError } from "@useflytrap/logs-shared"
import { Err, Ok } from "ts-results"
import { traverse } from "../import-utils"
import { parse } from "@babel/parser"

export function hoistChecker(code: string, filenamePath: string) {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript"], // assuming TypeScript code
  })

  type DefinitionLocation = {
    name: string
    index: number
    line?: number
  }

  const variablesReferenced: DefinitionLocation[] = []
  const variablesDefined: DefinitionLocation[] = []

  traverse(ast, {
    VariableDeclarator(path) {
      if (isIdentifier(path.node.id)) {
        variablesDefined.push({
          name: path.node.id.name,
          index: path.node.start ?? -1,
          line: path.node.loc?.start.line,
        })
      }
    },

    Identifier(path) {
      const name = path.node.name

      variablesReferenced.push({
        name,
        index: path.node.start ?? -1,
        line: path.node.loc?.start.line,
      })
    },
  })

  for (let i = 0; i < variablesDefined.length; i++) {
    const referencedVariablesWithLargerIndex = variablesReferenced.filter(
      (variable) =>
        variable.name === variablesDefined[i].name &&
        variable.index < variablesDefined[i].index
    )

    if (referencedVariablesWithLargerIndex.length > 0) {
      return Err(
        createError({
          events: ["transform_failed"],
          explanations: ["hoisting_error"],
          solutions: ["hoisting_fix_move_function_def", "request_hoisting_fix"],
          params: {
            filenamePath,
            functionName: variablesDefined[i].name,
            definitionLine: String(variablesDefined[i].line),
            lineNumber: String(referencedVariablesWithLargerIndex[0].line),
          },
        })
      )
    }
  }

  return Ok(undefined)
}
