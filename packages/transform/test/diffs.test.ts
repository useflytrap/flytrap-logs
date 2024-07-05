import { describe, it, expect, afterAll } from "vitest"
import { writeDiff } from "../src/diff"
import { join } from "path"
import { readFileSync, rmSync } from "fs"

const expectedDiff = `Index: src/api/webhooks/route.ts
===================================================================
--- src/api/webhooks/route.ts
+++ src/api/webhooks/route.ts
@@ -0,0 +1,1 @@
+GET
\\ No newline at end of file
`

describe("Writing diffs", () => {
  it("writes diffs in correct location", () => {
    writeDiff(
      join(__dirname, ".."),
      "src/api/webhooks/route.ts",
      ``,
      `GET`
    ).unwrap()

    // Check that diff is correct
    const diffContents = readFileSync(
      join(__dirname, "..", ".flytrap", "src", "api", "webhooks", "route.ts")
    ).toString()
    expect(diffContents).toBe(expectedDiff)
  })
})

afterAll(() => {
  rmSync(join(__dirname, "..", ".flytrap"), { recursive: true })
})
