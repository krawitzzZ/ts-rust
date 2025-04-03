---
title: ResultError
sidebar_label: ResultError
---

## Overview

The [`ResultError`](../api/Result/classes/ResultError.mdx) class is a specialized
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
  const error = _.unwrapErr();

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

## See Also

- [AnyError](./any-error.md)
- [OptionError](./option-error.md)
- [CheckedError](./checked-error.md)
