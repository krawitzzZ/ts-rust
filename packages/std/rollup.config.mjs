import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

// Due to relations between option and result some circular dependencies
// are inevitable. but those are known, tested and safe.
const knownCircularDeps = [
  "packages/std/src/option/index.ts",
  "packages/std/src/option/option.ts",
  "packages/std/src/result/index.ts",
  "packages/std/src/result/result.ts",
  "packages/std/src/option/index.ts",
];

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: "src/index.ts",
    output: [
      { file: "dist/index.es.js", format: "es" },
      { file: "dist/index.cjs.js", format: "cjs" },
    ],
    plugins: [typescript(), nodeResolve()],
    external: [],
    onLog(level, log, handler) {
      const files = log.ids || [];
      const isKnown =
        files.length === knownCircularDeps.length &&
        knownCircularDeps.every((d) => files.find((file) => file.endsWith(d)));

      if (log.code === "CIRCULAR_DEPENDENCY" && isKnown) {
        return; // Ignore known circular dependencies
      }

      handler(level, log);
    },
  },
];
