import { normalize, relative } from "path"

export function filePathRelativeToPackageJsonDir(
  filepath: string,
  packageJsonDirPath: string
): string {
  const normalizedFilePath = normalize(filepath)
  const normalizedPackageJsonDirPath = normalize(packageJsonDirPath)
  return relative(normalizedPackageJsonDirPath, normalizedFilePath)
}
