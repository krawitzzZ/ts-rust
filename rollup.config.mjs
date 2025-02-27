import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from '@rollup/plugin-node-resolve';

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: "src/index.ts",
    output: [
      { file: "dist/index.es.js", format: "es" },
      { file: "dist/index.cjs.js", format: "cjs" },
    ],
    plugins: [typescript(), nodeResolve()],
  },
];
