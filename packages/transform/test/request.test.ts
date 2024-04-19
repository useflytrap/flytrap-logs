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

const requestJsonCases = [
  [
    "transforms only .json calls which have no arguments",
    `x.json(1)`,
    `x.json(1)`,
  ],
  ["transforms .json", "x.json()", "parseJson(x)"],
]

const requestTextCases = [
  [
    "transforms only .text calls which have no arguments",
    `x.text(1)`,
    `x.text(1)`,
  ],
  ["transforms .text", "x.text()", "parseText(x)"],
]

const requestFormDataCases = [
  [
    "transforms only .formData calls which have no arguments",
    `x.formData(1)`,
    `x.formData(1)`,
  ],
  ["transforms .formData", "x.formData()", "parseFormData(x)"],
]

describe("Request transforms", () => {
  describe("Request.json", () => {
    for (let i = 0; i < requestJsonCases.length; i++) {
      const [fixtureName, fixture, target] = requestJsonCases[i]
      it(fixtureName, () => {
        // @ts-expect-error: unplugin needs bindign, but it's not necessary for tests
        const transformedCode = mockPlugin.transform!(fixture, "")!.code

        const transformedAst = parse(transformedCode)
        const targetAst = parse(target)

        expect(generate(transformedAst, {}, fixture).code).toBe(
          generate(targetAst, {}, target).code
        )
      })
    }
  })

  describe("Request.text", () => {
    for (let i = 0; i < requestTextCases.length; i++) {
      const [fixtureName, fixture, target] = requestTextCases[i]
      it(fixtureName, () => {
        // @ts-expect-error: unplugin needs bindign, but it's not necessary for tests
        const transformedCode = mockPlugin.transform!(fixture, "")!.code

        const transformedAst = parse(transformedCode)
        const targetAst = parse(target)

        expect(generate(transformedAst, {}, fixture).code).toBe(
          generate(targetAst, {}, target).code
        )
      })
    }
  })

  describe("Request.formData", () => {
    for (let i = 0; i < requestFormDataCases.length; i++) {
      const [fixtureName, fixture, target] = requestFormDataCases[i]
      it(fixtureName, () => {
        // @ts-expect-error: unplugin needs bindign, but it's not necessary for tests
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
