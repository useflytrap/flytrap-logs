import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import commonjs from '@rollup/plugin-commonjs'

/** @type {import('rollup').RollupOptions[]} */
export default [
	// ESM build
	{
		input: ["src/index.ts"],
		plugins: [esbuild(), commonjs()],
		output: [
			{
				dir: "dist",
				entryFileNames: "[name].mjs",
				format: "esm",
				exports: "named",
				sourcemap: true,
			},
      {
				dir: "dist",
				entryFileNames: "[name].cjs",
				format: "cjs",
				exports: "named",
				sourcemap: true,
			},
		],
	},
	{
		input: ["src/index.ts"],
		plugins: [dts()],
		output: [
			{
				dir: "dist",
				entryFileNames: "[name].d.ts",
				format: "esm",
				exports: "named",
			},
			{
				dir: "dist",
				entryFileNames: "[name].d.mts",
				format: "esm",
				exports: "named",
			},
			{
				dir: "dist",
				entryFileNames: "[name].d.cts",
				format: "esm",
				exports: "named",
			},
		],
	},
]
