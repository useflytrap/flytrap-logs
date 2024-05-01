import { describe } from "vitest"
import { createDescribe, createErrorDescribe } from "./test-utils"

// test for all the rest of `core/index.ts`

// implementation:

// run after the code transform, look at what code is being used ()??
// maybe we can just some like code.includes("parseJson") etc?
// - look at what exports it has
// - add the missing ones

const autoImportCoreFunctionCases = [
  [
    `req.json()`,
    `req.json()`,
    `import { parseJson } from "./logging"
    parseJson(req)`,
  ],
  [
    `req.text()`,
    `req.text()`,
    `import { parseText } from "./logging"
    parseText(req)`,
  ],
  [
    `new Response`,
    `new Response()`,
    `import { response } from "./logging"
    response()`,
  ],
  [
    `new NextResponse()`,
    `new NextResponse()`,
    `import { nextResponse } from "./logging"
    nextResponse()`,
  ],
  [
    `Response.json`,
    `Response.json("")`,
    `import { json } from "./logging"
    json("")`,
  ],
  [
    `NextResponse.json`,
    `NextResponse.json("")`,
    `import { nextJson } from "./logging"
    nextJson("")`,
  ],
  [
    `Response.redirect`,
    `Response.redirect("")`,
    `import { redirect } from "./logging"
    redirect("")`,
  ],
  [
    `NextResponse.redirect`,
    `NextResponse.redirect("")`,
    `import { nextRedirect } from "./logging"
    nextRedirect("")`,
  ],
]

const addsToUserDefinedImports = [
  [
    `adds to user defined imports`,
    `"use server";
    import { addContext } from "./logging"
    export function foo() {}`,
    `"use server";
    import { addContext } from "./logging"
    import { catchUncaughtAction } from "./logging"
    export const foo = catchUncaughtAction(function foo() {})`,
  ],
]

const serverActionAutoImportCases = [
  [
    `auto-imports after directives`,
    `"use server";
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction } from "./logging"
    export const foo = catchUncaughtAction(function foo() {}, {
      path: "/file.ts/foo"
    })`,
  ],
]

const noDoubleImports = [
  [
    `doesn't double-import (Server Action)`,
    `"use server";
    import { catchUncaughtAction } from "./logging"
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction } from "./logging"
    export const foo = catchUncaughtAction(function foo() {}, {
      path: "/file.ts/foo"
    })`,
  ],
  [
    `doesn't double-import (Route Handler)`,
    `"use server";
    import { catchUncaughtRoute } from "./logging"
    export const POST = catchUncaughtRoute(() => {}, { path: "/", method: "POST" })`,
    `"use server";
    import { catchUncaughtRoute } from "./logging"
    export const POST = catchUncaughtRoute(() => {}, { path: "/", method: "POST" })`,
  ],
]

export const autoImportRelativePathCases = [
  [
    `auto-imports from correct relative path (#1)`,
    `"use server";
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction } from "../../logging"
    export const foo = catchUncaughtAction(function foo() {})`,
    "/src/actions/actions.ts",
  ],
  [
    `auto-imports from correct relative path (#2)`,
    `"use server";
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction } from "../logging"
    export const foo = catchUncaughtAction(function foo() {})`,
    "/actions/actions.ts",
  ],
  [
    `auto-imports from correct relative path (custom logging file location)`,
    `"use server";
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction } from "../lib/logging"
    export const foo = catchUncaughtAction(function foo() {})`,
    "/src/actions/actions.ts",
  ],
]

export const autoImportErrorCases = [
  [
    `reserved function name has been imported from something other than logging.ts`,
    `"use server";
    import { catchUncaughtAction } from "../hello"
    export function foo() {}`,
  ],
  [
    `reserved function name has been imported from something other than logging.ts`,
    `import { parseJson } from "../hello"
    x.json()`,
  ],
]

describe("Auto importing", () => {
  createDescribe(
    "Auto-imports — core function cases",
    autoImportCoreFunctionCases,
    { autoImports: true }
  )
  createDescribe("Auto-imports — Server Actions", serverActionAutoImportCases, {
    autoImports: true,
  })
  createDescribe("Auto-imports — no double imports", noDoubleImports, {
    autoImports: true,
  })
  createDescribe(
    "Auto-imports — correct relative import paths",
    autoImportRelativePathCases,
    { autoImports: true }
  )
  createDescribe(
    "Auto-imports — adds to user defined imports",
    addsToUserDefinedImports,
    { autoImports: true }
  )
  createDescribe(
    "Auto-imports — custom logging file path",
    [
      [
        `auto-imports from correct relative path (custom logging file location)`,
        `"use server";
    export function foo() {}`,
        `"use server";
    import { catchUncaughtAction } from "../lib/logging"
    export const foo = catchUncaughtAction(function foo() {})`,
        "/src/actions/actions.ts",
      ],
    ],
    {
      exportsFilePath: "./src/lib/logging.ts",
      autoImports: true,
    }
  )
  createErrorDescribe("Auto-imports — error cases", autoImportErrorCases)
})
