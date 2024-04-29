import { createError } from "@useflytrap/logs-shared"
import { createPatch } from "diff"
import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { Err, Ok } from "ts-results"

const diffAbsolutePath = (packageJsonPath: string, fileName: string) =>
  join(packageJsonPath, ".flytrap", fileName)

export function writeDiff(
  packageJsonPath: string,
  fileName: string,
  oldCode: string,
  newCode: string
) {
  try {
    const patchPath = diffAbsolutePath(packageJsonPath, fileName)
    mkdirSync(dirname(patchPath), { recursive: true })
    const patch = createPatch(fileName, oldCode, newCode)
    writeFileSync(patchPath, patch)
    return Ok(undefined)
  } catch (error) {
    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["writing_diffs_failed"],
        solutions: ["disable_diffs", "open_issue"],
        params: {
          filePath: fileName,
          error: String(error),
        },
      })
    )
  }
}
