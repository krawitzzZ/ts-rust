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

### Constructor

```typescript
constructor(message: string, kind: T, reason?: unknown)
```

- `message` - A descriptive message for the error.
- `kind` - The category or type of the error (a primitive value, e.g., string, number, enum).
- `reason` - An optional underlying cause (any value; converted to `Error` if not already).

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `kind` | `T` | The category or type of the error, set during construction. |
| `reason` | `Error` | The underlying cause of the error, normalized to an `Error` instance. |

### Example

```typescript
import { AnyError } from "@ts-rust/std";

// Throwing an AnyError with just a message
throw new AnyError("Something went wrong");

// Throwing an AnyError with a message and a kind
throw new AnyError("Something went wrong", "SomeError");

// Throwing an AnyError with a message, kind, and reason
throw new AnyError("Something went wrong", "SomeError", new Error("root cause"));

// Using with Result
import { err, Result } from "@ts-rust/std";

function riskyOperation(): Result<number, AnyError> {
  try {
    // Simulate a failure
    throw new AnyError("Operation failed", "OperationError");
  } catch (e) {
    return err(e as AnyError);
  }
}

const result = riskyOperation();
if (result.isErr()) {
  const error = result.unwrapErr();
  console.log(error.message);  // "[OperationError] Operation failed."
  console.log(error.kind);     // "OperationError"
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
