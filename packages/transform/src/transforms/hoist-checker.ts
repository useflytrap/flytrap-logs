import {
  functionDeclaration,
  isIdentifier,
  isVariableDeclaration,
} from "@babel/types"
import { createError } from "@useflytrap/logs-shared"
import { Err, Ok } from "ts-results"
import { traverse } from "../import-utils"
import type { ParserOptions } from "@babel/parser"
import { parseCode } from "../parser"
import { DefinitionLocation } from "../types"

export function hoistChecker(
  transformedCode: string,
  filePath: string,
  parserOptions?: ParserOptions
) {
  const ast = parseCode(transformedCode, filePath, parserOptions).unwrap()

  const functionsDefs: DefinitionLocation[] = []

  const hoistingConflicts: {
    name: string
    definition: DefinitionLocation
    access: DefinitionLocation
  }[] = []

  traverse(ast, {
    FunctionDeclaration(path) {
      // @todo: only check exported functions ?
      // @todo: maybe also
      if (
        isIdentifier(path.node.id) &&
        ["ExportNamedDeclaration", "ExportDefaultDeclaration"].includes(
          path.parent.type
        )
      ) {
        functionsDefs.push({
          name: path.node.id.name,
          line: path.node.loc?.start?.line,
          index: path.node.start ?? -1,
        })
      }
    },
  })

  traverse(ast, {
    Identifier(path) {
      const name = path.node.name

      if (path.parent.type === "FunctionDeclaration") return

      const matchingFunctionDefinitions = functionsDefs.filter(
        ({ name: functionName }) => functionName === name
      )
      for (let i = 0; i < matchingFunctionDefinitions.length; i++) {
        if ((path.node.start ?? 0) < matchingFunctionDefinitions[i].index) {
          hoistingConflicts.push({
            name,
            definition: matchingFunctionDefinitions[i],
            access: {
              name,
              index: path.node.start ?? 0,
              line: path.node.loc?.start.line,
            },
          })
        }
      }
    },
  })

  if (hoistingConflicts.length > 0) {
    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["hoisting_error"],
        solutions: [
          "hoisting_fix_move_function_def",
          "request_hoisting_fix",
          "disable_hoist_checker",
        ],
        params: {
          filePath,
          functionName: hoistingConflicts[0].name,
          definitionLine: String(hoistingConflicts[0].definition.line),
          lineNumber: String(hoistingConflicts[0].access.line),
        },
      })
    )
  }

  return Ok(hoistingConflicts)
}
