import { describe } from "vitest"
import { createDescribe, createErrorDescribe } from "./test-utils"

const routeHandlerErrorCases = [
  /* [
    `transform errors when using \`.bind\``,
    `"use server"
    
    export const x = () => {}
    x.bind(null)()`,
  ] */
  [
    `transform errors when using \`this\``,
    `
    export function GET() {
      this.hello
    }`,
    "route.ts",
  ],
  [
    `transform errors when using \`arguments\``,
    `export function GET() {
      arguments[0]
    }`,
    "route.ts",
  ],
]

const routeHandlerTransformOnlyExportsCases = [
  [
    `transforms exported function expression (named export)`,
    `export function GET() {}`,
    `export const GET = catchUncaughtRoute$1337(function GET() {}, {
      path: "app/api/route.ts",
      method: "GET",
    })`,
    "/app/api/route.ts",
  ],
  [
    `transforms exported function declaration (default export)`,
    `export default function POST() {}`,
    `const POST = catchUncaughtRoute$1337(function POST() {}, {
      path: "app/api/route.ts",
      method: "POST"
    })
    export default POST`,
    "/app/api/route.ts",
  ],
  [
    `transforms exported function expression (default export)`,
    `const PATCH = () => {}
    export default PATCH`,
    `const PATCH = catchUncaughtRoute$1337(() => {}, {
      path: "app/api/route.ts",
      method: "PATCH",
    })
    export default PATCH`,
    "/app/api/route.ts",
  ],
  [
    `transforms exported function expression (late export)`,
    `const DELETE = () => {}
    export { DELETE }`,
    `const DELETE = catchUncaughtRoute$1337(() => {}, {
      path: "app/api/route.ts",
      method: "DELETE",
    })
    export { DELETE }`,
    "/app/api/route.ts",
  ],
  [
    `doesn't transform non-valid HTTP methods`,
    `export const GEt = () => {}`,
    `export const GEt = () => {}`,
  ],
]

const routeHandlerHoistingErrorCases = [
  [
    `errors for non-hoisted exported function declarations (named)`,
    `GET()
    export function GET() {}`,
    "route.ts",
  ],
  [
    `errors for non-hoisted exported function declarations (named)`,
    `console.log(GET)
    export function GET() {}`,
    "route.ts",
  ],
  [
    `errors for non-hoisted exported function declarations (default)`,
    `GET()
    export default function GET() {}`,
    "route.ts",
  ],
  [
    `errors for non-hoisted exported function declarations (default)`,
    `console.log(GET)
    export default function GET() {}`,
    "route.ts",
  ],
]

const routeHandlerHoistingCases = [
  [
    `doesn't error for non-hoisted exported function declarations (regression)`,
    `async function x() {
  const project = null
}

export async function y() {
  const project = null
}`,
    `async function x() {
  const project = null
}

export async function y() {
  const project = null
}`,
  ],
  [
    `doesn't check hoisting for non-exported functions`,
    `foo()
function foo() {}
export async function GET() {}`,
    `foo()
function foo() {}
export const GET = catchUncaughtRoute$1337(async function GET() {}, {
  path: "route.ts",
  method: "GET"
})`,
    "/route.ts",
  ],
  [
    `doesn't error for imported values`,
    `import { POST as buildHandler } from "@/app/api/v1/builds/route"
export async function POST(request: NextRequest) {}`,
    `import { POST as buildHandler } from "@/app/api/v1/builds/route"
export const POST = catchUncaughtRoute$1337(async function POST(request: NextRequest) {}, {
  path: "route.ts",
  method: "POST"
})`,
    "/route.ts",
  ],
  [
    `doesn't error for types with same name`,
    `export type Hello = {}
export function Hello() {}`,
    `export type Hello = {}
export function Hello() {}`,
  ],
  [
    `doesn't error for interface with same name`,
    `export interface Hello {}
export function Hello() {}`,
    `export interface Hello {}
export function Hello() {}`,
  ],
]

describe("Route Handler transforms", () => {
  createDescribe(
    "Route Handlers — exports",
    routeHandlerTransformOnlyExportsCases
  )
  createDescribe(
    "Route Handlers — function declaration hoisting allowed cases",
    routeHandlerHoistingCases
  )
  createErrorDescribe("Route Handlers — error cases", routeHandlerErrorCases)
  createErrorDescribe(
    "Route Handlers — function declaration hoisting errors",
    routeHandlerHoistingErrorCases
  )
})
