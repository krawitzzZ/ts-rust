"use strict";

import eslint from "@eslint/js";
import tslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";
import imports from "eslint-plugin-import";

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
    files: ["**/*.js", "**/*spec.ts"],
    ...tslint.configs.disableTypeChecked,
  },

  {
    name: "Default rules",
    plugins: { import: imports },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "import/no-cycle": "error",
      "import/order": "error",
      "import/prefer-default-export": "off",
      "import/no-relative-packages": "off",
      "import/no-extraneous-dependencies": [
        "error",
        { devDependencies: ["**/*.spec.ts"] },
      ],
      "import/no-cycle": ["error", { maxDepth: 1 }],
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
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowBoolean: true, allowNumber: true },
      ],
    },
  },

  {
    name: "Interface Rules",
    files: ["**/*interface.ts", "**/*types.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    },
  },

  prettier,
  { name: "ConfigPrettier-Exception" },
  {
    ignores: [
      "eslint.config.mjs",
      "rollup.config.mjs",
      "jest.config.js",
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
    ],
  },
];
