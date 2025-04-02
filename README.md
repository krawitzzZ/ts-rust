# @ts-rust Monorepo

Welcome to `@ts-rust`, a TypeScript monorepo that brings Rust-inspired utilities
and patterns to JavaScript environments. This project adapts concepts from Rust’s
standard library (std)—such as Option and Result—into idiomatic TypeScript, offering
type-safe, robust alternatives to traditional JavaScript error handling and optional
value management.

The primary package, `@ts-rust/std`, provides a foundation for building reliable
applications with Rust-like ergonomics, while `@ts-rust/shared` contains shared
utilities used across the monorepo’s packages.

## Features

- Rust-Inspired Primitives: Implements `Option<T>` and `Result<T, E>` with TypeScript’s type system.
- Type Safety: Leverages TypeScript’s static typing to catch errors at compile time.
- Asynchronous Support: Includes `PendingOption` and `PendingResult` for handling async operations.
- Monorepo Structure: Managed with pnpm workspaces for modular development and dependency management.

## Packages

- `@ts-rust/std`: The core library, providing Rust’s std-like functionality for TypeScript.

  - Key exports: `Option`, `some`, `none`, `PendingOption`, `pendingOption`, `Result`, `ok`, `err`,
    `PendingResult`, `pendingResult`. See [README.md](./packages/std/README.md) for more details
  - Location: `packages/std`.

- `@ts-rust/shared`: Internal shared utilities supporting `@ts-rust/std` and future packages.

  - Not intended for public use; bundled into dependent packages.
  - Location: `packages/shared`.

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

## Contributing

We welcome contributions! If you find a bug or have a feature request:

1. Check the [issue tracker](https://github.com/krawitzzZ/ts-rust/issues) to see if it’s already reported.
2. Open a new issue with a clear title, description, and reproduction steps (if applicable).
3. For code contributions, fork the repo, create a branch, and submit a pull request.

Please follow the [code of conduct](./CODE_OF_CONDUCT.md) when interacting with the project.

## Acknowledgements

Inspired by Rust’s std library and its focus on safety and performance.

Built with ❤️ using [TypeScript](https://www.typescriptlang.org/),
[pnpm](https://pnpm.io/), and [Rollup](https://rollupjs.org/).
