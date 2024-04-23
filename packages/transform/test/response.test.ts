import { describe, expect, it } from "vitest"
import { unpluginFactory } from "../src"
import { UnpluginOptions } from "unplugin"

import { parse } from "@babel/parser"
import generate from "@babel/generator"

const mockPlugin = unpluginFactory(
  {},
  {
    framework: "vite",
  }
) as UnpluginOptions

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
    `addContext({ res: "Hello World" }); new Response("Hello World")`,
  ],
  [
    "adds status to context from `new Response`",
    `new Response("Hello World", { status: 200 })`,
    `addContext({ res: "Hello World" }); new Response("Hello World", { status: 200 })`,
  ],
  [
    "undefined ResponseInit",
    `new Response("Hello World", undefined);`,
    `addContext({ res: "Hello World" }); new Response("Hello World", undefined);`,
  ],
]

describe("Response transforms", () => {
  describe("Response.json", () => {
    for (let i = 0; i < responseJsonCases.length; i++) {
      const [fixtureName, fixture, target] = responseJsonCases[i]
      it(fixtureName, () => {
        // @ts-expect-error: unplugin needs binding, but it's not necessary for tests
        const transformedCode = mockPlugin.transform!(fixture, "")!.code

        const transformedAst = parse(transformedCode)
        const targetAst = parse(target)

        expect(generate(transformedAst, {}, fixture).code).toBe(
          generate(targetAst, {}, target).code
        )
      })
    }
  })

  describe("Response.redirect", () => {
    for (let i = 0; i < responseRedirectCases.length; i++) {
      const [fixtureName, fixture, target] = responseRedirectCases[i]
      it(fixtureName, () => {
        // @ts-expect-error: unplugin needs binding, but it's not necessary for tests
        const transformedCode = mockPlugin.transform!(fixture, "")!.code

        const transformedAst = parse(transformedCode)
        const targetAst = parse(target)

        expect(generate(transformedAst, {}, fixture).code).toBe(
          generate(targetAst, {}, target).code
        )
      })
    }
  })

  describe("new Response", () => {
    for (let i = 0; i < responseInstanceCases.length; i++) {
      const [fixtureName, fixture, target] = responseInstanceCases[i]
      it(fixtureName, () => {
        // @ts-expect-error: unplugin needs binding, but it's not necessary for tests
        const transformedCode = mockPlugin.transform!(fixture, "")!.code

        const transformedAst = parse(transformedCode)
        const targetAst = parse(target)

        expect(generate(transformedAst, {}, fixture).code).toBe(
          generate(targetAst, {}, target).code
        )
      })
    }
  })
})
