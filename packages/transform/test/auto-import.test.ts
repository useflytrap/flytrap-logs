import { describe } from "vitest"
import { createDescribe } from "./test-utils"
import { getCoreFunctionImportMap } from "../src/transforms/auto-import"

const autoImportCoreFunctionCases = [
  [
    `req.json()`,
    `req.json()`,
    `import { parseJson as parseJson$1337 } from "./logging"
    parseJson$1337(req)`,
  ],
  [
    `req.text()`,
    `req.text()`,
    `import { parseText as parseText$1337 } from "./logging"
    parseText$1337(req)`,
  ],
  [
    `new Response`,
    `new Response()`,
    `import { response as response$1337 } from "./logging"
    response$1337()`,
  ],
  [
    `new NextResponse()`,
    `new NextResponse()`,
    `import { nextResponse as nextResponse$1337 } from "./logging"
    nextResponse$1337()`,
  ],
  [
    `Response.json`,
    `Response.json("")`,
    `import { json as json$1337 } from "./logging"
    json$1337("")`,
  ],
  [
    `NextResponse.json`,
    `NextResponse.json("")`,
    `import { nextJson as nextJson$1337 } from "./logging"
    nextJson$1337("")`,
  ],
  [
    `Response.redirect`,
    `Response.redirect("")`,
    `import { redirect as redirect$1337 } from "./logging"
    redirect$1337("")`,
  ],
  [
    `NextResponse.redirect`,
    `NextResponse.redirect("")`,
    `import { nextRedirect as nextRedirect$1337 } from "./logging"
    nextRedirect$1337("")`,
  ],
]

const addsToUserDefinedImports = [
  [
    `adds to user defined imports`,
    `"use server";
    import { catchUncaughtAction } from "./logging"
    import { addContext } from "./logging"
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction as catchUncaughtAction$1337 } from "./logging"
    import { catchUncaughtAction } from "./logging"
    import { addContext } from "./logging"
    export const foo = catchUncaughtAction$1337(function foo() {}, {
      path: "file.ts/foo"
    })`,
  ],
]

const serverActionAutoImportCases = [
  [
    `auto-imports after directives`,
    `"use server";
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction as catchUncaughtAction$1337 } from "./logging"
    export const foo = catchUncaughtAction$1337(function foo() {}, {
      path: "file.ts/foo"
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
    import { catchUncaughtAction as catchUncaughtAction$1337 } from "./logging";
    import { catchUncaughtAction } from "./logging"
    export const foo = catchUncaughtAction$1337(function foo() {}, {
      path: "file.ts/foo"
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
    import { catchUncaughtAction as catchUncaughtAction$1337 } from "../../logging"
    export const foo = catchUncaughtAction$1337(function foo() {}, {
      path: "src/actions/actions.ts/foo"
    })`,
    "/src/actions/actions.ts",
  ],
  [
    `auto-imports from correct relative path (#2)`,
    `"use server";
    export function foo() {}`,
    `"use server";
    import { catchUncaughtAction as catchUncaughtAction$1337 } from "../logging"
    export const foo = catchUncaughtAction$1337(function foo() {}, {
      path: "actions/actions.ts/foo"
    })`,
    "/actions/actions.ts",
  ],
]

export const autoImportRegressionCases = [
  [
    `regression #1: import from @/ import alias`,
    `import { NextRequest, NextResponse } from "next/server"
import { addContext } from "@/lib/logging"

export async function POST(request: NextRequest) {
  const body = await request.text()
  addContext({ error: 'some-error' })
  return NextResponse.json(null)
}`,
    `import { catchUncaughtRoute as catchUncaughtRoute$1337, parseText as parseText$1337, nextJson as nextJson$1337 } from "../../../../../lib/logging";
import { NextRequest, NextResponse } from "next/server"
import { addContext } from "@/lib/logging"

export const POST = catchUncaughtRoute$1337(async function POST(request: NextRequest) {
  const body = await parseText$1337(request);
  addContext({ error: 'some-error' })
  return nextJson$1337(null)
}, {
  path: "app/api/v1/webhooks/stripe/route.ts",
  method: "POST",
});`,
    "/app/api/v1/webhooks/stripe/route.ts",
  ],
  [
    `regression #2: conflicting import`,
    `import { redirect } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const user = null

  if (!user) {
    return redirect("/login")
  }

  redirect("/dashboard")
}`,
    `import { catchUncaughtRoute as catchUncaughtRoute$1337 } from "lib/logging";
import { redirect } from "next/navigation"
import { NextRequest, NextResponse } from "next/server"

export const GET = catchUncaughtRoute$1337(async function GET() {
  const user = null

  if (!user) {
    return redirect("/login")
  }

  redirect("/dashboard")
}, {
  path: "route.ts",
  method: "GET",
})`,
    "/route.ts",
  ],
]

describe("Auto importing", () => {
  const {
    parseJson,
    parseText,
    response,
    nextResponse,
    json,
    nextJson,
    redirect,
    nextRedirect,
  } = getCoreFunctionImportMap()

  createDescribe(
    "Auto-imports — core function cases",
    autoImportCoreFunctionCases,
    {
      autoImports: true,
      onlyServerActionsAndRoutes: false,
      response: { json, redirect, classInstance: response },
      request: { json: parseJson, text: parseText },
      next: {
        nextResponse: {
          json: nextJson,
          redirect: nextRedirect,
          classInstance: nextResponse,
        },
      },
    }
  )
  createDescribe("Auto-imports — Server Actions", serverActionAutoImportCases, {
    autoImports: true,
    response: { json, redirect, classInstance: response },
    request: { json: parseJson, text: parseText },
    next: {
      nextResponse: {
        json: nextJson,
        redirect: nextRedirect,
        classInstance: nextResponse,
      },
    },
  })
  createDescribe("Auto-imports — no double imports", noDoubleImports, {
    autoImports: true,
    response: { json, redirect, classInstance: response },
    request: { json: parseJson, text: parseText },
    next: {
      nextResponse: {
        json: nextJson,
        redirect: nextRedirect,
        classInstance: nextResponse,
      },
    },
  })
  createDescribe(
    "Auto-imports — correct relative import paths",
    autoImportRelativePathCases,
    {
      autoImports: true,
      response: { json, redirect, classInstance: response },
      request: { json: parseJson, text: parseText },
      next: {
        nextResponse: {
          json: nextJson,
          redirect: nextRedirect,
          classInstance: nextResponse,
        },
      },
    }
  )
  createDescribe(
    "Auto-imports — custom logging file path",
    [
      [
        `auto-imports from correct relative path (custom logging file location)`,
        `"use server";
      export function foo() {}`,
        `"use server";
      import { catchUncaughtAction as catchUncaughtAction$1337 } from "../lib/logging";
      export const foo = catchUncaughtAction$1337(function foo() {}, {
        path: "src/actions/actions.ts/foo"
      })`,
        "/src/actions/actions.ts",
      ],
    ],
    {
      exportsFilePath: "./src/lib/logging.ts",
      autoImports: true,
      response: { json, redirect, classInstance: response },
      request: { json: parseJson, text: parseText },
      next: {
        nextResponse: {
          json: nextJson,
          redirect: nextRedirect,
          classInstance: nextResponse,
        },
      },
    }
  )
  createDescribe(
    "Auto-imports — adds to user defined imports",
    addsToUserDefinedImports,
    {
      autoImports: true,
      response: { json, redirect, classInstance: response },
      request: { json: parseJson, text: parseText },
      next: {
        nextResponse: {
          json: nextJson,
          redirect: nextRedirect,
          classInstance: nextResponse,
        },
      },
    }
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
    {
      autoImports: true,
      response: { json, redirect, classInstance: response },
      request: { json: parseJson, text: parseText },
      next: {
        nextResponse: {
          json: nextJson,
          redirect: nextRedirect,
          classInstance: nextResponse,
        },
      },
    }
  )

  // Regressions
  createDescribe("Auto-imports — regression tests", autoImportRegressionCases, {
    exportsFilePath: "./lib/logging.ts",
    autoImports: true,
    response: { json, redirect, classInstance: response },
    request: { json: parseJson, text: parseText },
    next: {
      nextResponse: {
        json: nextJson,
        redirect: nextRedirect,
        classInstance: nextResponse,
      },
    },
  })
})
