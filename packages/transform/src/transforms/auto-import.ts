import { Err, Ok } from "ts-results"
import { parseCode } from "../parser"
import MagicString from "magic-string"
import {
  basename,
  dirname,
  extname,
  format,
  isAbsolute,
  join,
  normalize,
  relative,
} from "path"
import { findStaticImports, parseStaticImport } from "mlly"
import { cwd } from "process"
import { LogsPluginOptions } from "../types"
import { createError } from "@useflytrap/logs-shared"

const EXPORTED_CORE_FUNCTIONS = [
  "getContext",
  "addContext",
  "flushAsync",
  "flush",
  "catchUncaughtAction",
  "catchUncaughtRoute",
  "parseJson",
  "parseText",
  "response",
  "nextResponse",
  "json",
  "nextJson",
  "redirect",
  "nextRedirect",
] as const

function findImportStartingIndex(code: string, filePath: string) {
  const astResult = parseCode(code, filePath)
  if (astResult.err) return astResult

  const ast = astResult.val
  if (ast.program.interpreter && ast.program.interpreter.end) {
    return Ok(ast.program.interpreter.end)
  }

  if (
    ast.program.directives &&
    ast.program.directives[0]?.type === "Directive"
  ) {
    return Ok(ast.program.directives[0].end ?? 0)
  }

  return Ok(0)
}

// @todo: fix this naive implementation
function findRequiredImports(code: string) {
  return EXPORTED_CORE_FUNCTIONS.filter((functionName) =>
    code.includes(functionName)
  )
}

function getRelativePathToExportsFile(
  filePathToResolve: string,
  exportsFilePath?: string,
  packageJsonDirPath?: string
) {
  const normalizedExportsFilePath =
    exportsFilePath &&
    (isAbsolute(exportsFilePath)
      ? exportsFilePath
      : join(packageJsonDirPath ?? cwd(), exportsFilePath))
  return relative(
    dirname(filePathToResolve),
    normalizedExportsFilePath ?? join(packageJsonDirPath ?? cwd(), "logging.ts")
  )
}

export function addAutoImports(
  code: string,
  filePath: string,
  options: LogsPluginOptions = {}
) {
  const startingIndexRes = findImportStartingIndex(code, filePath)
  if (startingIndexRes.err) return startingIndexRes

  const s = new MagicString(code, { filename: extname(filePath) })

  const imports = findStaticImports(code)

  // Required imports
  const requiredImports = findRequiredImports(code)
  const relativeExportsPath = getRelativePathToExportsFile(
    filePath,
    options.exportsFilePath,
    options.packageJsonDirPath
  )

  const relativeExportsPathNormalized = join(
    dirname(relativeExportsPath),
    basename(relativeExportsPath, extname(relativeExportsPath))
  )

  const functionsImportedFromLoggingFile = imports
    .map((staticImport) => parseStaticImport(staticImport))
    .filter(
      (parsedImport) =>
        normalize(parsedImport.specifier) === relativeExportsPathNormalized
    )
    .map((filteredImport) => filteredImport.namedImports)
    .filter(Boolean)
    .reduce((acc, curr) => {
      const currValues = []
      for (const [importedFunction] of Object.entries(curr!)) {
        currValues.push(importedFunction)
      }
      return [...acc, ...currValues]
    }, [] as string[])

  const functionsToAutoImport = requiredImports.filter(
    (requiredImport) =>
      !functionsImportedFromLoggingFile.includes(requiredImport)
  )

  // Add imports
  if (functionsToAutoImport.length > 0) {
    s.appendLeft(
      startingIndexRes.val,
      `\nimport { ${Array.from(functionsToAutoImport).join(
        ", "
      )} } from "${format({
        dir: dirname(relativeExportsPath),
        name: basename(relativeExportsPath, extname(relativeExportsPath)),
        ext: "",
      })}";\n`
    )
  }

  // Make sure that required imports are all imported
  // from the correct logging.ts file and not somewhere else

  // Make sure there are no duplicate imports for any of the `EXPORTED_CORE_FUNCTIONS`
  // imports. This can happen if someone accidentally would import a function with the same
  // name as one of the exported core functions.
  const exportedCoreFunctionsImportedAfterTransform = findStaticImports(
    s.toString()
  )
    .map((staticImport) => parseStaticImport(staticImport))
    .map((filteredImport) => filteredImport.namedImports)
    .filter(Boolean)
    .reduce((acc, curr) => {
      const currValues = []
      for (const [importedFunction] of Object.entries(curr!)) {
        currValues.push(importedFunction)
      }
      return [...acc, ...currValues]
    }, [] as string[])
    .filter((importedFunctionName) =>
      EXPORTED_CORE_FUNCTIONS.includes(importedFunctionName as any)
    )

  const uniqueCoreImports = Array.from(
    new Set(exportedCoreFunctionsImportedAfterTransform)
  )

  if (
    uniqueCoreImports.length !==
    exportedCoreFunctionsImportedAfterTransform.length
  ) {
    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["invalid_core_imports"],
        solutions: ["remove_invalid_imports", "open_issue"],
        params: {
          coreFunctionNames: uniqueCoreImports
            .map((importName) => `\`${importName}\``)
            .join(", "),
          filePath,
          loggingFilePath: relativeExportsPath,
        },
      })
    )
  }

  return Ok({
    code: s.toString(),
    map: s.generateMap(),
  })
}
