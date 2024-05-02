import { join } from "path"
import { createNextTest, expect } from "../fixture"
import {
  getDirname,
  getNextConsoleLogs,
  parseLogOrUndefined,
} from "../test-utils"
import type { Log } from "@useflytrap/logs"

const jsonLogs: Log<object>[] = []

const { test } = createNextTest({
  path: join(getDirname(import.meta.url), "app"),
  port: 3001,
  debug: true,
  showStdout: true,
  skipTempdirCleanup: true,
  ...(process.env.CI === undefined && {
    dependencies: {
      "@useflytrap/logs": `link:${join(
        getDirname(import.meta.url),
        "..",
        "..",
        "..",
        "core"
      )}`,
      "@useflytrap/logs-transform": `link:${join(
        getDirname(import.meta.url),
        "..",
        "..",
        "..",
        "transform"
      )}`,
    },
  }),
  onServerLog(log) {
    const parsedLog = parseLogOrUndefined(log)
    if (parsedLog) {
      jsonLogs.push(parsedLog)
    }
  },
})

test.describe("Server Actions", () => {
  test("JSON serializable payload for server actions is saved correctly", async ({
    page,
  }) => {
    await page.goto("/")

    // Click the button
    await page.getByRole("button", { name: "Send JSON" }).click()

    await getNextConsoleLogs(page)
    expect(jsonLogs[0].res).toStrictEqual({
      hello: "world",
    })
    expect(jsonLogs[0].req).toStrictEqual([
      {
        foo: "bar",
      },
    ])
    expect(jsonLogs[0].method).toBe("GET")
    expect(jsonLogs[0].type).toBe("action")
  })

  // @todo: here we need tests for all accepted values for Server Actions
})
