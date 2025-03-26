# @ts-rust/std

A TypeScript library inspired by Rust’s
[`Option<T>`](https://doc.rust-lang.org/std/option/enum.Option.html) and
[`Result<T, E>`](https://doc.rust-lang.org/std/result/enum.Result.html) types,
designed to bring type-safe, ergonomic, and robust value and error handling to
JavaScript projects. Built with TypeScript, `@ts-rust/std` ensures no runtime
errors are thrown by leveraging static typing and functional programming patterns.

This package is part of the `@ts-rust` monorepo, which adapts Rust’s standard
library concepts into idiomatic TypeScript.

## Philosophy

JavaScript often handles optional values and errors using `null`, `undefined`,
or thrown exceptions—approaches that can lead to runtime errors and untyped,
unpredictable code. In contrast, modern languages like [Go](https://go.dev/) and
[Rust](https://www.rust-lang.org/) take a different approach: instead of throwing
exceptions, they return errors as values, forcing the caller to explicitly handle
or ignore them. Inspired by Rust’s `Option` and `Result` types, `@ts-rust/std`
brings this disciplined error-handling model to JavaScript and TypeScript,
offering a safer and more explicit way to manage errors and optional values.

In Rust, error handling is deeply integrated into the language. Functions either
return a `Result` (or `Option`) to indicate success or failure, or they panic to
signal an unrecoverable error. JavaScript, however, operates differently: errors
can be thrown synchronously (caught with `try/catch`) or asynchronously (via
rejected promises). While handling both cases is straightforward in theory,
real-world applications often result in "messy" and "noisy" code, especially
when dealing with asynchronous operations like unhandled promise rejections.
`@ts-rust/std` addresses this by providing `Option` and `Result` types—along with
their asynchronous counterparts, `PendingOption` and `PendingResult`—to simplify
error handling, making it explicit, predictable, and safe.

The core philosophy of this library is to ensure "safe options and results."
Once execution enters a method of `Option`, `Result`, or their pending variants,
no synchronous or asynchronous exceptions will be thrown or rejected unless
explicitly documented. For example, methods like `unwrap` and `expect` are
designed to throw (or reject, in async contexts) when called inappropriately,
mirroring Rust’s behavior where a method would panic. In all other cases, errors
are handled gracefully by returning `None` or `Err`, preventing unexpected runtime
failures. This design makes the library’s behavior predictable and aligns with
Rust’s safety guarantees, adapted for JavaScript’s single-threaded, asynchronous
nature.

JavaScript’s single-threaded model eliminates concerns like race conditions and
unsafe multi-threaded operations (common in Rust’s async runtimes), but it
introduces challenges like properly handling asynchronous behavior—think
"unhandled promise rejection" errors. To address this, `@ts-rust/std` clearly
separates synchronous and asynchronous APIs. For instance, many methods on
`Result` and `Option` restrict their `this` type to `SettledResult<T, E>` or
`SettledOption<T>`, ensuring that the inner value is `Awaited<T>` before
operations like `unwrap` or `check` can be called. The library provides a variety
of methods to help settle promises safely, making async workflows seamless and
type-safe.

Key features of `@ts-rust/std` include:

- **Type Safety**: Leverage TypeScript’s type system to catch errors at
  compile time.
- **No Runtime Surprises**: Avoid issues like `undefined is not a function` or
  `unhandled promise rejection`.
- **Ergonomic Design**: Chain operations with methods like `map`, `andThen`,
  and `unwrapOr` for a fluent API.
- **Async Support**: Handle asynchronous operations effortlessly with
  `PendingOption` and `PendingResult`.

This library acts as a bridge between Rust’s disciplined approach to safety and
TypeScript’s flexibility, helping you write more predictable, maintainable, and
error-resistant code. Whether you’re handling optional values or managing errors
in synchronous or asynchronous contexts, `@ts-rust/std` empowers you to do so
with confidence and clarity.

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

- [Option README](./src/option/README.md)
- [Result README](./src/result/README.md)

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
import { pendingResult, ok, err } from "@ts-rust/std";

function fetchData(id: number): PendingResult<string, Error> {
  return pendingResult(async () => {
    try {
      const response = await fetch(
        `https://jsonplaceholder.typicode.com/users/${id}`,
      );
      const data = await response.json();
      return ok<{ name: string }, Error>(data as { name: string });
    } catch (error) {
      return err<{ name: string }, Error>(
        error instanceof Error ? error : new Error(`unknown error: ${error}`),
      );
    }
  })
    .map((data) => data.name)
    .inspectErr((error) => {
      console.error(`Failed to fetch data: ${error.get()}`);
    });
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
