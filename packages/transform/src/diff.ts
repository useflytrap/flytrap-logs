import { createError } from "@useflytrap/logs-shared"
import { createPatch } from "diff"
import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { Err, Ok } from "ts-results"
import { filePathRelativeToPackageJsonDir } from "./path-utils"

export const getDiffAbsolutePath = (
  packageJsonPath: string,
  filePath: string
) =>
  join(
    packageJsonPath,
    ".flytrap",
    filePathRelativeToPackageJsonDir(filePath, packageJsonPath)
  )

export function writeDiff(
  packageJsonPath: string,
  filePath: string,
  oldCode: string,
  newCode: string
) {
  try {
    const patchPath = getDiffAbsolutePath(packageJsonPath, filePath)
    mkdirSync(dirname(patchPath), { recursive: true })
    const patch = createPatch(filePath, oldCode, newCode)
    writeFileSync(patchPath, patch)
    return Ok(undefined)
  } catch (error) {
    return Err(
      createError({
        events: ["transform_failed"],
        explanations: ["writing_diffs_failed"],
        solutions: ["disable_diffs", "open_issue"],
        params: {
          filePath,
          error: String(error),
        },
      })
    )
  }
}
