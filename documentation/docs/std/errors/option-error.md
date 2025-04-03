---
title: OptionError
sidebar_label: OptionError
---

## Overview

The `OptionError` class is a specialized error type in the `@ts-rust/std` library,
used specifically with the `Option` type to indicate errors related to optional
value operations. It extends the [`AnyError`](./any-error.md) class where template
`T` is [`OptionErrorKind`](../api/Option/enumerations/OptionErrorKind.mdx) and
provides additional context about why an `Option` operation failed.

## When It Appears

`OptionError` is thrown in scenarios involving the `Option` type, such as
attempting to unwrap a `None` value using methods like `unwrap()` or `expect()`.

## Usage

`OptionError` is encountered when working with the `Option` type and its methods.
It helps developers identify and handle cases where an expected value is
absent (`None`).

### Example

```typescript
import { none, Option, isOptionError } from "@ts-rust/std";

// Create an Option with no value
const maybeValue: Option<number> = none();

try {
  // Attempt to unwrap a None value, which throws an OptionError
  const value = maybeValue.unwrap();
} catch (e) {
  if (isOptionError(e)) {
    console.log(e.message); // "[UnwrapCalledOnNone] `unwrap`: called on `None`."
  }
}

// Using expect() with a custom message
try {
  maybeValue.expect("Expected a number, but got None");
} catch (e) {
  if (isOptionError(e)) {
    console.log(e.message); // "[ExpectCalledOnNone] Expected a number, but got None."
  }
}
```

## See Also

- [AnyError](./any-error.md)
- [ResultError](./result-error.md)
- [CheckedError](./checked-error.md)
