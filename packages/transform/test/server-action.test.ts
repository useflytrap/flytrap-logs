import { describe } from "vitest"
import { createDescribe, createErrorDescribe } from "./test-utils"

const serverActionDirectiveCases = [
  [
    `transforms files with "use server" directive at the top`,
    `"use server"
    
    export async function foo() {}`,
    `"use server"
    
    export const foo = catchUncaughtAction(async function foo() {
    }, {
      path: "@/lib/actions/foo"
    })`,
    `@/lib/actions.ts`,
  ],
  [
    `doesn't transform files without "use server" directive at the top`,
    `export async function foo() {}`,
    `export async function foo() {}`,
  ],
]

const serverActionErrorCases = [
  [
    `transform errors when using \`.bind\``,
    `"use server"
    
    const x = () => {}
    x.bind(null)()`,
  ],
  [
    `transform errors when using \`this\``,
    `"use server"
    
    const x = () => { this }`,
  ],

  [
    `transform errors when using \`arguments\``,
    `"use server"
    
    const x = () => {
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
    export const foo = catchUncaughtAction(() => {}, {
      path: "@/lib/actions/foo"
    })`,
    `@/lib/actions.ts`,
  ],
  [
    `transforms exported function declaration (default export)`,
    `"use server"
    export default function foo() {}`,
    `"use server"
    export default catchUncaughtAction(function foo() {}, {
      path: "@/lib/actions/foo"
    })`,
    `@/lib/actions.ts`,
  ],
  [
    `transforms exported function expression (default export)`,
    `"use server"
    const foo = () => {}
    export default foo`,
    `"use server"
    const foo = catchUncaughtAction(() => {}, {
      path: "@/lib/actions/foo"
    })
    export default foo`,
    `@/lib/actions.ts`,
  ],
  [
    `transforms exported function expression (late export)`,
    `"use server"
    const foo = () => {}
    export { foo }`,
    `"use server"
    const foo = catchUncaughtAction(() => {}, {
      path: "@/lib/actions/foo"
    })
    export { foo }`,
    `@/lib/actions.ts`,
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
    `hoists exported function declarations`,
    `"use server"
    foo()
    export function foo() {}`,
    `"use server"
    const foo = catchUncaughtAction(() => {}, {
      path: "@/lib/actions/foo"
    })
    foo()`,
    `@/lib/actions.ts`,
  ],
  [
    `doesn't hoist function expressions`,
    `"use server"
    foo()
    export const foo = () => {}`,
    `"use server"
    foo()
    const foo = catchUncaughtAction(() => {}, {
      path: "@/lib/actions/foo"
    })`,
    `@/lib/actions.ts`,
  ],
]

describe("Server Action transforms", () => {
  // createDescribe("Server Actions — directives", serverActionDirectiveCases)
  createDescribe(
    "Server Actions — exports",
    serverActionTransformOnlyExportsCases
  )
  /* createDescribe("Server Actions — exports", serverActionTransformOnlyExportsCases)
  createDescribe("Server Actions — function declaration hoisting", serverActionHoistingCases)
  createErrorDescribe("Server Actions — error cases", serverActionErrorCases) */
})
