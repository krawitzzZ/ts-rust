import * as fs from "fs";
import * as path from "path";
import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const apiDir = path.resolve(__dirname, "docs/std/api");
const apiGenerated =
  fs.existsSync(apiDir) && fs.existsSync(path.join(apiDir, "index.mdx"));

let typeDocSidebar: { items: unknown[] } = { items: [] };
if (apiGenerated) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access
    typeDocSidebar = require("./docs/std/api/typedoc-sidebar").default;
  } catch {
    // typedoc sidebar not yet generated
  }
}

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  stdSidebar: [
    "std/index",
    {
      type: "category",
      label: "Optional",
      link: {
        type: "generated-index",
        slug: "std/optional",
      },
      items: [
        {
          type: "doc",
          id: "std/optional/option",
          label: "Option",
        },
        {
          type: "doc",
          id: "std/optional/pending-option",
          label: "PendingOption",
        },
        {
          type: "doc",
          id: "std/optional/functions",
          label: "Functions",
        },
      ],
    },
    {
      type: "category",
      label: "Resultant",
      link: {
        type: "generated-index",
        slug: "std/resultant",
      },
      items: [
        {
          type: "doc",
          id: "std/resultant/result",
          label: "Result",
        },
        {
          type: "doc",
          id: "std/resultant/pending-result",
          label: "PendingResult",
        },
        {
          type: "doc",
          id: "std/resultant/functions",
          label: "Functions",
        },
      ],
    },
    {
      type: "category",
      label: "Errors",
      link: {
        type: "generated-index",
        slug: "std/errors",
      },
      items: [
        {
          type: "doc",
          id: "std/errors/any-error",
          label: "AnyError",
        },
        {
          type: "doc",
          id: "std/errors/option-error",
          label: "OptionError",
        },
        {
          type: "doc",
          id: "std/errors/result-error",
          label: "ResultError",
        },
        {
          type: "doc",
          id: "std/errors/checked-error",
          label: "CheckedError",
        },
      ],
    },
  ],
};

if (apiGenerated) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (sidebars.stdSidebar as any[]).push({
    type: "category",
    label: "API",
    link: {
      type: "doc",
      id: "std/api/index",
    },
    items: typeDocSidebar.items,
  });
}

export default sidebars;
