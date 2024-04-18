#!/bin/node
import { execaCommandSync } from "execa";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "fs"
import { packageUp } from 'package-up';

const INTERNAL_DEPENDENCIES = ["@useflytrap/logs-shared"];

const action = process.argv.slice(2)[0]
const packageJsonPath = await packageUp();
const backupPackageJsonPath = `${packageJsonPath}.bak`;


if (action === undefined) {
  console.log("Usage: ./patch-package.js [patch | unpatch]")
  process.exit(1)
}

if (action === "patch") {
  // Back up package.json
  copyFileSync(packageJsonPath, backupPackageJsonPath);

  // Remove workspace import
  const packageJsonWithoutInternalDependencies = readFileSync(packageJsonPath)
    .toString()
    .split('\n')
    .map((line) => {
      if (INTERNAL_DEPENDENCIES.some((dep) => line.includes(dep))) {
        return undefined
      }
      return line
    })
    .filter(Boolean)
    .join('\n');

  // Save it
  writeFileSync(packageJsonPath, packageJsonWithoutInternalDependencies);

  // Git add
  execaCommandSync("git add .", { cwd: packageJsonPath });
  // Git commit
  execaCommandSync(`git commit -m "chore: patch package.json for release"`, { cwd: packageJsonPath });

  console.log("Patch done.")
}

if (action === "unpatch") {
  // Delete
  rmSync(packageJsonPath)

  // Copy bak to package.json
  copyFileSync(backupPackageJsonPath, packageJsonPath);
  // Delete
  rmSync(backupPackageJsonPath)

  console.log("Unpatch done.")
}
