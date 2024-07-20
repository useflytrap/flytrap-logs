import { describe } from "vitest"
import { createDescribe } from "./test-utils"

const onlyServerComponents = [
  [
    "client component (tsx)",
    `"use client";
    export default function Home() {}`,
    `"use client";
    export default function Home() {}`,
    "/app/page.tsx",
  ],
  [
    "client component (js)",
    `"use client";
    export default function Home() {}`,
    `"use client";
    export default function Home() {}`,
    "/app/page.js",
  ],
  [
    "client component (jsx)",
    `"use client";
    export default function Home() {}`,
    `"use client";
    export default function Home() {}`,
    "/app/page.jsx",
  ],
]

const onlyPageFileCases = [
  [
    "not page file",
    `export default function Home() {}`,
    `export default function Home() {}`,
  ],
  [
    "page file (tsx)",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/"
    })
    export default Home`,
    "/app/page.tsx",
  ],
  [
    "page file (js)",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/"
    })
    export default Home`,
    "/app/page.js",
  ],
  [
    "page file (jsx)",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/"
    })
    export default Home`,
    "/app/page.jsx",
  ],
  // Dynamic routes
  [
    "page file (tsx)",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/[userId]"
    })
    export default Home`,
    "/app/[userId]/page.tsx",
  ],
  [
    "page file (js)",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/[userId]"
    })
    export default Home`,
    "/app/[userId]/page.js",
  ],
  [
    "page file (jsx)",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/[userId]"
    })
    export default Home`,
    "/app/[userId]/page.jsx",
  ],
]

const onlyTransformDefaultExport = [
  ["no export", `function Home() {}`, `function Home() {}`, "/app/page.js"],
  [
    "named export",
    `export function Home() {}`,
    `export function Home() {}`,
    "/app/page.js",
  ],
  [
    "default export",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/"
    })
    export default Home`,
    "/app/page.jsx",
  ],
  [
    "default export (referenced)",
    `function Home() {}
    export default Home`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/"
    })
    export default Home`,
    "/app/page.jsx",
  ],
]

const differentFunctionTypeCases = [
  [
    "function declaration",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/"
    })
    export default Home`,
    "/app/page.jsx",
  ],
  [
    "function expression",
    `const Home = function() {}
    export default Home`,
    `const Home = catchUncaughtPage$1337(function() {}, {
      path: "/"
    })
    export default Home`,
    "/app/page.jsx",
  ],
  [
    "arrow function expression",
    `export const Home = () => {}
    export default Home`,
    `export const Home = catchUncaughtPage$1337(() => {}, {
      path: "/",
    })
    export default Home`,
    "/app/page.jsx",
  ],
]

const correctPathCases = [
  [
    "basic route",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/"
    })
    export default Home`,
    "/app/page.js",
  ],
  [
    "dynamic route",
    `export default function Home() {}`,
    `const Home = catchUncaughtPage$1337(function Home() {}, {
      path: "/[userId]"
    })
    export default Home`,
    "/app/[userId]/page.jsx",
  ],
]

const addContextCases = [
  [
    "basic route",
    `export default function Home(params) {}`,
    `const Home = catchUncaughtPage$1337(function Home(params) {}, {
      path: "/",
      params: params
    })
    export default Home`,
    "/app/page.js",
  ],
  [
    "dynamic route",
    `export default function Home(params) {}`,
    `const Home = catchUncaughtPage$1337(function Home(params) {}, {
      path: "/[userId]",
      params: params
    })
    export default Home`,
    "/app/[userId]/page.jsx",
  ],
]

describe("SSR page transforms", () => {
  createDescribe("Only wrap page.(j|t)s(x?) files", onlyPageFileCases)
  createDescribe("Only wrap React Server Components", onlyServerComponents)
  createDescribe("Only wrap default exports", onlyTransformDefaultExport)
  createDescribe("wraps different function types", differentFunctionTypeCases)
  createDescribe("correct path", correctPathCases)
  createDescribe("adds context", addContextCases)
})
