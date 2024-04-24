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
      const [fixtureName, fixture, target] = testCases[i]
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
}
