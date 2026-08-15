# Result and PendingResult

The `@ts-rust/std` package provides `Result<T, E>` and `PendingResult<T, E>`,
inspired by Rust's `Result` type, for handling operations that can either succeed
with a value of type `T` or fail with an error of type `E`. These types offer
a type-safe alternative to exceptions, ensuring explicit error handling and
predictable behavior in both synchronous and asynchronous contexts.

## Overview of `Result<T, E>`

`Result<T, E>` represents the outcome of an operation that may succeed or fail.
It has two variants:

- `Ok<T>`: Contains a value of type `T`, indicating success.
- `Err<E>`: Contains a `CheckedError<E>`, indicating failure. The
  `CheckedError<E>` distinguishes between expected errors of type `E` and
  unexpected errors (wrapped in a `ResultError`).

Use `Result<T, E>` to:

- Handle errors explicitly without relying on exceptions.
- Chain operations safely with methods like `map`, `andThen`, and `unwrapOr`.
- Convert to other types like `Option<T>` for value extraction or
  `PendingResult<T, E>` for async workflows.

> This library is designed around the principle of "safe results." Methods only
> throw exceptions where explicitly documented (e.g., `unwrap` and `expect` throw
> a `ResultError` if called on `Err`). In all other cases, errors are handled
> gracefully by returning `Err` (or `None` for `Option` types), ensuring predictable
> and safe behavior. This design philosophy applies to both `Result<T, E>` and
> `PendingResult<T, E>`, making them reliable for both synchronous and
> asynchronous workflows.

## Creating Results with Factory Functions

The `@ts-rust/std` library provides several factory functions to create
`Result<T, E>` and `PendingResult<T, E>` instances, supporting both
synchronous and asynchronous use cases.

### ok and err

- `ok<T, E>(value: T)`: Creates an `Ok<T>` variant containing the given value.
- `err<T, E>(error: E | CheckedError<E>)`: Creates an `Err<E>` variant containing
  the given error, wrapped in a `CheckedError<E>`.

```typescript
import { ok, err } from "@ts-rust/std";

const success = ok<number, string>(42); // Result<number, string> with Ok(42)
const failure = err<number, string>("failure"); // Result<number, string> with Err("failure")

console.log(success.isOk()); // true
console.log(failure.isErr()); // true
```

### pendingOk and pendingErr

- `pendingOk<T, E>(value: T | Promise<T>)`: Creates a `PendingResult<T, E>` that
  resolves to `Ok<T>` with the awaited value.
- `pendingErr<T, E>(error: E | CheckedError<E> | Promise<E> | Promise<CheckedError<E>>)`:
  Creates a `PendingResult<T, E>` that resolves to `Err<E>` with the awaited error.

```typescript
import { pendingOk, pendingErr } from "@ts-rust/std";

const asyncSuccess = pendingOk<number, string>(Promise.resolve(42)); // PendingResult<number, string>
const asyncFailure = pendingErr<number, string>("failure"); // PendingResult<number, string>

console.log(await asyncSuccess); // Ok(42)
console.log(await asyncFailure); // Err("failure")
```

### pendingResult

- `pendingResult<T, E>(resultOrFactory)`: Creates a `PendingResult<T, E>` from
  a `Result<T, E>`, a `Promise<Result<T, E>>`, or a factory function returning either.

This is the most versatile factory for creating `PendingResult<T, E>` instances,
especially for asynchronous operations.

```typescript
import { pendingResult, ok, err } from "@ts-rust/std";

// From a Result
const fromResult = pendingResult(ok<number, string>(42)); // PendingResult<number, string>
console.log(await fromResult); // Ok(42)

// From a Promise<Result>
const fromPromise = pendingResult(
  Promise.resolve(err<number, string>("failure")),
); // PendingResult<number, string>
console.log(await fromPromise); // Err("failure")

// From a factory function
const fromFactory = pendingResult(() =>
  Promise.resolve(err<number, boolean>(true)),
); // PendingResult<number, boolean>
console.log(await fromFactory); // Err(true)

// Using toPending as an alternative
const result = ok<number, string>(42); // Result<number, string>
const pending = result.toPending(); // PendingResult<number, string>
console.log(await pending); // Ok(42)
```

### run, runGenerator, and runAsync

- `run(action, mkErr)`: Executes a synchronous `action` and wraps the outcome
  in a `Result`. If the action throws, the error is passed to `mkErr` to create
  an `Err`.
- `runGenerator(action, mkErr?)`: Evaluates a `function*` that `yield*`s a
  `Result` to unwrap `Ok` or abort on `Err` (Rust `?`). Return a `Result` from
  the generator. Throws become an `UnexpectedError` unless `mkErr` maps them.
- `runAsync(action, mkErr)`: Executes an asynchronous `action` returning a
  `Promise` and wraps the outcome in a `PendingResult`. If the action throws
  or the promise rejects, the error is passed to `mkErr` to create an `Err`.
- `fromPromise(promise, mkErr)`: Same as `runAsync`, but takes an already
  created promise instead of a factory.

> **Note**: If `mkErr` throws, the method returns an `Err` with an
> `UnexpectedError`.

```typescript
import { run, runAsync, runGenerator, ok } from "@ts-rust/std";

const summed = runGenerator(function* () {
  const a = yield* ok<number, string>(1);
  const b = yield* ok<number, string>(2);
  return ok(a + b);
});
console.log(summed.unwrap()); // 3

// Synchronous run
const parsed = run(
  () => JSON.parse('{ "key": "value" }'),
  (e) => new Error(`Parse failed: ${e}`),
);
console.log(parsed.isOk()); // true
console.log(parsed.unwrap()); // { key: "value" }

const failed = run(
  () => JSON.parse("invalid json"),
  (e) => new Error(`Parse failed: ${e}`),
);
console.log(failed.isErr()); // true
console.log(failed.unwrapErr().expected.message); // "Parse failed: ..."

// Asynchronous runAsync
const asyncResult = runAsync(
  () => fetch("https://api.example.com/data").then((r) => r.json()),
  (e) => new Error(`Fetch failed: ${e}`),
);
const resolved = await asyncResult;
console.log(resolved.isOk()); // true or false depending on the fetch
```

### runResult and runPendingResult

- `runResult(getResult)`: Safely executes a synchronous action that returns a
  `Result`, capturing any thrown errors as an `Err` with an `UnexpectedError`.
- `runPendingResult(getResult)`: Safely executes an action that returns a
  `Result`, `PendingResult`, or `Promise<Result>`, capturing any thrown errors
  as a resolved `PendingResult` with an `Err` containing an `UnexpectedError`.

```typescript
import { runResult, runPendingResult, ok, err } from "@ts-rust/std";

// Successful Result
const success = runResult(() => ok(42));
console.log(success.unwrap()); // 42

// Failed Result
const failure = runResult(() => err("already failed"));
console.log(failure.unwrapErr().expected); // "already failed"

// Action throws an error
const thrown = runResult(() => {
  throw new Error("Oops");
});
console.log(thrown.isErr()); // true
console.log(thrown.unwrapErr().unexpected?.message); // "Oops"

// Async variant
const asyncSuccess = runPendingResult(() => ok(42));
console.log((await asyncSuccess).unwrap()); // 42
```

## Key Methods of `Result<T, E>`

`Result<T, E>` provides a variety of methods for working with success and
failure outcomes safely. Below are some key methods with examples.

### isOk, isErr, isOkAnd, and isErrAnd

- `isOk()`: Returns `true` if the result is `Ok`, narrowing the type to `Ok<T, E>`.
- `isErr()`: Returns `true` if the result is `Err`, narrowing the type to `Err<T, E>`.
- `isOkAnd(f)`: Returns `true` if the result is `Ok` and the predicate `f`
  returns `true` for the value.
- `isErrAnd(f)`: Returns `true` if the result is `Err` and the predicate `f`
  returns `true` for the error.

> **Note**: For `isOkAnd(f)` and `isErrAnd(f)`, if the predicate `f` throws
> an exception, the method returns `false`.

```typescript
import { ok, err } from "@ts-rust/std";

const success = ok<number, string>(42);
const failure = err<number, string>("failure");

// Basic state checks
console.log(success.isOk()); // true
console.log(success.isErr()); // false
console.log(failure.isOk()); // false
console.log(failure.isErr()); // true

// Type narrowing
if (success.isOk()) {
  console.log(success.value); // 42, type is narrowed to Ok<number, string>
}

// Combining with predicates
console.log(success.isOkAnd((n) => n > 0)); // true
console.log(success.isOkAnd((n) => n < 0)); // false
console.log(
  success.isOkAnd(() => {
    throw new Error("Failed");
  }),
); // false

console.log(failure.isErrAnd((e) => e.expected === "failure")); // true
console.log(failure.isErrAnd((e) => Boolean(e.unexpected))); // false
console.log(
  failure.isErrAnd(() => {
    throw new Error("Failed");
  }),
); // false
```

### [Symbol.iterator]

Makes this result usable with `yield*` inside a generator passed to
`runGenerator`, emulating Rust's `?` operator. An `Ok` resumes with the
contained value; an `Err` is returned by `runGenerator` and the generator
is not resumed.

This is not a value iterator: `for...of` and spread do not yield `T`.

```typescript
import { ok, runGenerator } from "@ts-rust/std";

const result = runGenerator(function* () {
  const n = yield* ok<number, string>(1);
  return ok(n + 1);
});
console.log(result.unwrap()); // 2
```

### map, mapErr, and mapAll

- `map(f)`: Transforms the value with `f` if `Ok`, otherwise returns the `Err`
  unchanged.
- `mapErr(f)`: Transforms the error with `f` if `Err` with an expected error,
  otherwise returns the `Ok` unchanged.
- `mapAll(f)`: Applies `f` to the entire Result, returning a new `Result` or
  `PendingResult` depending on whether `f` returns a `Promise`.

> **Note**: If the callback `f` throws an exception, these methods return an `Err`
> with an `UnexpectedError`. For `mapErr`, if the `Err` contains an `UnexpectedError`,
> `f` is not called, and the original error is preserved.

```typescript
import { ok, err } from "@ts-rust/std";

const success = ok<number, string>(5);
const failure = err<number, string>("failure");

// Using map to transform the value
console.log(success.map((n) => n * 2)); // Ok(10)
console.log(
  success.map(() => {
    throw new Error("Failed");
  }),
); // Err with UnexpectedError
console.log(failure.map((n) => n * 2)); // Err("failure")

// Using mapErr to transform the error
console.log(success.mapErr((e) => e.length)); // Ok(5)
console.log(failure.mapErr((e) => e.length)); // Err(7)
console.log(
  failure.mapErr(() => {
    throw new Error("Failed");
  }),
); // Err with UnexpectedError

// Using mapAll to transform the entire Result
console.log(success.mapAll((res) => ok(res.unwrapOr(0) + 1))); // Ok(6)
console.log(failure.mapAll((res) => ok(res.unwrapOr(0) + 1))); // Ok(1)
```

### and and andThen

- `and(x)`: Returns `x` if the result is `Ok`, otherwise returns the `Err` of
  the current result.
- `andThen(f)`: Applies `f` (which returns a `Result`) to the value if `Ok`,
  otherwise returns the `Err` unchanged.

> **Note**: If the callback `f` in `andThen` throws an exception, the method
> returns an `Err` with an `UnexpectedError`.

```typescript
import { ok, err } from "@ts-rust/std";

const success = ok<number, string>(5);
const failure = err<number, string>("failure");

// Using and to chain results
console.log(success.and(ok(10))); // Ok(10)
console.log(success.and(err("oops"))); // Err("oops")
console.log(failure.and(ok(10))); // Err("failure")

// Using andThen to chain operations
const doubleIfPositive = (n: number) => (n > 0 ? ok(n * 2) : err("negative"));
console.log(success.andThen(doubleIfPositive)); // Ok(10)
console.log(
  success.andThen(() => {
    throw new Error("Failed");
  }),
); // Err with UnexpectedError
console.log(failure.andThen(doubleIfPositive)); // Err("failure")
```

### match

- `match(f, g)`: Applies `f` to the value if `Ok`, or `g` to the
  `CheckedError` if `Err`.

> **Throws**: A `ResultError` if either `f` or `g` throws an exception.

```typescript
import { ok, err } from "@ts-rust/std";

const success = ok<number, string>(5);
const failure = err<number, string>("failure");

console.log(
  success.match(
    (n) => n * 2,
    () => 0,
  ),
); // 10
console.log(
  failure.match(
    (n) => n * 2,
    (e) => e.expected.length,
  ),
); // 7
console.log(() =>
  success.match(
    () => {
      throw new Error("Failed");
    },
    () => 0,
  ),
); // Throws ResultError
```

### contains

- `contains(value: T)`: Returns `true` if this is `Ok` and the contained value equals `value` using strict equality (`===`).

```typescript
import { ok, err } from "@ts-rust/std";

const x = ok<number, string>(42);
const y = err<number, string>("failure");

console.log(x.contains(42)); // true
console.log(x.contains(99)); // false
console.log(y.contains(42)); // false
```

### unwrap and unwrapOr

- `unwrap()`: Extracts the value if `Ok`, or throws a `ResultError` if `Err`.
- `unwrapOr(def)`: Returns the value if `Ok`, or a default value if `Err`.
- `unwrapOrElse(mkDef)`: Returns the value if `Ok`, or the result of `mkDef` if `Err`.
- `unwrapOrDefault()`: Returns the value if `Ok`, or `undefined` if `Err`.

```typescript
import { ok, err } from "@ts-rust/std";

const x = ok<number, string>(42);
const y = err<number, string>("failure");

console.log(x.unwrap()); // 42
console.log(y.unwrapOr(0)); // 0
console.log(x.unwrapOrElse(() => 0)); // 42
console.log(y.unwrapOrElse(() => 0)); // 0
console.log(x.unwrapOrDefault()); // 42
console.log(y.unwrapOrDefault()); // undefined
```

## Key Methods of `PendingResult<T, E>`

`PendingResult<T, E>` mirrors the methods of `Result<T, E>` but operates
asynchronously, returning promises or new `PendingResult` instances.

> **Note**: If the underlying promise of a `PendingResult<T, E>` rejects, it
> resolves to an `Err` with an `UnexpectedError` by default. This ensures that errors
> in asynchronous resolution are handled gracefully without requiring explicit
> error handling for the promise itself. Below are examples of key methods.

### async map, mapErr, and mapAll

- `map(f)`: Transforms the resolved value with `f` if `Ok`, otherwise returns
  a `PendingResult` resolving to the `Err` unchanged.
- `mapErr(f)`: Transforms the resolved error with `f` if `Err` with an expected
  error, otherwise returns a `PendingResult` resolving to the `Ok` unchanged.
- `mapAll(f)`: Applies `f` to the entire resolved `Result`, returning
  a new `PendingResult`.

> **Note**: If the callback `f` throws an exception or returns a rejected `Promise`,
> these methods return a `PendingResult` resolving to an `Err` with an `UnexpectedError`.
> For `mapErr`, if the `Err` contains an `UnexpectedError`, `f` is not called, and
> the original error is preserved.

```typescript
import { pendingResult, ok, err } from "@ts-rust/std";

const success = pendingResult(ok<number, string>(5));
const failure = pendingResult(err<number, string>("failure"));

// Using map to transform the value
console.log(await success.map((n) => n * 2)); // Ok(10)
console.log(
  await success.map(() => {
    throw new Error("Failed");
  }),
); // Err with UnexpectedError
console.log(await failure.map((n) => n * 2)); // Err("failure")

// Using mapErr to transform the error
console.log(await success.mapErr((e) => e.length)); // Ok(5)
console.log(await failure.mapErr((e) => e.length)); // Err(7)
console.log(
  await failure.mapErr(() => {
    throw new Error("Failed");
  }),
); // Err with UnexpectedError

// Using mapAll to transform the entire Result
console.log(await success.mapAll((res) => ok(res.unwrapOr(0) + 1))); // Ok(6)
console.log(await failure.mapAll((res) => ok(res.unwrapOr(0) + 1))); // Ok(1)
```

### async and and andThen

- `and(x)`: Returns a `PendingResult` resolving to `x` if the result resolves
  to `Ok`, otherwise resolves to the `Err` of the current result.
- `andThen(f)`: Applies f (which returns a `Result` or `Promise<Result>`) to
  the resolved value if `Ok`, otherwise returns a `PendingResult` resolving to
  the `Err` unchanged.

> **Note**: If the callback `f` in `andThen` throws an exception or returns
> a rejected `Promise`, the method returns a `PendingResult` resolving to
> an `Err` with an `UnexpectedError`.

```typescript
import { pendingResult, ok, err } from "@ts-rust/std";

const success = pendingResult(ok<number, string>(5));
const failure = pendingResult(err<number, string>("failure"));

// Using and to chain results
console.log(await success.and(ok(10))); // Ok(10)
console.log(await success.and(err("oops"))); // Err("oops")
console.log(await failure.and(ok(10))); // Err("failure")

// Using andThen to chain operations
const doubleIfPositive = (n: number) => (n > 0 ? ok(n * 2) : err("negative"));
console.log(await success.andThen(doubleIfPositive)); // Ok(10)
console.log(
  await success.andThen(() => {
    throw new Error("Failed");
  }),
); // Err with UnexpectedError
console.log(await failure.andThen(doubleIfPositive)); // Err("failure")
```

### async inspect and inspectErr

- `inspect(f)`: Calls `f` with the resolved value if `Ok`, then returns
  a new `PendingResult` with the original state.
- `inspectErr(f)`: Calls `f` with the resolved `CheckedError` if `Err`,
  then returns a new `PendingResult` with the original state.

> **Note**: If `f` throws or returns a rejected `Promise`, the error is ignored,
> and the returned `PendingResult` resolves to the original state.

```typescript
import { pendingResult, ok, err } from "@ts-rust/std";

const success = pendingResult(ok<number, string>(5));
const failure = pendingResult(err<number, string>("failure"));

let sideEffect = 0;

// Using inspect to log the value
console.log(await success.inspect((n) => (sideEffect = n))); // Ok(5)
console.log(
  await success.inspect(() => {
    throw new Error("Failed");
  }),
); // Ok(5)
console.log(sideEffect); // 5
console.log(await failure.inspect((n) => (sideEffect = n))); // Err("failure")
console.log(sideEffect); // 5 (unchanged)

// Using inspectErr to log the error
console.log(await success.inspectErr((e) => (sideEffect = e.expected.length))); // Ok(5)
console.log(sideEffect); // 5 (unchanged)
console.log(await failure.inspectErr((e) => (sideEffect = e.expected.length))); // Err("failure")
console.log(sideEffect); // 7
```

## Error Handling with ResultError and CheckedError

`Result<T, E>` and `PendingResult<T, E>` use `CheckedError<E>` to distinguish
between expected errors (of type `E`) and unexpected errors
(wrapped in a `ResultError`):

- Expected Errors: Represent anticipated failures, stored as expected
  in a `CheckedError<E>`.
- Unexpected Errors: Represent runtime or exceptional failures, stored as
  unexpected in a `CheckedError<E>` (as a `ResultError`).

Methods like `unwrap`, `expect`, `unwrapErr`, and `expectErr` throw a `ResultError`
when called inappropriately (e.g., `unwrap` on an `Err`). Other methods, such
as `map` and `andThen`, catch errors and return an `Err` with an `UnexpectedError`,
adhering to the library’s "safe results" philosophy.

```typescript
import { ok, err } from "@ts-rust/std";

const success = ok<number, string>(42);
const failure = err<number, string>("failure");

// Throws on invalid access
try {
  failure.unwrap(); // Throws ResultError
} catch (e) {
  console.log(e.message); // "`unwrap`: called on `Err`"
}

// Accessing the error
console.log(failure.unwrapErr().expected); // "failure"
console.log(failure.unwrapErr().isExpected()); // true

// Methods handle errors gracefully
console.log(
  success.map(() => {
    throw new Error("Failed");
  }),
); // Err with UnexpectedError
```

## Type Guards for Results

The library provides type guard functions to check if a value is a `Result<T, E>`
or `PendingResult<T, E>`, enabling type-safe runtime checks and type narrowing
in TypeScript.

### isResult

- `isResult(x)`: Returns `true` if the value is a `Result<T, E>`, narrowing its
  type to `Result<unknown, unknown>`.

```typescript
import { ok, err, isResult } from "@ts-rust/std";

const success = ok<number, string>(42);
const failure = err<number, string>("failure");
const notResult = "not a result";

console.log(isResult(success)); // true
console.log(isResult(failure)); // true
console.log(isResult(notResult)); // false

if (isResult(success)) {
  console.log(success.isOk()); // true, type narrowed to Result<unknown, unknown>
}
```

### isPendingResult

- `isPendingResult(x)`: Returns `true` if the value is a `PendingResult<T, E>`,
  narrowing its type to `PendingResult<unknown, unknown>`.

```typescript
import { pendingResult, ok, err, isPendingResult } from "@ts-rust/std";

const asyncSuccess = pendingResult(ok<number, string>(42));
const asyncFailure = pendingResult(err<number, string>("failure"));
const notPending = ok(42); // Not a PendingResult

console.log(isPendingResult(asyncSuccess)); // true
console.log(isPendingResult(asyncFailure)); // true
console.log(isPendingResult(notPending)); // false

if (isPendingResult(asyncSuccess)) {
  console.log(await asyncSuccess); // Ok(42), type narrowed to PendingResult<unknown, unknown>
}
```

## Additional Resources

Learn more about working with optional values in the [Option README](../option/README.md).

Explore the full library in the main [README](../../README.md).
