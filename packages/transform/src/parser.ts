import { type ParserOptions, parse } from "@babel/parser"
import { Err, Ok } from "ts-results"
import { ParseErrorSpecification } from "./types"
import { formatBabelParseError } from "./format-errors"
import { createError } from "@useflytrap/logs-shared"

export function parseCode(
  code: string,
  filePath?: string,
  parserOptions?: ParserOptions
) {
  try {
    return Ok(
      parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        ...parserOptions,
      })
    )
  } catch (e) {
    const parseError = e as ParseErrorSpecification
    const formattedParsingError = formatBabelParseError(
      parseError,
      code,
      filePath
    )

    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["parsing_failed"],
        solutions: ["define_babel_parse_options"],
        params: {
          error: formattedParsingError,
          filePath: filePath ?? "unknown file",
        },
      })
    )
  }
}
