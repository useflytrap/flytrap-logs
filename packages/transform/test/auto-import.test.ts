import { describe } from "vitest"
import { createDescribe, createErrorDescribe } from "./test-utils"

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
    import { catchUncaughtAction } from "./logging"
    import { addContext } from "./logging"
    export const foo = catchUncaughtAction(function foo() {}, {
      path: "/file.ts/foo"
    })`,
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
    export const foo = catchUncaughtAction(function foo() {}, {
      path: "/src/actions/actions.ts/foo"
    })`,
    "/src/actions/actions.ts",
  ],
  [
    `auto-imports from correct relative path (#2)`,
    `"use server";
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction } from "../logging"
    export const foo = catchUncaughtAction(function foo() {}, {
      path: "/actions/actions.ts/foo"
    })`,
    "/actions/actions.ts",
  ],
]

export const autoImportErrorCases = [
  [
    `reserved function name has been imported from something other than logging.ts`,
    `"use server";
    import { catchUncaughtAction } from "../hello"
    export function foo() {}`,
    "/actions/actions.ts",
  ],
  [
    `reserved function name has been imported from something other than logging.ts`,
    `"use server";
    import { parseJson } from "../hello"
    x.json()`,
    "/actions/actions.ts",
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
    "Auto-imports — custom logging file path",
    [
      [
        `auto-imports from correct relative path (custom logging file location)`,
        `"use server";
      export function foo() {}`,
        `"use server";
      import { catchUncaughtAction } from "../lib/logging"
      export const foo = catchUncaughtAction(function foo() {}, {
        path: "/src/actions/actions.ts/foo"
      })`,
        "/src/actions/actions.ts",
      ],
    ],
    {
      exportsFilePath: "./src/lib/logging.ts",
      autoImports: true,
    }
  )
  createDescribe(
    "Auto-imports — adds to user defined imports",
    addsToUserDefinedImports,
    { autoImports: true }
  )
  createDescribe(
    "Auto-imports — doesn't try to auto-import in the logging file itself",
    [
      [
        `doesn't auto-import in the logging.ts file`,
        `import { createFlytrapLogger } from "@useflytrap/logs";

      export const {
        getContext,
        addContext,
        flushAsync,
        flush,
        catchUncaughtAction,
        catchUncaughtRoute,
        parseJson,
        parseText,
        response,
        nextResponse,
        json,
        nextJson,
        redirect,
        nextRedirect
      } = createFlytrapLogger({
        flushMethod: 'stdout',
      });
      `,
        `import { createFlytrapLogger } from "@useflytrap/logs";

      export const {
        getContext,
        addContext,
        flushAsync,
        flush,
        catchUncaughtAction,
        catchUncaughtRoute,
        parseJson,
        parseText,
        response,
        nextResponse,
        json,
        nextJson,
        redirect,
        nextRedirect
      } = createFlytrapLogger({
        flushMethod: 'stdout',
      });
      `,
        "/logging.js",
      ],
    ],
    { autoImports: true }
  )
  createErrorDescribe("Auto-imports — error cases", autoImportErrorCases, {
    autoImports: true,
  })
})
