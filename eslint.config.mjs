"use strict";

import eslint from "@eslint/js";
import tslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";
import { importX } from "eslint-plugin-import-x";

/** @type {import('eslint').Linter.Config[]} */
export default [
  eslint.configs.recommended,

  ...tslint.configs.strictTypeChecked,
  ...tslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.jest },
      parserOptions: { projectService: true },
    },
  },

  {
    name: "JavaScript and tests",
    files: ["**/*.js", "**/*spec.ts"],
    ...tslint.configs.disableTypeChecked,
  },

  {
    name: "Default rules",
    plugins: { "import-x": importX },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "import-x/order": "error",
      "import-x/prefer-default-export": "off",
      "import-x/no-relative-packages": "off",
      "import-x/no-extraneous-dependencies": [
        "error",
        { devDependencies: ["**/*.spec.ts"] },
      ],
      "import-x/no-cycle": ["error", { maxDepth: 1, ignoreExternal: true }],
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-shadow": ["error"],
      "@typescript-eslint/no-useless-constructor": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "none", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-extraneous-class": [
        "error",
        { allowWithDecorator: true },
      ],
    },
  },

  {
    name: "Typed rules",
    ignores: ["**/*.js", "**/*spec.ts"],
    rules: {
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowBoolean: true, allowNumber: true },
      ],
    },
  },

  {
    name: "Interface Rules",
    files: ["**/interface/*.ts", "**/*interface.ts", "**/*types.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    },
  },

  {
    name: "Tests",
    files: ["**/*.spec.ts"],
    rules: {
      "import-x/no-extraneous-dependencies": "off",
    },
  },

  prettier,
  { name: "ConfigPrettier-Exception" },
  {
    ignores: [
      "**/sandbox.dev.ts",
      "eslint.config.mjs",
      "rollup.config.mjs",
      "jest.config.js",
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
    ],
  },
];
