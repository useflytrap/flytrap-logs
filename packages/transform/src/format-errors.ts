import pico from "picocolors"
import { ParseErrorSpecification } from "./types"

const getNumDigits = (number: number) =>
  (Math.log(number) * Math.LOG10E + 1) | 0

export function formatBabelParseError(
  error: ParseErrorSpecification,
  userCode: string,
  filePath?: string
): string {
  // Split the code into lines and get the relevant line.
  const codeLines = userCode.split("\n")
  const errorLine = codeLines[error.loc.line - 1]

  const errorMessage = error.message
  const errorName = error.name

  // Format the error message.
  const topLine = [
    `🐛 babel parse error: ${errorName}`,
    error.syntaxPlugin !== undefined && `syntax plugin: ${error.syntaxPlugin}`,
    error.missingPlugin !== undefined &&
      `missing plugin(s): "${error.missingPlugin}"`,
    `${pico.green("--->")} ${
      filePath === undefined ? "unspecified file" : filePath
    }:${error.loc.line}:${error.loc.column}`,
  ]
    .filter(Boolean)
    .join("\n")

  const errorUnderlineLength = 1

  const pointerLine =
    " ".repeat(
      getNumDigits(error.loc.line) +
        error.loc.column -
        getNumDigits(error.loc.line)
    ) +
    pico.red("^").repeat(errorUnderlineLength) +
    " " +
    pico.red(errorMessage)
  const codeDisplay = [
    " ".repeat(getNumDigits(error.loc.line) + 1) + pico.green("|"),
    `${pico.green(error.loc.line)} ${pico.green("|")} ${errorLine}`,
    `${
      " ".repeat(getNumDigits(error.loc.line) + 1) + pico.green("|")
    } ${pointerLine}`,
  ].join("\n")

  return `${topLine}\n${codeDisplay}\n`
}
