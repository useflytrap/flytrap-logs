import { Ok } from "ts-results"
import { parseCode } from "../parser"
import MagicString from "magic-string"
import { dirname, extname, join, relative } from "path"
import { findStaticImports, parseStaticImport } from "mlly"
import { cwd } from "process"
import { LogsPluginOptions } from "../types"

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
  return relative(
    dirname(filePathToResolve),
    exportsFilePath ?? join(packageJsonDirPath ?? cwd(), "logging.ts")
  )
}

export function addAutoImports(
  code: string,
  existingLogImports: string[],
  filePath: string,
  options: LogsPluginOptions = {}
) {
  const startingIndexRes = findImportStartingIndex(code, filePath)
  if (startingIndexRes.err) return startingIndexRes

  const s = new MagicString(code, { filename: extname(filePath) })

  const imports = findStaticImports(code)

  // Required imports
  const requiredImports = findRequiredImports(code)

  // @todo: make sure that  `./logging` resolves to the correct logging
  // write some utility functions that help resolving it

  // basically we need some -> getRelativeImportPathForLogging
  // which if we have `/` root and logging there, and we're in
  // /src/app/api/route.ts -> then it returns ../../logging

  const relativePath = getRelativePathToExportsFile(
    filePath,
    options.exportsFilePath,
    options.packageJsonDirPath
  )
  console.log("RELATIVE ", relativePath)

  const xa = imports
    .map((staticImport) => parseStaticImport(staticImport))
    .filter((parsedImport) => parsedImport.specifier === "./logging")

  console.log("XA ")
  console.log(xa)

  // const parsed = parseStaticImport(imports[0])

  return Ok({
    code: s.toString(),
    map: s.generateMap(),
  })
}
