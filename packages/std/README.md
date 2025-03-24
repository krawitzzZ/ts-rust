# @ts-rust/std

A TypeScript library inspired by Rust’s `Option<T>` and `Result<T, E>` types, designed to bring type-safe, ergonomic, and robust value and error handling to JavaScript projects. Built with TypeScript, `@ts-rust/std` ensures no runtime errors are thrown by leveraging static typing and functional programming patterns.

This package is part of the `@ts-rust` monorepo, which adapts Rust’s standard library concepts into idiomatic TypeScript.

## Philosophy

In JavaScript, handling optional values and errors often relies on `null`, `undefined`, or throwing exceptions—approaches that can lead to runtime errors and untyped code. Inspired by Rust’s `Option` and `Result` types, `@ts-rust/std` offers a safer alternative:

- **Type Safety**: Catch errors at compile time with TypeScript’s type system.
- **No Runtime Errors**: Avoid `undefined is not a function` or similar surprises.
- **Ergonomic Design**: Chain operations with methods like `map`, `andThen`, and `unwrapOr`.
- **Async Support**: Handle asynchronous operations with `PendingOption` and `PendingResult`.

Think of this library as a bridge between Rust’s disciplined approach to safety and TypeScript’s flexibility, making your code more predictable and maintainable.

## Installation

Install `@ts-rust/std` via npm, yarn, or pnpm:

```bash
npm install @ts-rust/std
yarn add @ts-rust/std
pnpm add @ts-rust/std
```

Ensure you have TypeScript installed in your project, as this library relies on its type system for maximum benefit.

## Usage

Here are some quick examples to get you started. For detailed documentation, see:

- [Option README](./option/README.md)
- [Result README](./result/README.md)

### Handling Optional Values with `Option<T>`

```typescript
import { some, none, Option } from "@ts-rust/std";

function findUser(id: number): Option<string> {
  return id === 1 ? some("Alice") : none();
}

const user = findUser(1);
console.log(user.unwrapOr("Guest")); // "Alice"

const missingUser = findUser(2);
console.log(missingUser.unwrapOr("Guest")); // "Guest"
```

### Handling Errors with `Result<T, E>`

```typescript
import { ok, err, Result } from "@ts-rust/std";

function divide(a: number, b: number): Result<number, string> {
  return b !== 0 ? ok(a / b) : err("Division by zero");
}

const success = divide(10, 2);
console.log(success.unwrapOr(0)); // 5

const failure = divide(10, 0);
console.log(failure.unwrapOr(0)); // 0
```

### Async Operations

For asynchronous workflows, use `PendingOption` and `PendingResult`,
which wrap promises and provide similar methods for chaining operations:

```typescript
import { pendingResult } from "@ts-rust/std";

async function fetchData(id: number): Result<string, Error> {
  const res = pendingResult(async () => {
    try {
      const response = await fetch(
        `https://jsonplaceholder.typicode.com/users/${id}`,
      );
      return ok<{ name: string }, Error>(response.json());
    } catch (error) {
      return err<{ name: string }, Error>(error);
    }
  });
  return res.map((data) => data.name);
}

fetchData(1).then((result) => console.log(result.unwrapOr("Unknown")));
```

## Key Exports

- `Option<T>`, `some`, `none`: For handling optional values.
- `Result<T, E>`, `ok`, `err`: For handling success/error scenarios.
- `PendingOption<T>`, `pendingOption`, `pendingSome`, `pendingNone`: Async optional values.
- `PendingResult<T, E>`, `pendingResult`, `pendingOk`, `pendingErr`: Async success/error handling.

## Contributing

We welcome contributions! If you find a bug or have a feature request:

1. Check the [issue tracker](https://github.com/krawitzzZ/ts-rust/issues) to see if it’s already reported.
2. Open a new issue with a clear title, description, and reproduction steps (if applicable).
3. For code contributions, fork the repo, create a branch, and submit a pull request.

Please follow the [code of conduct](../../CODE_OF_CONDUCT.md) when interacting with the project.
