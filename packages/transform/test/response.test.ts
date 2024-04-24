import { describe } from "vitest"
import { createDescribe } from "./test-utils"

const responseJsonCases = [
  [
    "does not transform non-global `Response`",
    `const Response = {}; Response.json({});`,
    `const Response = {}; Response.json({});`,
  ],
  [
    "does not transform non-global `Response` (parent scope)",
    `const Response = {};\n{ Response.json({}); }`,
    `const Response = {};\n{ Response.json({}); }`,
  ],
  [
    "does not transform non-global `Response` (grandparent scope)",
    `const Response = {};\n{{ Response.json({}); }}`,
    `const Response = {};\n{{ Response.json({}); }}`,
  ],
  ["passes on args to `Response.json`", `Response.json('')`, `json('')`],
  [
    "passes on args to `Response.json`",
    `Response.json('', {})`,
    `json('', {})`,
  ],
  [
    "passes on args to `Response.json`",
    `Response.json('', { status: 400 })`,
    `json('', { status: 400 })`,
  ],
]

const nextResponseJsonCases = [
  [
    "passes on args to `NextResponse.json`",
    `NextResponse.json('')`,
    `nextJson('')`,
  ],
  [
    "passes on args to `NextResponse.json`",
    `NextResponse.json('', {})`,
    `nextJson('', {})`,
  ],
  [
    "passes on args to `NextResponse.json`",
    `NextResponse.json('', { status: 400 })`,
    `nextJson('', { status: 400 })`,
  ],
]

const responseRedirectCases = [
  [
    "does not transform non-global `Response`",
    `const Response = {}; Response.redirect({});`,
    `const Response = {}; Response.redirect({});`,
  ],
  [
    "does not transform non-global `Response` (parent scope)",
    `const Response = {};\n{ Response.redirect({}); }`,
    `const Response = {};\n{ Response.redirect({}); }`,
  ],
  [
    "does not transform non-global `Response` (grandparent scope)",
    `const Response = {};\n{{ Response.redirect({}); }}`,
    `const Response = {};\n{{ Response.redirect({}); }}`,
  ],
  [
    "passes on args to `Response.redirect`",
    `Response.redirect('')`,
    `redirect('')`,
  ],
  [
    "passes on args to `Response.redirect`",
    `Response.redirect('', 400)`,
    `redirect('', 400)`,
  ],
]

const nextResponseRedirectCases = [
  [
    "passes on args to `NextResponse.redirect`",
    `NextResponse.redirect('')`,
    `nextRedirect('')`,
  ],
  [
    "passes on args to `NextResponse.redirect`",
    `NextResponse.redirect('', 400)`,
    `nextRedirect('', 400)`,
  ],
]

const responseInstanceCases = [
  [
    "does not transform non-global `Response`",
    `class Response {}; new Response()`,
    `class Response {}; new Response()`,
  ],
  [
    "does not transform non-global `Response` (parent scope)",
    `class Response {}; { new Response(); }`,
    `class Response {}; { new Response(); }`,
  ],
  [
    "does not transform non-global `Response` (grandparent scope)",
    `class Response {}; {{ new Response(); }}`,
    `class Response {}; {{ new Response(); }}`,
  ],
  [
    "adds body to context from `new Response`",
    `new Response("Hello World")`,
    `response("Hello World")`,
  ],
  [
    "adds status to context from `new Response`",
    `new Response("Hello World", { status: 200 })`,
    `response("Hello World", { status: 200 })`,
  ],
  [
    "undefined ResponseInit",
    `new Response("Hello World", undefined);`,
    `response("Hello World", undefined);`,
  ],
  [
    "Returning Response",
    `const x = () => new Response("Hello World", undefined);`,
    `const x = () => response("Hello World", undefined);`,
  ],
]

const nextResponseInstanceCases = [
  [
    "adds body to context from `new Response`",
    `new NextResponse("Hello World")`,
    `nextResponse("Hello World")`,
  ],
  [
    "adds status to context from `new Response`",
    `new NextResponse("Hello World", { status: 200 })`,
    `nextResponse("Hello World", { status: 200 })`,
  ],
  [
    "undefined ResponseInit",
    `new NextResponse("Hello World", undefined);`,
    `nextResponse("Hello World", undefined);`,
  ],
  [
    "Returning NextResponse",
    `const x = () => new NextResponse("Hello World", undefined);`,
    `const x = () => nextResponse("Hello World", undefined);`,
  ],
]

describe("Response transforms", () => {
  createDescribe("Response.json", responseJsonCases)
  createDescribe("NextResponse.json", nextResponseJsonCases)

  createDescribe("Response.redirect", responseRedirectCases)
  createDescribe("NextResponse.redirect", nextResponseRedirectCases)

  createDescribe("new Response", responseInstanceCases)
  createDescribe("new NextResponse", nextResponseInstanceCases)
})
