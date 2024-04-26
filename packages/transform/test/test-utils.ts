import { describe, expect, it } from "vitest"
import { parse } from "@babel/parser"
import generate from "@babel/generator"
import { unpluginFactory } from "../src"
import { UnpluginOptions } from "unplugin"

const mockPlugin = unpluginFactory(
  {},
  {
    framework: "vite",
  }
) as UnpluginOptions

export function createDescribe(name: string, testCases: string[][]) {
  describe(name, () => {
    for (let i = 0; i < testCases.length; i++) {
      const [fixtureName, fixture, target, filepath = ""] = testCases[i]
      it(fixtureName, () => {
        // @ts-expect-error: unplugin needs binding, but it's not necessary for tests
        const transformedCode = mockPlugin.transform!(fixture, filepath)!.code

        const transformedAst = parse(transformedCode, { sourceType: "module" })
        const targetAst = parse(target, { sourceType: "module" })

        expect(generate(transformedAst, {}, fixture).code).toBe(
          generate(targetAst, {}, target).code
        )
      })
    }
  })
}

export function createErrorDescribe(name: string, testCases: string[][]) {
  describe(name, () => {
    for (let i = 0; i < testCases.length; i++) {
      const [fixtureName, fixture, filepath = ""] = testCases[i]
      it(fixtureName, () => {
        expect(() => {
          // @ts-expect-error: unplugin needs binding, but it's not necessary for tests
          return mockPlugin.transform!(fixture, filepath)!.code
        }).toThrowError()
      })
    }
  })
}
