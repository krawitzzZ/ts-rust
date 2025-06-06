---
title: Functions
sidebar_label: functions
---

## Useful functions to work with `Result` types

### ok

- [`ok<E>(): Result<void, E>`](../api/Result/functions/ok.mdx)
- [`ok<T, E>(value: T): Result<T, E>`](../api/Result/functions/ok.mdx)

Creates an [`Ok`](../api/Result/type-aliases/Ok.mdx) variant of a `Result` containing
the given value.

If called without arguments, narrows the type to `Result<void, E>`, which is useful
when you want to represent a successful operation without a value.

```ts
const x: Result<void, string> = ok<string>();
const y: Result<number, string> = ok<number, string>(42);

expect(x.isOk()).toBe(true);
expect(x.unwrap()).toBeUndefined();

expect(y.isOk()).toBe(true);
expect(y.unwrap()).toBe(42);
```

### err

- [`err<T>(): Result<T, void>`](../api/Result/functions/err.mdx)
- [`err<T, E>(error: E | CheckedError<E>): Result<T, E>`](../api/Result/functions/err.mdx)

Creates an [`Err`](../api/Result/type-aliases/Err.mdx) variant of a `Result` containing the given error.

If called without arguments, narrows the type to `Result<T, void>`, which is useful
when you want to represent a failed operation without a specific error value.

Wraps the provided error in a [`CheckedError`](../errors/checked-error.md) within an `Err`,
indicating a failed outcome for a checked `Result`. This function accepts
raw error value or `CheckedError`.

```ts
const x: Result<number, void> = err<number>();
const y: Result<number, string> = err<number, string>("failure");

expect(x.isErr()).toBe(true);
expect(x.unwrapErr().expected).toBeUndefined();
expect(x.unwrapErr().unexpected).toBeUndefined();

expect(y.isErr()).toBe(true);
expect(y.unwrapErr().expected).toBe("failure");
expect(x.unwrapErr().unexpected).toBeUndefined();
```

### pendingOk

[`pendingOk<T, E>(value: T | Promise<T>): PendingResult<Awaited<T>, Awaited<E>>`](../api/Result/functions/pendingOk.mdx)

Creates a [`PendingResult`](../api/Result/interfaces/PendingResult.mdx) that
resolves to `Ok` containing the `Awaited` value.

Takes a value or promise and wraps its resolved result in an `Ok`,
ensuring the value type is `Awaited` to handle any `PromiseLike` input.

```ts
const x = pendingOk<number, string>(42);
const y = pendingOk<string, number>(Promise.resolve("hello"));

expect(await x).toStrictEqual(ok(42));
expect(await y).toStrictEqual(ok("hello"));
```

### pendingErr

[`pendingErr<T, E>(error: E | CheckedError<E> | Promise<E> | Promise<CheckedError<E>>): PendingResult<Awaited<T>, Awaited<E>>`](../api/Result/functions/pendingErr.mdx)

Creates a [`PendingResult`](../api/Result/interfaces/PendingResult.mdx) that
resolves to `Err` containing the `Awaited` error.

Takes an error or promise and wraps its resolved result in an `Err`,
ensuring the error type is `Awaited` to handle any `PromiseLike` input.

```ts
const x = pendingErr<number, string>("failure");
const y = pendingErr<string, number>(Promise.resolve(42));

expect(await x).toStrictEqual(err("failure"));
expect(await y).toStrictEqual(err(42));
```

### pendingResult

[`pendingResult<T, E>(resultOrFactory: Result<T, E> | Promise<Result<T, E>> | (() => Result<T, E> | Promise<Result<T, E>>)): PendingResult<T, E>`](../api/Result/functions/pendingResult.mdx)

Creates a [`PendingResult`](../api/Result/interfaces/PendingResult.mdx) from a result,
promise, or factory function.

Accepts a `Result`, a `Promise` resolving to a `Result`, or
a function returning either, and converts it into a pending result, handling
asynchronous resolution as needed.

```ts
const x = pendingResult(ok<number, string>(42));
const y = pendingResult(() => Promise.resolve(err<string, number>(42)));
const z = pendingResult(async () => err<string, boolean>(true));

expect(await x).toStrictEqual(ok(42));
expect(await y).toStrictEqual(err(42));
expect(await z).toStrictEqual(err(true));
```

### run

[`run<T, E>(action: () => Awaited<T>, mkErr: (error: unknown) => Awaited<E>): Result<T, E>`](../api/Result/functions/run.mdx)

Executes a synchronous action and wraps the outcome in a
[`Result`](../api/Result/type-aliases/Result.mdx),
handling errors with a custom error mapper.

The `run` function attempts to execute the provided `action` function,
which returns a value of type `T`. If the action succeeds, it returns an
`Ok` variant containing the result. If the action fails (throws an error),
the error is passed to the `mkErr` function to create an error of type `E`,
which is then wrapped in an `Err` variant.

This function is useful for safely executing operations that might fail,
ensuring errors are handled in a type-safe way using the `Result` type.

```ts
const result: Result<{ key: string }, Error> = run(
  (): { key: string } => JSON.parse('{ key: "value" }'),
  (e) => new Error(`Operation failed: ${JSON.stringify(e)}`),
);
if (result.isOk()) {
  console.log(result.unwrap()); // { key: "value" }
}
```

### runAsync

[`runAsync<T, E>(action: () => Promise<T>, mkErr: (error: unknown) => Awaited<E>): PendingResult<T, E>`](../api/Result/functions/runAsync.mdx)

Executes an asynchronous action and wraps the outcome in a
[`PendingResult`](../api/Result/interfaces/PendingResult.mdx),
handling errors with a custom error mapper.

The `runAsync` function attempts to execute the provided `action` function,
which returns a value of type `Promise<T>`. If the action succeeds, it returns a
`PendingResult` that resolves to `Ok` variant containing the value.
If the action fails (throws an error or rejects), the error is passed to the `mkErr`
function to create an error of type `E`, which is then wrapped in an `Err` variant.

This function is useful for safely executing operations that might fail,
ensuring errors are handled in a type-safe way using the `PendingResult` type.

```ts
const pendingRes: PendingResult<string, Error> = runAsync(
  (): Promise<string> => fetch("https://api.example.com/text").then((res) => res.text()),
  (e) => new Error(`Fetch failed: ${JSON.stringify(e)}`),
);

const res: Result<string, Error> = await pendingRes;

if (res.isErr()) {
  console.log(res.unwrapErr().message); // Fetch failed: ...
}
```

### runResult

[`runResult<T, E>(getResult: () => Result<T, E>): Result<T, E>`](../api/Result/functions/runResult.mdx)

Safely executes an action that returns a `Result`, capturing thrown
synchronous errors as an `Err` variant.

The `runResult` function executes the provided `getResult` function,
which returns a `Result<T, E>`. If the action succeeds, it returns the `Result`
as-is (either `Ok<T>` or `Err<E>`). If the action throws an error, it is
captured and wrapped in an `Err` variant returning
[`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx) with a
`ResultErrorKind.Unexpected` kind.

This function is useful for safely running synchronous `Result`-producing actions,
if you are not 100% sure that the action will not throw an error, ensuring that any
thrown errors are converted into an `Err` variant in a type-safe way.

```ts
// Successful Result
const success = runResult(() => ok(42));
console.log(success.unwrap()); // 42

// Failed Result
const failure = runResult(() => err(new Error("Already failed")));
// "Expected error occurred: Error: Already failed"
console.log(failure.unwrapErr().expected?.message);

// Action throws an error
const thrown = runResult(() => {
  throw new Error("Oops");
});
// "Unexpected error occurred: ResultError: [Unexpected] `runResult`: result action threw an exception. Reason: Error: Oops"
console.log(thrown.unwrapErr().unexpected?.message);
```

### runPendingResult

[`runPendingResult<T, E>(getResult: () => PendingResult<T, E>): PendingResult<T, E>`](../api/Result/functions/runPendingResult.mdx)

Safely executes an action that returns a `PendingResult`, capturing
thrown synchronous errors as an `Err` variant.

The `runPendingResult` function executes the provided `getResult`
function, which returns a `PendingResult<T, E>`. If the action succeeds, it
returns the `PendingResult` as-is. If the action throws an error synchronously,
the error is captured and wrapped in a resolved `Err` variant returning
[`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx) with a
`ResultErrorKind.Unexpected` kind.

This overload is useful for safely running asynchronous `PendingResult`-producing actions,
if you are not 100% sure that the action will not throw an error, ensuring that any
synchronous errors are converted into an `Err` variant in a type-safe way.

```ts
// Successful Result
const success = await runPendingResult(() => pendingOk(42));
console.log(success.unwrap()); // 42

// Failed Result
const failure = await runPendingResult(() =>
  pendingErr(new Error("Already failed")),
);
// "Expected error occurred: Error: Already failed"
console.log(failure.unwrapErr().expected?.message);

// Action throws an error
const thrown = await runPendingResult(() => {
  throw new Error("Oops");
});
// "Unexpected error occurred: ResultError: [Unexpected] `runPendingResult`: result action threw an exception. Reason: Error: Oops"
console.log(thrown.unwrapErr().unexpected?.message);
```

### isResult

[`isResult(x: unknown): x is Result<unknown, unknown>`](../api/Result/functions/isResult.mdx)

Checks if a value is a [`Result`](../api/Result/type-aliases/Result.mdx),
narrowing its type to `Result<unknown, unknown>`.

This type guard verifies whether the input conforms to the `Result`
interface, indicating it is either an `Ok` or `Err`.

```ts
const x: unknown = ok<number, string>(42);
const y: unknown = err<number, string>("failure");
const z: unknown = "not a result";

expect(isResult(x)).toBe(true);
expect(isResult(y)).toBe(true);
expect(isResult(z)).toBe(false);

if (isResult(x)) {
  expect(x.isOk()).toBe(true); // Type narrowed to Result<unknown, unknown>
}
```

### isPendingResult

[`isPendingResult(x: unknown): x is PendingResult<unknown, unknown>`](../api/Result/functions/isPendingResult.mdx)

Checks if a value is a [`PendingResult`](../api/Result/interfaces/PendingResult.mdx),
narrowing its type to `PendingResult<unknown, unknown>`.

This type guard verifies whether the input is a `PendingResult`,
indicating it wraps a `Promise` resolving to a `Result` (either `Ok` or `Err`).

```ts
const x: unknown = pendingResult(ok<number, string>(42));
const y: unknown = pendingResult(err<number, string>("failure"));
const z: unknown = ok(42); // Not a PendingResult

expect(isPendingResult(x)).toBe(true);
expect(isPendingResult(y)).toBe(true);
expect(isPendingResult(z)).toBe(false);

if (isPendingResult(x)) {
  // Type narrowed to PendingResult<unknown, unknown>
  expect(await x).toStrictEqual(ok(42));
}
```

### isResultError

[`isResultError(e: unknown): e is ResultError`](../api/Result/functions/isResultError.mdx)

Checks if a value is a [`ResultError`](../errors/result-error.md), narrowing its type if true.

```ts
try {
  const x = err("failed")
  x.expect("x is err")
} catch (e) {
  if (isResultError(e)) {
    console.log(e.kind); // type narrowed to ResultError
  }
}
```

### isCheckedError

[`isCheckedError(e: unknown): e is CheckedError<unknown>`](../api/Result/functions/isCheckedError.mdx)

 Checks if a value is a [`CheckedError`](../errors/checked-error.md), narrowing its type if true.

```ts
try {
  const x: Result<string, Error> = getResultFromSomeWhere();
  x.expect("x is err");
} catch (e) {
  if (isCheckedError(e)) {
    console.log(e.expected); // type narrowed to CheckedError<unknown>
  }
}
```
