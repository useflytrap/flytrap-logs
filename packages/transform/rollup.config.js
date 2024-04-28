import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve';

const RESOLVED_PACKAGES = [
	"ts-results",
	'@useflytrap/logs-shared'
]
const EXTERNALS = ["unplugin", "@babel/parser", "@babel/traverse", "@babel/generator", "@babel/types"];

/** @type {import('rollup').RollupOptions[]} */
export default [
	// ESM build
	{
		input: ["src/exports.ts"],
    external: EXTERNALS,
		plugins: [
			nodeResolve({ resolveOnly: RESOLVED_PACKAGES }),
			esbuild(),
			commonjs()
		],
		output: [
			{
				dir: "dist",
				entryFileNames: "index.mjs",
				format: "esm",
				exports: "named",
				sourcemap: true,
			},
		],
	},
	// CJS build
	{
		input: ["src/exports.ts"],
    external: EXTERNALS,
		plugins: [
			nodeResolve({ resolveOnly: RESOLVED_PACKAGES }),
      esbuild(),
      commonjs()
    ],
		output: [
			{
				dir: "dist",
				entryFileNames: "index.cjs",
				format: "cjs",
				exports: "named",
				sourcemap: true,
			},
		],
	},
	{
		input: ["src/exports.ts"],
		plugins: [dts()],
		output: [
			{
				dir: "dist",
				entryFileNames: "index.d.ts",
				format: "esm",
				exports: "named",
			},
			{
				dir: "dist",
				entryFileNames: "index.d.mts",
				format: "esm",
				exports: "named",
			},
			{
				dir: "dist",
				entryFileNames: "index.d.cts",
				format: "esm",
				exports: "named",
			},
		],
	},
]
