---
title: AnyError
sidebar_label: AnyError
---

## Overview

The `AnyError` class is a generic base error type provided by the `@ts-rust/std`
library. It serves as a foundation for other error types within the library, such
as `OptionError` and `ResultError`, and can be used directly for custom error
handling when a specific error type is not required.

## Usage

You can use `AnyError` directly to throw a generic error or extend it to create
more specific error types. It can be used nicely in conjunction with the `Result`
when an operation fails.

### Example

```typescript
import { AnyError } from "@ts-rust/std";

// Throwing an AnyError
throw new AnyError("Something went wrong");

// Using with Result
import { err, Result } from "@ts-rust/std";

function riskyOperation(): Result<number, AnyError> {
  try {
    // Simulate a failure
    throw new AnyError("Operation failed");
  } catch (e) {
    return err(e as AnyError);
  }
}

const result = riskyOperation();
if (result.isErr()) {
  console.log(result.unwrapErr().message); // "Operation failed"
}
```

## Extending AnyError

You can extend AnyError to create custom error types with additional properties or behavior:

```typescript
import { AnyError } from "@ts-rust/std";

class CustomError extends AnyError<number> {
  constructor(message: string, public readonly code: number) {
    super(message, code);
  }
}

throw new CustomError("Custom failure", 500);
```

## See Also

- [OptionError](./option-error.md)
- [ResultError](./result-error.md)
- [CheckedError](./checked-error.md)
