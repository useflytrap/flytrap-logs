import type { ParserOptions } from "@babel/parser"

export type LogsPluginOptions = {
  request?: {
    json?: false | string
    text?: false | string
    formData?: false | string
  }
  response?: {
    json?: false | string
    redirect?: false | string
    classInstance?: false | string
    classInstanceName?: string
    ensureGlobalResponse?: boolean
  }
  next?: {
    /**
     * Define a custom import alias that you're using with your Next.js project
     * By default, import aliases "@/" and "~/" get resolved automatically to the package.json dir or `cwd()`.
     * @default
     * ```typescript
     * [
     *   ["@/", "./"],
     *   ["~/", "./"]
     * ]
     * ```
     */
    importAliases?: string[][]
    serverActions?: boolean
    serverActionsPaths?: string[]
    routeHandlers?: boolean
    routeHandlerPaths?: string[]
    nextResponse?: {
      json?: false | string
      redirect?: false | string
      classInstance?: false | string
      classInstanceName?: string
    }
  }
  babel?: {
    parserOptions?: ParserOptions
  }
  hoistChecker?: boolean
  packageJsonDirPath?: string
  diffs?: boolean
  exportsFilePath?: string
  autoImports?: boolean
  onlyServerActionsAndRoutes?: boolean
}

// Source: https://github.com/babel/babel/blob/main/packages/babel-parser/src/parse-error.ts
// Babel doesn't export these types correctly in v7
type SyntaxPlugin =
  | "flow"
  | "typescript"
  | "jsx"
  | "pipelineOperator"
  | "placeholders"
type ParseErrorCode =
  | "BABEL_PARSER_SYNTAX_ERROR"
  | "BABEL_PARSER_SOURCETYPE_MODULE_REQUIRED"
export type Position = {
  line: number
  column: number
  index: number
}

export interface ParseErrorSpecification<ErrorDetails = unknown> extends Error {
  code: ParseErrorCode
  reasonCode: string
  syntaxPlugin?: SyntaxPlugin
  missingPlugin?: string | string[]
  loc: Position
  details: ErrorDetails
}

export type DefinitionLocation = {
  name: string
  index: number
  line?: number
}
