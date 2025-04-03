---
title: CheckedError
sidebar_label: CheckedError
---

## Overview

The main idea behind the `Result` implementation in `@ts-rust/std` library, is
that it is completely safe and expectable. Due to dynamic nature of JavaScript,
it is impossible to guarantee that `Result<T, E>` will hold an error of type `E`
at all times, because, technically, any kind of error may happen, for example,
if you call a `map` method on `Result`, the predicate function may throw and these
is no way to provide an error of type `E` when this happens.

The `CheckedError` type in the `@ts-rust/std` library represents an error that
has been explicitly checked and handled. It is a class that extends `Error` and
implements [`EitherError<E>`](../api/Result/interfaces/EitherError.mdx) interface
and holds either an [`ExpectedError<E>`](../api/Result/type-aliases/ExpectedError.mdx)
or an [`UnexpectedError<E>`](../api/Result/type-aliases/UnexpectedError.mdx). In
case the result holds an expected error (for example, `string` in `Result<number, string>`),
calling `unwrapErr` method would result in a `string` value. On the other hand,
if result holds an unexpected error (for example, if a predicate threw an exception
in one of the methods that accept one, like [`map`](/ts-rust/std/api/Result/interfaces/Resultant#map)),
then `unwrapErr` will return a [`ResultError`](./result-error.md) instance.

## When It Appears

`CheckedError` is used in scenarios where:

- An operation within a `Result` type fails, and the error is explicitly marked
as "checked" (i.e., expected and handled).
- You use the `isCheckedError` utility function to identify whether an error is
a `CheckedError`.

## Usage

`CheckedError` is used with the `Result` type to differentiate between expected
errors (which the code is prepared to handle) and unexpected errors. It is often
paired with the `isCheckedError` and `isResultError` functions to perform type narrowing.

### Example

```typescript
import { err, Result, isCheckedError, ResultErrorKind } from "@ts-rust/std";

// Get a result somehow
const result: Result<number, string> = getResult();

if (result.isErr()) {
  const { error } = result;

  if (error.isExpected()) {
    console.log("This is an expected error:", error.expected);
  }

  if (error.isUnexpected()) {
    console.log("This is an unexpected error:", error.unexpected);
  }
}
```

## See Also

- [AnyError](./any-error.md)
- [OptionError](./option-error.md)
- [ResultError](./result-error.md)
