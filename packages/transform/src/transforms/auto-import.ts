import { Ok } from "ts-results"
import { parseCode } from "../parser"
import MagicString from "magic-string"
import {
  basename,
  dirname,
  extname,
  format,
  isAbsolute,
  join,
  relative,
} from "path"
import { cwd } from "process"
import { LogsPluginOptions } from "../types"

export const DEFAULT_IMPORT_ALIASES = [
  ["@/", "./"],
  ["~/", "./"],
]

export function getCoreFunctionImportMap(options: LogsPluginOptions = {}) {
  return {
    getContext: "getContext$1337",
    addContext: "addContext$1337",
    flushAsync: "flushAsync$1337",
    flush: "flush$1337",
    catchUncaughtAction: "catchUncaughtAction$1337",
    catchUncaughtRoute: "catchUncaughtRoute$1337",
    parseJson: options.request?.json || "parseJson$1337",
    parseText: options.request?.text || "parseText$1337",
    response: options.response?.classInstance || "response$1337",
    nextResponse:
      options.next?.nextResponse?.classInstance || "nextResponse$1337",
    json: options.response?.json || "json$1337",
    nextJson: options.next?.nextResponse?.json || "nextJson$1337",
    redirect: options.response?.redirect || "redirect$1337",
    nextRedirect: options.next?.nextResponse?.redirect || "nextRedirect$1337",
  } as const
}

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
function findRequiredImports(code: string, options: LogsPluginOptions) {
  const requiredImports: Partial<ReturnType<typeof getCoreFunctionImportMap>> =
    {}
  for (const [importedFunction, importAlias] of Object.entries(
    getCoreFunctionImportMap(options)
  )) {
    if (code.includes(importAlias)) {
      // @ts-expect-error: we're indexing correctly here
      requiredImports[importedFunction] = importAlias
    }
  }

  return requiredImports
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
  options: LogsPluginOptions
) {
  const startingIndexRes = findImportStartingIndex(code, filePath)
  if (startingIndexRes.err) return startingIndexRes

  const s = new MagicString(code, { filename: filePath })

  if (code.includes("createFlytrapLogger")) {
    return Ok({
      code: s.toString(),
      map: s.generateMap(),
    })
  }

  // Required imports
  const requiredImportsMap = findRequiredImports(code, options)
  const relativeExportsPath = getRelativePathToExportsFile(
    filePath,
    options.exportsFilePath,
    options.packageJsonDirPath
  )

  // Add imports
  if (Object.keys(requiredImportsMap).length > 0) {
    s.appendLeft(
      startingIndexRes.val,
      `\nimport { ${Object.entries(requiredImportsMap)
        .map(
          ([functionName, importAlias]) => `${functionName} as ${importAlias}`
        )
        .join(", ")} } from "${format({
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
