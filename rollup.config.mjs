import typescript from "@rollup/plugin-typescript";

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: "src/index.ts",
    output: [
      { file: "dist/index.es.js", format: "es" },
      { file: "dist/index.cjs.js", format: "cjs" },
    ],
    plugins: [typescript()],
  },
];
