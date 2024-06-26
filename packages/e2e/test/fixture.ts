import { test as baseTest } from "@playwright/test"
import {
  createTempTestFolder,
  mergePackageJson,
  pnpmInstall,
  wait,
} from "./test-utils"
import { ExecaChildProcess, execa } from "execa"
import { PackageJson } from "type-fest"
import { rmSync } from "fs"
import ms from "ms"

export * from "@playwright/test"

export type NextTestOptions = {
  path: string
  port?: number
  serverReadyString?: string
  showStdout?: boolean
  timeout?: number
  id?: string
  debug?: boolean
  production?: boolean
  skipTempdirCleanup?: boolean
  onServerLog?: (log: string) => void
} & Pick<PackageJson.PackageJsonStandard, "dependencies">

export function createNextTest({
  path,
  timeout = ms("1 minute") as number,
  port = 3000,
  dependencies,
  showStdout = false,
  serverReadyString = "ready",
  id,
  debug,
  production,
  skipTempdirCleanup,
  onServerLog,
}: NextTestOptions) {
  let serverProcess: ExecaChildProcess<string> | undefined
  let tempTestPath: string | undefined

  const test = baseTest.extend<{}, { workerStorageState: string }>({
    // @todo: auth here…
    baseURL: `http://localhost:${port}`,
  })

  test.setTimeout(timeout)

  const idOr = (id?: string) => (id === undefined ? "" : `${id}: `)

  // Start Next.js dev server
  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(timeout)
    tempTestPath = await createTempTestFolder(path)

    if (debug) {
      console.log(`${idOr(id)} Created temp folder`, tempTestPath)
    }

    // Patch dependencies
    mergePackageJson(tempTestPath, { dependencies })

    // Run install
    await pnpmInstall(tempTestPath, showStdout)
    if (debug) {
      console.log(`${idOr(id)} Finished "pnpm install"`)
    }

    if (production) {
      // Run build
      await execa("pnpm", ["next", "build"], {
        cwd: tempTestPath,
      })
      if (debug) {
        console.log(`${idOr(id)} Finished "pnpm next build"`)
      }

      // Start production server
      serverProcess = execa("pnpm", ["start"], {
        cwd: tempTestPath,
        env: {
          ...process.env,
          PORT: port.toString(),
        },
      })
    } else {
      // Start dev server
      serverProcess = execa("pnpm", ["dev"], {
        cwd: tempTestPath,
        env: {
          ...process.env,
          PORT: port.toString(),
        },
      })
    }

    if (debug) {
      console.log(`${idOr(id)} Started server`)
    }

    serverProcess.stdout?.on("data", (data: Buffer | string) => {
      if (showStdout) console.log(idOr(id), data.toString())
      onServerLog?.(data.toString())
    })
    serverProcess.stderr?.on("data", (data: Buffer | string) => {
      if (showStdout) console.error(idOr(id), data.toString())
      onServerLog?.(data.toString())
    })

    await new Promise<undefined>((resolve) => {
      serverProcess?.stdout?.on("data", (data: string | Buffer) => {
        if (data.toString().toLowerCase().includes(serverReadyString)) {
          resolve(undefined)
        }
      })
    })

    if (debug) {
      console.log(`${idOr(id)} Server ready`)
    }
  })

  test.afterAll(async () => {
    serverProcess?.kill()
    if (skipTempdirCleanup !== true) {
      try {
        if (tempTestPath) {
          await wait(1000)
          rmSync(tempTestPath, { recursive: true })
        }
      } catch (e) {
        console.error(
          `Deleting temporary test folder failed. Path ${tempTestPath}`
        )
      }
    }
  })

  return { test }
}
