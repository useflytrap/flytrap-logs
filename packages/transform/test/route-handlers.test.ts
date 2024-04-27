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
  ],
  [
    `transform errors when using \`arguments\``,
    `export function GET() {
      arguments[0]
    }`,
  ],
]

const routeHandlerTransformOnlyExportsCases = [
  [
    `transforms exported function expression (named export)`,
    `export function GET() {}`,
    `export const GET = catchUncaughtRoute(function GET() {}, {
      path: "@/app/api/route.ts",
      method: "GET",
    })`,
    "@/app/api/route.ts",
  ],
  [
    `transforms exported function declaration (default export)`,
    `export default function POST() {}`,
    `const POST = catchUncaughtRoute(function POST() {}, {
      path: "@/app/api/route.ts",
      method: "POST"
    })
    export default POST`,
    "@/app/api/route.ts",
  ],
  [
    `transforms exported function expression (default export)`,
    `const PATCH = () => {}
    export default PATCH`,
    `const PATCH = catchUncaughtRoute(() => {}, {
      path: "@/app/api/route.ts",
      method: "PATCH",
    })
    export default PATCH`,
    "@/app/api/route.ts",
  ],
  [
    `transforms exported function expression (late export)`,
    `const DELETE = () => {}
    export { DELETE }`,
    `const DELETE = catchUncaughtRoute(() => {}, {
      path: "@/app/api/route.ts",
      method: "DELETE",
    })
    export { DELETE }`,
    "@/app/api/route.ts",
  ],
  [
    `doesn't transform non-valid HTTP methods`,
    `export const GEt = () => {}`,
    `export const GEt = () => {}`,
  ],
]

const routeHandlerHoistingCases = [
  [
    `errors for non-hoisted exported function declarations (named)`,
    `GET()
    export function GET() {}`,
  ],
  [
    `errors for non-hoisted exported function declarations (default)`,
    `GET()
    export default function GET() {}`,
  ],
]

describe("Route Handler transforms", () => {
  createDescribe(
    "Route Handlers — exports",
    routeHandlerTransformOnlyExportsCases
  )
  createErrorDescribe("Route Handlers — error cases", routeHandlerErrorCases)
  createErrorDescribe(
    "Route Handlers — function declaration hoisting errors",
    routeHandlerHoistingCases
  )
})
