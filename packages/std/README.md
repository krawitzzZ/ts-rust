# @ts-rust/std

A TypeScript library inspired by Rust's
[`Option<T>`](https://doc.rust-lang.org/std/option/enum.Option.html) and
[`Result<T, E>`](https://doc.rust-lang.org/std/result/enum.Result.html) types,
designed to bring type-safe, ergonomic, and robust value and error handling to
JavaScript projects. Built with TypeScript, `@ts-rust/std` ensures no runtime
errors are thrown by leveraging static typing and functional programming patterns.

This package is part of the `@ts-rust` monorepo, which adapts Rust's standard
library concepts into idiomatic TypeScript.

## Installation

```bash
npm install @ts-rust/std
```

## Quick Example

```typescript
import { some, none, ok, err } from "@ts-rust/std";

// Option: handle missing values explicitly
function findUser(id: number) {
  return id === 1 ? some("Alice") : none();
}

findUser(1).unwrapOr("Guest"); // "Alice"
findUser(2).unwrapOr("Guest"); // "Guest"

// Result: handle errors as values
function divide(a: number, b: number) {
  return b !== 0 ? ok(a / b) : err("Division by zero");
}

divide(10, 2).unwrapOr(0);  // 5
divide(10, 0).unwrapOr(0);  // 0
```

## Documentation

For detailed documentation, visit [krawitzzz.github.io/ts-rust](https://krawitzzz.github.io/ts-rust/).

## Key Exports

- `Option<T>`, `some`, `none`: For handling optional values.
- `Result<T, E>`, `ok`, `err`: For handling success/error scenarios.
- `PendingOption<T>`, `pendingOption`, `pendingSome`, `pendingNone`: Async optional values.
- `PendingResult<T, E>`, `pendingResult`, `pendingOk`, `pendingErr`: Async success/error handling.

## Contributing

We welcome contributions! If you find a bug or have a feature request:

1. Check the [issue tracker](https://github.com/krawitzzZ/ts-rust/issues) to see if it's already reported.
2. Open a new issue with a clear title, description, and reproduction steps (if applicable).
3. For code contributions, fork the repo, create a branch, and submit a pull request.

Please follow the [code of conduct](../../CODE_OF_CONDUCT.md) when interacting with the project.
