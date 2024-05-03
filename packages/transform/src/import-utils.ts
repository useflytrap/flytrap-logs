import babelTraverse from "@babel/traverse"
import babelGenerate from "@babel/generator"

/**
 * An interop function to make babel's exports work
 * @param fn default export from `@babel/traverse` or `@babel/generator`
 * @returns the correct traverse function
 */
export function _babelInterop<T>(fn: T): T {
  // @ts-expect-error: depends on bundler behavior if the export is `default` or just `fn`
  return fn.default ?? fn
}

export const traverse = _babelInterop(babelTraverse)
export const generate = _babelInterop(babelGenerate)
