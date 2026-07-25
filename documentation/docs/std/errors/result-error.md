---
title: ResultError
sidebar_label: ResultError
---

## Overview

The [`ResultError`](../api/Result/interfaces/ResultError.mdx) class is a specialized
error type in the `@ts-rust/std` library, used with the `Result` type to represent
errors that occur during operations that can succeed or fail. It extends the
[`AnyError`](./any-error.md) class where template `T` is
[`ResultErrorKind`](../api/Result/enumerations/ResultErrorKind.mdx) and provides
additional context about why a `Result` operation failed, including an
associated `ResultErrorKind`.

## When It Appears

`ResultError` is used in scenarios involving the `Result` type, such as:

- Returning an `Err` variant from a `Result` when an operation fails unexpectedly
(see [CheckedError](./checked-error.md) for more details).
- Throwing an error when attempting to unwrap an `Err` value using methods like
`unwrap()` or `expect()`.

## Usage

`ResultError` is encountered when working with the `Result` type and its methods.
It allows developers to handle failure cases explicitly and provides details about
the error through its `kind` property.

### Example

```typescript
import { err, Result, ResultErrorKind, isResultError } from "@ts-rust/std";

// Create a Result with unexpected error
const result: Result<number, string> = ok(0).map(() => {
  throw new Error("oops");
});

if (result.isErr()) {
  const error = result.unwrapErr();

  if (error.isUnexpected()) {
    console.log(error.unexpected.message); // "[PredicateException] `map`: callback `f` threw an exception. Reason: Error: oops"
    console.log(error.unexpected.kind); // "PredicateException"
  }
}

// Using unwrap() on an Err value
try {
  result.unwrap();
} catch (e) {
  if (isResultError(e)) {
    console.log(e.message); // "[UnwrapCalledOnErr] `unwrap`: called on `Err`."
    console.log(e.kind); // [UnwrapCalledOnErr]
    console.log(e.reason); // "Error: UnwrapCalledOnErr ...."
  }
}
```

## ResultErrorKind Values

The `ResultError` class uses the `ResultErrorKind` enum to categorize errors. Each
value corresponds to a specific failure scenario:

| Kind | Description |
|------|-------------|
| `ErrorAccessedOnOk` | Thrown when the `error` property is accessed on an `Ok` variant. |
| `ValueAccessedOnErr` | Thrown when the `value` property is accessed on an `Err` variant. |
| `ExpectCalledOnErr` | Thrown when `expect()` is called on an `Err` variant. |
| `ExpectErrCalledOnOk` | Thrown when `expectErr()` is called on an `Ok` variant. |
| `UnwrapCalledOnErr` | Thrown when `unwrap()` is called on an `Err` variant. |
| `UnwrapErrCalledOnOk` | Thrown when `unwrapErr()` is called on an `Ok` variant. |
| `FlattenCalledOnFlatResult` | Thrown when `flatten()` is called on an `Ok` that does not contain a `Result`. |
| `ResultRejection` | Thrown when a `PendingResult` promise rejects unexpectedly. |
| `PredicateException` | Thrown when a callback/predicate passed to a method throws an exception (e.g., `map`, `mapErr`, `andThen`, `orElse`, `unwrapOrElse`, `mapOrElse`, `match`). |
| `FromOptionException` | Thrown when converting an `Option` to a `Result` via `okOrElse` and the error factory throws. |
| `Unexpected` | Generic unexpected error, used as a default when no specific kind applies. |

## See Also

- [AnyError](./any-error.md)
- [OptionError](./option-error.md)
- [CheckedError](./checked-error.md)
