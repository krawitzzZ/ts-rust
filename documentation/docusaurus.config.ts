import { themes as prismThemes } from "prism-react-renderer";
import { OptionDefaults, type TypeDocOptions } from "typedoc";
import type { PluginOptions } from "typedoc-plugin-markdown";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
const isDev = process.env.NODE_ENV === "development";
const apiPublicPath = isDev
  ? "http://localhost:3000/ts-rust/std/api"
  : "https://krawitzzz.github.io/ts-rust/std/api";

const config: Config = {
  title: "ts-rust",
  tagline: "Rust-inspired utilities for TypeScript",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://krawitzzz.github.io/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/ts-rust/",
  trailingSlash: false,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "krawitzzZ", // Usually your GitHub org/user name.
  projectName: "ts-rust", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        blog: false,
        sitemap: false,
        docs: {
          // Remove this to remove the "edit this page" links.
          // editUrl: "https://github.com/krawitzzz/ts-rust/",
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
          path: "docs",
          breadcrumbs: true,
          includeCurrentVersion: true,
          sidebarCollapsible: true,
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      "docusaurus-plugin-typedoc",
      // Options
      {
        id: "std-api",
        tsconfig: "../packages/std/tsconfig.json",
        entryPoints: [
          "../packages/std/src/error/index.ts",
          "../packages/std/src/result/index.ts",
          "../packages/std/src/option/index.ts",
          "../packages/std/src/types.ts",
        ],
        entryPointStrategy: "resolve",
        name: "@ts-rust/std",
        githubPages: true,
        includeVersion: false,
        excludePrivate: true,
        excludeInternal: true,
        readme: "none",
        blockTags: [...OptionDefaults.blockTags, "@notes"],

        // https://typedoc-plugin-markdown.org/docs/options
        fileExtension: ".mdx",
        useCodeBlocks: true, // check if that works ok
        indexFormat: "htmlTable",
        parametersFormat: "htmlTable",
        enumMembersFormat: "htmlTable",
        classPropertiesFormat: "htmlTable",
        typeAliasPropertiesFormat: "htmlTable",
        propertyMembersFormat: "htmlTable",
        typeDeclarationFormat: "htmlTable",
        interfacePropertiesFormat: "htmlTable",

        formatWithPrettier: true,
        publicPath: apiPublicPath,
        useHTMLEncodedBrackets: true,
        sanitizeComments: true,
        alwaysCreateEntryPointModule: false,

        // https://typedoc-plugin-markdown.org/plugins/docusaurus/options#preset-options
        out: "./docs/std/api",
        hideBreadcrumbs: false,
        hidePageHeader: false,
        entryFileName: "index.mdx",

        // https://typedoc-plugin-markdown.org/plugins/docusaurus/options#plugin-options
        sidebar: {
          autoConfiguration: true,
          typescript: true,
        },
        watch: isDev,
      } satisfies TypeDocOptions &
        PluginOptions & {
          id: string;
          sidebar: {
            autoConfiguration: true;
            typescript: true;
          };
        },
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    // image: "img/social-card.jpg",
    navbar: {
      title: "TS Rust",
      logo: {
        alt: "TS Rust Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "stdSidebar",
          position: "left",
          label: "@ts-rust/std",
        },
        {
          href: "https://github.com/krawitzzz/ts-rust",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: false,
      },
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "@ts-rust/std",
              to: "/ts-rust/std",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/krawitzzz/ts-rust",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} krawitzzZ. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["typescript"],
    },
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
