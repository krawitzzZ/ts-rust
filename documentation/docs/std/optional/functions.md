---
title: Functions
sidebar_label: functions
---

## Useful functions to work with `Option` types

### some

[`some<T>(value: T): Some<T>`](../api/Option/functions/some.mdx)

Creates a [`Some`](../api/Option/type-aliases/Some.mdx) variant of an `Option`
containing the given value.

```ts
const x = some(42);

expect(x.isSome()).toBe(true);
expect(x.expect("Not 42")).toBe(42);
```

### none

[`none<T>(): Option<T>`](../api/Option/functions/none.mdx)

Creates a [`None`](../api/Option/type-aliases/None.mdx) variant of an `Option`,
representing the absence of a value. The type argument is optional when the
`Option` type is already known.

```ts
const x: Option<number> = none();

expect(x.isNone()).toBe(true);
expect(() => x.expect("x is `None`")).toThrow("x is `None`");
```

### fromNullable

[`fromNullable<T>(value: T): Option<NonNullable<T>>`](../api/Option/functions/fromNullable.mdx)

Creates a `Some` unless the value is `null` or `undefined`.

```ts
const x = fromNullable(42);
const y = fromNullable<number | null>(null);

expect(x).toStrictEqual(some(42));
expect(y.isNone()).toBe(true);
```

### fromUndefined

[`fromUndefined<T>(value: T | undefined): Option<Exclude<T, undefined>>`](../api/Option/functions/fromUndefined.mdx)

Creates a `Some` unless the value is `undefined`. Unlike `fromNullable`, `null`
is treated as a present value.

:::note
`undefined` is a valid argument without forcing `T` to `undefined`. When control
flow has already narrowed a value to `undefined`, pass an explicit type argument
(`fromUndefined<string>(x)`).
:::

```ts
const x = fromUndefined<string>(undefined);
const y = fromUndefined<number | null>(null);

expect(x.isNone()).toBe(true);
expect(y).toStrictEqual(some(null));
```

### pendingSome

[`pendingSome<T>(value: T | Promise<T>): PendingOption<Awaited<T>>`](../api/Option/functions/pendingSome.mdx)

Creates a [`PendingOption`](../api/Option/interfaces/PendingOption.mdx) that
resolves to `Some` containing the awaited value.

Takes a value or a promise and wraps its resolved result in a `Some`,
ensuring the value type is `Awaited` to handle any `PromiseLike` input.

```ts
const x = pendingSome(42);
const y = pendingSome(Promise.resolve("hello"));

expect(await x).toStrictEqual(some(42));
expect(await y).toStrictEqual(some("hello"));
```

### pendingNone

[`pendingNone<T>(): PendingOption<Awaited<T>>`](../api/Option/functions/pendingNone.mdx)

Creates a [`PendingOption`](../api/Option/interfaces/PendingOption.mdx) that resolves to `None`.

Produces a pending option representing the absence of a value, with the type
resolved to `Awaited` for consistency with asynchronous operations.

```ts
const x = pendingNone<number>();

expect(await x).toStrictEqual(none());
expect((await x).isNone()).toBe(true);
```

### isOption

[`isOption(x: unknown): x is Option<unknown>`](../api/Option/functions/isOption.mdx)

Checks if a value is an `Option`, narrowing its type to `Option<unknown>`.

This type guard verifies whether the input conforms to the [`Optional`](../api/Option/interfaces/Optional.mdx)
interface, indicating it is either a `Some` or `None`.

```ts
const x: unknown = some(42);
const y: unknown = none<number>();
const z: unknown = "not an option";

expect(isOption(x)).toBe(true);
expect(isOption(y)).toBe(true);
expect(isOption(z)).toBe(false);

if (isOption(x)) {
  const _ = x.isSome();
  expect(x.isSome()).toBe(true); // Type narrowed to Option<unknown>
}
```

### isPendingOption

[`isPendingOption(x: unknown): x is PendingOption<unknown>`](../api/Option/functions/isPendingOption.mdx)

Checks if a value is a [`PendingOption`](../api/Option/interfaces/PendingOption.mdx),
narrowing its type to `PendingOption<unknown>`.

This type guard verifies whether the input is a `PendingOption`, indicating it
wraps a `Promise` resolving to an `Option` (either `Some` or `None`).

```ts
const x: unknown = pendingOption(some(42));
const y: unknown = pendingOption(none<number>());
const z: unknown = some(42); // Not a PendingOption

expect(isPendingOption(x)).toBe(true);
expect(isPendingOption(y)).toBe(true);
expect(isPendingOption(z)).toBe(false);

if (isPendingOption(x)) {
  expect(await x).toStrictEqual(some(42)); // Type narrowed to PendingOption<unknown>
}
```

### isOptionError

[`isOptionError(e: unknown): e is OptionError`](../api/Option/functions/isOptionError.mdx)

Checks if a value is an [`OptionError`](../errors/option-error.md), narrowing its type if true.

```ts
try {
  const x = none();
  x.expect("x is none");
} catch (e) {
  if (isOptionError(e)) {
    console.log(e.kind); // type narrowed to OptionError
  }
}
```
