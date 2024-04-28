import { join } from "path"
import { createNextTest } from "../fixture"
import { getDirname } from "../test-utils"

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
})

test.describe("Server Actions", () => {
  test("JSON serializable payload for server actions is saved correctly", async ({
    page,
  }) => {
    await page.goto("/")

    // Click the button
    await page.getByRole("button", { name: "Send JSON" }).click()

    // Check that the log was output to stdout
  })

  // @todo: here we need tests for all accepted values for Server Actions
})
