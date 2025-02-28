# @ts-rust Monorepo

Welcome to `@ts-rust`, a TypeScript monorepo that brings Rust-inspired utilities
and patterns to JavaScript environments. This project adapts concepts from Rust’s
standard library (std)—such as Option and Result—into idiomatic TypeScript, offering
type-safe, robust alternatives to traditional JavaScript error handling and optional
value management.

The primary package, `@ts-rust/std`, provides a foundation for building reliable
applications with Rust-like ergonomics, while `@ts-rust/internal` contains shared
utilities used across the monorepo’s packages.

## Features

- Rust-Inspired Primitives: Implements `Option<T>` and `Result<T, E>` with TypeScript’s type system.
- Type Safety: Leverages TypeScript’s static typing to catch errors at compile time.
- Asynchronous Support: Includes `PendingOption` and `PendingResult` for handling async operations.
- Monorepo Structure: Managed with pnpm workspaces for modular development and dependency management.

## Packages

- `@ts-rust/std`: The core library, providing Rust’s std-like functionality for TypeScript.

  - Key exports: `Option`, `some`, `none`, `PendingOption`, `pendingOption`, `Result`, `ok`, `err`.
  - Location: `packages/std`.

- `@ts-rust/internal`: Internal utilities supporting `@ts-rust/std` and future packages.

  - Not intended for public use; bundled into dependent packages.
  - Location: `packages/internal`.

## License

This project is licensed under the MIT License — see the LICENSE file for details.

## Acknowledgements

Inspired by Rust’s std library and its focus on safety and performance.

Built with ❤️ using TypeScript, pnpm, and Rollup.
