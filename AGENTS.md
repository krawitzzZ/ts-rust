# AGENTS.md

## Project Overview

TypeScript monorepo providing Rust-inspired utility types for JavaScript. Core
library `@ts-rust/std` implements `Option<T>` and `Result<T, E>` with full async
support. Influenced by Rust's standard library but does not strictly follow Rust
conventions 1:1.

## Project Structure

- `packages/std` — Core library (published to npm as `@ts-rust/std`). Option,
- Result, PendingOption, PendingResult, error types. `packages/shared` — Internal
- shared utilities (private). FP primitives, LazyPromise, stringify.
- `documentation/` — Docusaurus documentation site.

## Setup

```bash
pnpm install --frozen-lockfile
```

Requires Node >= 20.19.0 and pnpm 11.17.0.

## Build & Dev Commands

- `pnpm build` — Build all packages (excludes shared, builds in dependency order)
- `pnpm build:docs` — Build documentation site
- `pnpm test` — Run all tests
- `pnpm test:cov` — Run tests with coverage
- `pnpm lint` — Lint all packages
- `pnpm lint:fix` — Lint with auto-fix
- `pnpm format` — Check formatting (Prettier)
- `pnpm format:fix` — Auto-format
- `pnpm typecheck` — Type-check all packages
- `pnpm check` — Full CI pipeline: typecheck + lint + format + build + test:cov

## Before Committing

Always run `pnpm check` and ensure it passes before committing.
Do not co-author commits.

## Code Style

- 2-space indentation, double quotes, semicolons always, trailing commas,
  LF line endings
- 80-character print width
- Strict TypeScript with all strict flags enabled
- Named imports exclusively; use `type` keyword for type-only imports
- ES private fields (`#prefix`) for internal state
- Private constructors with factory functions
  (e.g. `some()`, `none()`, `ok()`, `err()`)
- Interface/type files are separate from implementation files
- Barrel exports via `index.ts` with module-level JSDoc

## Naming Conventions

- Files: `kebab-case.ts`
- Classes: `PascalCase` with `_` prefix for internal (e.g. `_Option`, `_Result`)
- Interfaces: `PascalCase` (e.g. `Optional`, `Resultant`)
- Functions: `camelCase`
- Type parameters: single uppercase letters (`T`, `E`, `U`)

## Testing

- Jest with `@swc/jest` transformer
- Test files colocated with source as `*.spec.ts`
- Coverage thresholds: 85% statements, 80% branches, 90% functions, 85% lines
- Use `describe`/`it` blocks with lowercase test descriptions
- Cover both happy paths and error cases

## Commit Convention

Conventional commits enforced via commitlint. Scopes: `shared`, `std`, `docs`,
`ci`, `tests`. Format: `type(scope): sentence-case subject` (max 60 chars).

## Error Handling Philosophy

- `Option` callbacks that throw return `None` silently
- `Result` callbacks that throw return `Err(UnexpectedError)`
- Custom `AnyError<T>` base class with typed `kind` and `reason` chain
- `CheckedError<E>` discriminated union for expected vs unexpected errors

## Architecture Notes

- Immutable by default; mutation only through explicit `insert`, `getOrInsert`,
  `replace`, `take`
- `phantom` symbol for type-safe discriminated unions without runtime overhead
- Full async support: every sync type has a `Pending` counterpart with identical
  API surface
- Known circular dependencies between Option and Result are documented and
  suppressed in Rollup config
- Dual module output: ESM and CJS
