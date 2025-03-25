# `Option<T>` and `PendingOption<T>`

This document provides detailed documentation for the `Option<T>` and
`PendingOption<T>` types in the `@ts-rust/std` library. Inspired by Rust's
[Option](https://doc.rust-lang.org/std/option/enum.Option.html), these types
offer a type-safe way to handle values that may or may not be present,
eliminating the need for `null` or `undefined` checks in TypeScript projects.

## Overview of `Option<T>`

`Option<T>` represents a value that may or may not exist. It has two variants:

- `Some<T>`: Contains a value of type `T`.
- `None<T>`: Represents the absence of a value (generic is necessary for proper
  type inference).

Use `Option<T>` to:

- Avoid `null` or `undefined` errors by making the presence or absence of a value explicit.
- Chain operations safely with methods like `map`, `andThen`, and `unwrapOr`.
- Convert to other types like `Result<T, E>` for error handling if needed.

> This library is designed around the principle of "safe options."
> Methods only throw exceptions where explicitly documented (e.g., `unwrap` and
> `expect` throw an `OptionError` if called on `None`). In all other cases, errors
> are handled gracefully by returning `None` (or `Err` for `Result` types), ensuring
> predictable and safe behavior. This design philosophy applies to both `Option<T>`
> and `PendingOption<T>`, making them reliable for both synchronous and asynchronous
> workflows.

## Creating Options with Factory Functions

The `@ts-rust/std` library provides several factory functions to create
`Option<T>` and `PendingOption<T>` instances. These functions make it easy to
construct options for both synchronous and asynchronous workflows.

### some and none

- `some<T>(value: T)`: Creates a `Some<T>` variant containing the given value.
- `none<T>()`: Creates a `None<T>` variant representing the absence of a value.

```typescript
import { some, none } from "@ts-rust/std";

const someValue = some(42); // Option<number> with Some(42)
const noValue = none<number>(); // Option<number> with None

console.log(someValue.isSome()); // true
console.log(noValue.isNone()); // true
```

### pendingSome and pendingNone

- `pendingSome<T>(value: T | Promise<T>)`: Creates a `PendingOption<T>` that
  resolves to `Some<T>` with the awaited value.
- `pendingNone<T>()`: Creates a `PendingOption<T>` that resolves to `None<T>`.

```typescript
import { pendingSome, pendingNone } from "@ts-rust/std";

const asyncSome = pendingSome(Promise.resolve(42)); // PendingOption<number>
const asyncNone = pendingNone<string>(); // PendingOption<string>

console.log(await asyncSome); // Some(42)
console.log(await asyncNone); // None
```

### pendingOption

- `pendingOption<T>(optionOrFactory)`: Creates a `PendingOption<T>` from
  an `Option<T>`, a `Promise<Option<T>>`, or a factory function returning either.

This is the most versatile factory for creating `PendingOption<T>` instances,
especially when working with asynchronous operations.

```typescript
import { pendingOption, some, none } from "@ts-rust/std";

// From an Option
const fromOption = pendingOption(some(42)); // PendingOption<number>
console.log(await fromOption); // Some(42)

// From a Promise<Option>
const fromPromise = pendingOption(Promise.resolve(none<number>())); // PendingOption<number>
console.log(await fromPromise); // None

// From a factory function
const fromFactory = pendingOption(() => Promise.resolve(some("hello"))); // PendingOption<string>
console.log(await fromFactory); // Some("hello")

// Using `toPending` as an alternative
const opt = some(Promise.resolve(42)); // Option<Promise<number>>
const pending = opt.toPending(); // PendingOption<number>
console.log(await pending); // Some(42)
```

## Key Methods of `Option<T>`

`Option<T>` provides a rich set of methods for working with optional values.
Most of the methods available in Rust's `Option` are also available in this
implementation.

Below are some of the most commonly used methods with examples.

### unwrap and unwrapOr

- `unwrap()`: Extracts the value if `Some`, or throws an `OptionError` if `None`.
- `unwrapOr(def)`: Returns the value if `Some`, or a default value if `None`.

```typescript
import { some, none } from "@ts-rust/std";

const x = some(42);
const y = none<number>();

console.log(x.unwrap()); // 42
console.log(y.unwrapOr(0)); // 0

try {
  y.unwrap();
} catch (e) {
  console.log(e.message); // "[UnwrapCalledOnNone] `unwrap`: called on `None`."
}
```

### map and andThen

> **Note**: If the callback `f` throws an exception, both methods return `None`.

- `map(f)`: Transforms the value with `f` if `Some`, otherwise returns `None`.
- `andThen(f)`: Applies `f` (which returns an `Option`) to the value if `Some`,
  otherwise returns `None`.

```typescript
import { some, none } from "@ts-rust/std";

const x = some(5);
const y = none<number>();

// Using map to transform the value
console.log(x.map((n) => n * 2)); // Some(10)
console.log(
  x.map(() => {
    throw new Error("Failed");
  }),
); // None
console.log(y.map((n) => n * 2)); // None

// Using andThen to chain operations
const doubleIfPositive = (n: number) => (n > 0 ? some(n * 2) : none());
console.log(x.andThen(doubleIfPositive)); // Some(10)
console.log(
  x.andThen(() => {
    throw new Error("Failed");
  }),
); // None
console.log(y.andThen(doubleIfPositive)); // None
```

### or and orElse

- `or(x)`: Returns this `Option` if `Some`, otherwise returns `x`.
- `orElse(f)`: Returns this `Option` if `Some`, otherwise returns the result of `f`.

```typescript
import { some, none } from "@ts-rust/std";

const x = some(42);
const y = none<number>();

console.log(x.or(some(0))); // Some(42)
console.log(y.or(some(0))); // Some(0)

console.log(x.orElse(() => some(0))); // Some(42)
console.log(y.orElse(() => some(0))); // Some(0)
```

### okOr and okOrElse

Convert an `Option` to a `Result`, providing an error value for the `None` case:

- `okOr(y)`: Converts `Some(v)` to `Ok(v)`, `None` to `Err(y)`.
- `okOrElse(mkErr)`: Converts `Some(v)` to `Ok(v)`, `None` to `Err(mkErr())`.

```typescript
import { some, none } from "@ts-rust/std";

const x = some(42);
const y = none<number>();

console.log(x.okOr("missing")); // Ok(42)
console.log(y.okOr("missing")); // Err("missing")

console.log(x.okOrElse(() => "missing")); // Ok(42)
console.log(y.okOrElse(() => "missing")); // Err("missing")
```

### inspect and tap

Inspect the inner value or entire `Option` without modifying it:

- `inspect(f)`: Calls `f` with the inner value if `Some`, otherwise does nothing.
- `tap(f)`: Calls `f` with the entire `Option` for both `Some` and `None`.

```typescript
import { some, none } from "@ts-rust/std";

const x = some(42);
const y = none<number>();

x.tap((n) => console.log(n)); // 42
y.tap((n) => console.log(n)); // No output

x.inspect((opt) => console.log(opt)); // Some(42)
y.inspect((opt) => console.log(opt)); // None
```

### match

Pattern match on the `Option` to handle both `Some` and `None` cases:

> **Throws**: A `OptionError` if either `f` or `g` throws an exception.

```typescript
import { some, none } from "@ts-rust/std";

const x = some(42);
const y = none<number>();

console.log(
  x.match(
    (n) => n * 2, // 84
    () => 0,
  ),
);

console.log(
  y.match(
    (n) => n * 2,
    () => 0, // 0
  ),
);

console.log(() =>
  x.match(
    () => {
      throw new Error("Failed");
    },
    () => 0,
  ),
); // Throws OptionError
```

### isSome, isNone, isSomeAnd, and isNoneOr

- `isSome()`: Returns `true` if the option is `Some`, narrowing the type to `Some<T>`.
- `isNone()`: Returns `true` if the option is `None`, narrowing the type to `None<T>`.
- `isSomeAnd(f)`: Returns `true` if the option is `Some` and the predicate `f`
  returns `true` for the value.
- `isNoneOr(f)`: Returns `true` if the option is `None` or if the predicate `f`
  returns `true` for the value.

> **Note**: For `isSomeAnd(f)` and `isNoneOr(f)`, if the predicate `f` throws
> an exception, the method returns `false`.

```typescript
import { some, none } from "@ts-rust/std";

const x = some(42);
const y = none<number>();

// Basic state checks
console.log(x.isSome()); // true
console.log(x.isNone()); // false
console.log(y.isSome()); // false
console.log(y.isNone()); // true

// Type narrowing
if (x.isSome()) {
  console.log(x.value); // 42, type is narrowed to Some<number>
}

// Combining with predicates
console.log(x.isSomeAnd((n) => n > 0)); // true
console.log(x.isSomeAnd((n) => n < 0)); // false
console.log(
  x.isSomeAnd(() => {
    throw new Error("Failed");
  }),
); // false

console.log(y.isNoneOr((n) => n > 0)); // true (because it's None)
console.log(x.isNoneOr((n) => n > 0)); // true (because 42 > 0)
console.log(x.isNoneOr((n) => n < 0)); // false
console.log(
  x.isNoneOr(() => {
    throw new Error("Failed");
  }),
); // false
```

### Mutating Methods

`Option<T>` provides methods that can mutate the option in place:

- `insert(x)`: Sets the value to `x`, overwriting any existing value.
- `getOrInsert(x)`: Sets the value to `x` if `None`, and returns the value.
- `take()`: Takes the value out, leaving `None` in its place.

```typescript
import { some, none } from "@ts-rust/std";

const x = none<number>();
console.log(x.getOrInsert(42)); // 42
console.log(x); // Some(42)

const y = some(10);
console.log(y.insert(20)); // 20
console.log(y); // Some(20)

const z = some(30);
console.log(z.take()); // Some(30)
console.log(z); // None
```

## `PendingOption<T>` for Async Operations

`PendingOption<T>` extends `Option<T>` functionality to asynchronous workflows.
It wraps a `Promise` that resolves to an `Option<T>`, allowing you to handle async
optional values with the same ergonomic methods as `Option<T>`.

## Key Methods of `PendingOption<T>`

`PendingOption<T>` mirrors some of the `Option<T>` methods but returns async
results.

> **Note**: If the underlying promise of a `PendingOption<T>` rejects, it resolves
> to `None` by default. This ensures that errors in the asynchronous resolution
> are handled gracefully without requiring explicit error handling for the promise
> itself. Below are examples of key methods.

### async map and andThen

> **Note**: If the callback f throws an exception or returns a rejected Promise, both methods return a PendingOption resolving to None.

```typescript
import { pendingOption, some, none } from "@ts-rust/std";

const x = pendingOption(some(5));
const y = pendingOption(none<number>());

const mapped = x.map((n) => Promise.resolve(n * 2));
console.log(await mapped); // Some(10)

const mappedError = x.map(() => {
  throw new Error("Failed");
});
console.log(await mappedError); // None

const mappedReject = x.map(() => Promise.reject(new Error("Failed")));
console.log(await mappedReject); // None

console.log(await y.map((n) => n * 2)); // None

const chained = x.andThen((n) => Promise.resolve(some(n + 1)));
console.log(await chained); // Some(6)

const chainedError = x.andThen(() => {
  throw new Error("Failed");
});
console.log(await chainedError); // None

console.log(await y.andThen((n) => some(n + 1))); // None
```

### async or and orElse

```typescript
import { pendingOption, some, none } from "@ts-rust/std";

const x = pendingOption(some(42));
const y = pendingOption(none<number>());

console.log(await x.or(some(0))); // Some(42)
console.log(await y.or(Promise.resolve(some(0)))); // Some(0)

console.log(await x.orElse(() => Promise.resolve(some(0)))); // Some(42)
console.log(await y.orElse(() => Promise.resolve(some(0)))); // Some(0)
```

### async inspect and tap

Inspect the inner value or entire awaited `Option` without modifying it:

```typescript
import { pendingOption, some, none } from "@ts-rust/std";

const x = pendingOption(some(42));
const y = pendingOption(none<number>());

await x.tap((n) => console.log(n)); // 42
await y.tap((n) => console.log(n)); // No output

await x.inspect((opt) => console.log(opt)); // Some(42)
await y.inspect((opt) => console.log(opt)); // None
```

### async match

The match method allows you to handle both `Some` and `None` cases asynchronously:

```typescript
import { pendingOption, some, none } from "@ts-rust/std";

const x = pendingOption(some(42));
const y = pendingOption(none<number>());

console.log(
  await x.match(
    (n) => n * 2, // 84
    () => 0,
  ),
);
console.log(
  await y.match(
    (n) => n * 2,
    () => 0, // 0
  ),
);
```

## Error Handling with OptionError

Some `Option<T>` and `PendingOption<T>` methods can throw an `OptionError` when
operations fail (e.g., calling `unwrap` on a `None`). The `OptionError` class
extends `AnyError` and uses `OptionErrorKind` to categorize failures.

### Common OptionError Kinds

- `ExpectCalledOnNone`: Thrown when expect is called on a `None`.
- `UnwrapCalledOnNone`: Thrown when unwrap is called on a `None`.
- `PredicateException`: Thrown when a predicate function throws an error
  (`f` in `andThen`, for example).

### Example: Handling OptionError

```typescript
import { none, isOptionError } from "@ts-rust/std";

const y = none<number>();

try {
  y.unwrap();
} catch (e) {
  // e is narrowed to OptionError
  if (isOptionError(e)) {
    console.log(e.kind); // "UnwrapCalledOnNone"
    console.log(e.message); // "[UnwrapCalledOnNone] `unwrap`: called on `None`."
  }
}
```

## Type Guards for Options

The library provides type guard functions to check if a value is an `Option<T>`
or `PendingOption<T>`, enabling type-safe runtime checks and type narrowing in
TypeScript. These utilities align with the library's focus on safe options by
ensuring you can verify the type of a value before operating on it.

### isOption

- `isOption(x)`: Returns `true` if the value is an `Option<T>`, narrowing its
  type to `Option<unknown>`.

```typescript
import { some, none, isOption } from "@ts-rust/std";

const x = some(42);
const y = none<number>();
const z = "not an option";

console.log(isOption(x)); // true
console.log(isOption(y)); // true
console.log(isOption(z)); // false

if (isOption(x)) {
  console.log(x.isSome()); // true, type narrowed to Option<unknown>
}
```

### isPendingOption

- `isPendingOption(x)`: Returns true if the value is a `PendingOption<T>`,
  narrowing its type to `PendingOption<unknown>`.

```typescript
import { pendingOption, some, none, isPendingOption } from "@ts-rust/std";

const x = pendingOption(some(42));
const y = pendingOption(none<number>());
const z = some(42); // Not a PendingOption
const something = getSomething(); // Assume it returns a PendingOption<number> or Promise<number>

console.log(isPendingOption(x)); // true
console.log(isPendingOption(y)); // true
console.log(isPendingOption(z)); // false

// type narrowed to PendingOption<number>, thanks to type inference
if (isPendingOption(something)) {
  console.log(await something);
}
```

## Additional Resources

- For synchronous error handling, see the [Result README](../result/README.md).
- For general usage, see the [main README](../../README.md).
