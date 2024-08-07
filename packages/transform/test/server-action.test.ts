import { describe } from "vitest"
import { createDescribe, createErrorDescribe } from "./test-utils"

const serverActionDirectiveCases = [
  [
    `transforms files with "use server" directive at the top`,
    `"use server"
    
    export async function foo() {}`,
    `"use server"
    
    export const foo = catchUncaughtAction$1337(async function foo() {
    }, {
      path: "lib/actions.ts/foo"
    })`,
    `/lib/actions.ts`,
  ],
  [
    `doesn't transform files without "use server" directive at the top`,
    `export async function foo() {}`,
    `export async function foo() {}`,
  ],
]

const serverActionErrorCases = [
  /* [
    `transform errors when using \`.bind\``,
    `"use server"
    
    export const x = () => {}
    x.bind(null)()`,
  ] */
  [
    `transform errors when using \`this\``,
    `"use server"
    
    export const x = () => {
      this.hello
    }`,
  ],
  [
    `transform errors when using \`arguments\``,
    `"use server"
    
    export const x = () => {
      arguments[0]
    }`,
  ],
]

const serverActionTransformOnlyExportsCases = [
  [
    `transforms exported function expression (named export)`,
    `"use server"
    export const foo = () => {}`,
    `"use server"
    export const foo = catchUncaughtAction$1337(() => {}, {
      path: "lib/actions.ts/foo"
    })`,
    `/lib/actions.ts`,
  ],
  [
    `transforms exported function declaration (default export)`,
    `"use server"
    export default function foo() {}`,
    `"use server"
    const foo = catchUncaughtAction$1337(function foo() {}, {
      path: "lib/actions.ts/foo"
    })
    export default foo`,
    `/lib/actions.ts`,
  ],
  [
    `transforms exported function expression (default export)`,
    `"use server"
    const foo = () => {}
    export default foo`,
    `"use server"
    const foo = catchUncaughtAction$1337(() => {}, {
      path: "lib/actions.ts/foo"
    })
    export default foo`,
    `/lib/actions.ts`,
  ],
  [
    `transforms exported function expression (late export)`,
    `"use server"
    const foo = () => {}
    export { foo }`,
    `"use server"
    const foo = catchUncaughtAction$1337(() => {}, {
      path: "lib/actions.ts/foo"
    })
    export { foo }`,
    `/lib/actions.ts`,
  ],
  [
    `doesn't transform private function`,
    `"use server"
    const foo = () => {}`,
    `"use server"
    const foo = () => {}`,
  ],
]

const serverActionHoistingCases = [
  [
    `errors for non-hoisted exported function declarations (named)`,
    `"use server"
    import { x } from "foo"
    foo()
    export function foo() {}`,
  ],
  [
    `errors for non-hoisted exported function declarations (default)`,
    `"use server"
    import { x } from "foo"
    foo()
    export default function foo() {}`,
  ],
]

const serverActionHoistingSuccessCases = [
  [
    `doesn't error for imported values`,
    `"use server"
    import { x } from "foo"
    x()`,
    `"use server"
    import { x } from "foo"
    x()`,
  ],
  [
    `doesn't error for a value that isn't defined as a const at some point`,
    `"use server"
    Response.json()
    new Response()`,
    `"use server"
    json()
    response()`,
  ],
  [
    `doesn't check variables defined with \`var\``,
    `"use server"
    import { x } from "foo"
    c()
    var c = () => {}`,
    `"use server"
    import { x } from "foo"
    c()
    var c = () => {}`,
  ],
  [
    `doesn't error for non-transformed functions`,
    `"use server"
    foo()
    function foo() {}
    export function bar() {}`,
    `"use server"
    foo()
    function foo() {}
    export const bar = catchUncaughtAction$1337(function bar() {}, {
      path: "file.ts/bar"
    })`,
  ],
  [
    `doesn't try to hoist non-server actions`,
    `foo()
export function foo() {}`,
    `foo()
export function foo() {}`,
  ],
]

// @todo: hoist checker accepted test case for
// server action functions that DONT get transformed (non-exported functions).

describe("Server Action transforms", () => {
  createDescribe("Server Actions — directives", serverActionDirectiveCases)
  createDescribe(
    "Server Actions — exports",
    serverActionTransformOnlyExportsCases
  )
  createErrorDescribe("Server Actions — error cases", serverActionErrorCases)
  createErrorDescribe(
    "Server Actions — function declaration hoisting errors",
    serverActionHoistingCases
  )
  createDescribe(
    "Server Actions — function declaration hoisting success cases",
    serverActionHoistingSuccessCases
  )
  createDescribe(
    "Server Actions — path is relative to package.json dir",
    [
      [
        "path is relative to pacakge.json dir",
        `"use server"
        const foo = () => {}
        export { foo }`,
        `"use server"
        const foo = catchUncaughtAction$1337(() => {}, {
          path: "src/lib/actions.ts/foo"
        })
        export { foo }`,
        "/root/usr/my_package/src/lib/actions.ts",
      ],
    ],
    {
      packageJsonDirPath: "/root/usr/my_package",
    }
  )
})
