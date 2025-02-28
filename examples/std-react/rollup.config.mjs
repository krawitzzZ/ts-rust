import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import css from "rollup-plugin-import-css";
import url from "@rollup/plugin-url";
import copy from "rollup-plugin-copy";

/** @type {import('rollup').RollupOptions} */
export default {
  input: "src/index.tsx",
  output: {
    file: "dist/bundle.js",
    format: "iife",
    sourcemap: true,
    name: "App",
  },
  plugins: [
    typescript(),
    url({ include: ["**/*.svg"], limit: 10000, emitFiles: true }),
    css({ output: "styles.css" }),
    nodeResolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    terser({
      compress: {
        pure_funcs: ["console.log"],
      },
    }),
    copy({
      targets: [
        {
          src: "public/*",
          dest: "dist",
          transform: (contents, filename) => {
            if (filename === "index.html") {
              return contents
                .toString()
                .replace(
                  "</body>",
                  '<script src="%PUBLIC_URL%/bundle.js"></script></body>',
                )
                .replace(/%PUBLIC_URL%/g, "");
            }
            return contents;
          },
        },
      ],
    }),
  ],
  external: [],
};
