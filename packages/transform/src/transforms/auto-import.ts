import { Ok } from "ts-results"
import { parseCode } from "../parser"
import MagicString from "magic-string"
import {
  basename,
  dirname,
  extname,
  format,
  join,
  normalize,
  relative,
} from "path"
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
  return relative(
    dirname(filePathToResolve),
    exportsFilePath ?? join(packageJsonDirPath ?? cwd(), "logging.ts")
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
      `import { ${Array.from(functionsToAutoImport).join(
        ", "
      )} } from "${format({
        dir: dirname(relativeExportsPath),
        name: basename(relativeExportsPath, extname(relativeExportsPath)),
        ext: "",
      })}";\n`
    )
  }

  return Ok({
    code: s.toString(),
    map: s.generateMap(),
  })
}
