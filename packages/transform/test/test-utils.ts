import { describe, expect, it } from "vitest"
import { parse } from "@babel/parser"
import generate from "@babel/generator"
import { unpluginFactory } from "../src"
import { UnpluginOptions } from "unplugin"
import { LogsPluginOptions } from "../src/types"

export function createDescribe(
  name: string,
  testCases: string[][],
  options: LogsPluginOptions = {}
) {
  describe(name, () => {
    for (let i = 0; i < testCases.length; i++) {
      const [fixtureName, fixture, target, filepath = "/file.ts"] = testCases[i]

      const mockPlugin = unpluginFactory(
        {
          diffs: false,
          autoImports: false,
          packageJsonDirPath: "/",
          ...options,
        },
        {
          framework: "vite",
        }
      ) as UnpluginOptions

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

export function createErrorDescribe(
  name: string,
  testCases: string[][],
  options: LogsPluginOptions = {}
) {
  const mockPlugin = unpluginFactory(
    {
      diffs: false,
      autoImports: false,
      packageJsonDirPath: "/",
      ...options,
    },
    {
      framework: "vite",
    }
  ) as UnpluginOptions

  describe(name, () => {
    for (let i = 0; i < testCases.length; i++) {
      const [fixtureName, fixture, filepath = "/file.ts"] = testCases[i]
      it(fixtureName, () => {
        expect(() => {
          // @ts-expect-error: unplugin needs binding, but it's not necessary for tests
          return mockPlugin.transform!(fixture, filepath)!.code
        }).toThrowError()
      })
    }
  })
}
