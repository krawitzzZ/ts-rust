---
title: PendingOption
sidebar_label: PendingOption
---

[`PendingOption`](../api/Option/interfaces/PendingOption.mdx) represents an
[`Option`](./option.md), whose value is not yet resolved (thus, pending). Due to
the asynchronous nature of JavaScript, a single [`Option`](./option.md) type is
not enough to represent the conditional value, `PendingOption` closes this gap and offers
rich set of methods, similar to ones an [`Option`](./option.md) has.

`PendingOption` implements `PromiseLike<Option<T>>` interface, which means that
it can be `Awaited` as a regular `Promise`.

In order to access the value of `PendingOption`, you need to await it, which
will resolve it to either `Some<T>` or `None` variant. Once resolved, you can
use the methods available on [`Option`](./option.md) to work with the value.

## Constructors

- [`pendingNone()`](../api/Option/functions/pendingNone.mdx) - creates a `PendingOption`
that resolves to `None` variant.
- [`pendingSome<T>(value: T | Promise<T>)`](../api/Option/functions/pendingSome.mdx) - creates
a `PendingOption` that resolves to `Some<T>` variant.
- [`pendingOption(optionOrFactory: Option<T> | Promise<Option<T>> | (() => Option<T> | Promise<Option<T>>))`](../api/Option/functions/pendingOption.mdx) -
creates a `PendingOption` that resolves to the provided [`Option`](./option.md).

## Methods

### and

[`and<U>(x: Option<U> | Promise<Option<U>>): PendingOption<Awaited<U>>`](../api/Option/interfaces/PendingOption.mdx#and)

Returns a `PendingOption` with `None` if this option resolves to `None`,
otherwise returns a `PendingOption` with `x`.

This is the asynchronous version of [`and`](./option.md#and).

:::note
If `x` is a `Promise` and rejects, `None` is returned.
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.and(some(3))).toStrictEqual(some(3));
expect(await x.and(Promise.resolve(some(3)))).toStrictEqual(some(3));
expect(await x.and(none())).toStrictEqual(none());
expect(await x.and(Promise.resolve(none()))).toStrictEqual(none());
expect(await y.and(some(3))).toStrictEqual(none());
expect(await y.and(Promise.resolve(none()))).toStrictEqual(none());
```

### andThen

[`andThen<U>(f: (x: T) => Option<U> | Promise<Option<U>>): PendingOption<Awaited<U>>`](../api/Option/interfaces/PendingOption.mdx#andthen)

Returns a `PendingOption` with `None` if this [`Option`](./option.md) resolves to `None`,
otherwise applies `f` to the resolved value and returns the result.

This is the asynchronous version of [`andThen`](./option.md#andthen).

:::note
If `f` rejects or throws, `None` is returned.
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.andThen((n) => some(n * 2))).toStrictEqual(some(4));
expect(await x.andThen((n) => Promise.resolve(some(n * 2)))).toStrictEqual(some(4));
expect(await x.andThen((_) => none())).toStrictEqual(none());
expect(await y.andThen((n) => some(n * 2))).toStrictEqual(none());
```

### filter

[`filter(f: (x: T) => boolean | Promise<boolean>): PendingOption<T>`](../api/Option/interfaces/PendingOption.mdx#filter)

Returns a `PendingOption` with `None` if the option resolves to `None`,
otherwise calls `f` with the resolved value and returns a `PendingOption`
with the original value if `f` resolves to `true`, or `None` otherwise.

This is the asynchronous version of [`filter`](./option.md#filter).

:::note
If `f` rejects or throws, `None` is returned.
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.filter((n) => n > 0)).toStrictEqual(some(2));
expect(await x.filter((n) => Promise.resolve(n < 0))).toStrictEqual(none());
expect(await y.filter((_) => true)).toStrictEqual(none());
```

### flatten

[`flatten<U>(this: PendingOption<Option<U>> | PendingOption<PendingOption<U>> | PendingOption<PromiseLike<Option<U>>>): PendingOption<Awaited<U>>`](../api/Option/interfaces/PendingOption.mdx#flatten)

Flattens a `PendingOption` of a `PendingOption` or [`Option`](./option.md), resolving nested pending states.

This is the asynchronous version of [`flatten`](./option.md#flatten).

:::note
If inner `Option` is wrapped in a `Promise` and rejects,
flattened `PendingOption` with `None` is returned.
:::

```ts
const option1: PendingOption<Option<number>> = getPendingOption();
option1.flatten(); // PendingOption<number>

const option2: PendingOption<PendingOption<number>> = getPendingOption();
option2.flatten(); // PendingOption<number>

const option3: PendingOption<PendingOption<PendingOption<number>>> = getPendingOption();
option3.flatten(); // PendingOption<Option<number>>
```

### inspect

[`inspect(f: (x: T) => unknown): PendingOption<T>`](../api/Option/interfaces/PendingOption.mdx#inspect)

Calls `f` with the resolved value if the option is `Some`, then returns this
`PendingOption` unchanged. Useful for side effects.

This is the asynchronous version of [`inspect`](./option.md#inspect).

:::note
Returns a new `PendingOption` instance with the same value as the original,
rather than the exact same reference. The returned option is a distinct object,
preserving the original value.
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());
let sideEffect = 0;

expect(await x.inspect((n) => (sideEffect = n))).toStrictEqual(some(2));
expect(sideEffect).toBe(2);
expect(await y.inspect((n) => (sideEffect = n))).toStrictEqual(none());
expect(sideEffect).toBe(2); // Unchanged
```

### iter

[`iter(): AsyncIterableIterator<Awaited<T>, Awaited<T>, void>`](../api/Option/interfaces/PendingOption.mdx#iter)

Returns an async iterator over the pending option’s value, yielding it if
it resolves to `Some` or nothing if it resolves to `None`.

:::note

- Yields exactly one item for a resolved `Some`, or zero items for a resolved `None`.
- Compatible with `for await...of` loops and async spread operators (with caution).

:::

```ts
const x = some(42).toPending();
const y = none<number>().toPending();

const iterX = x.iter();
expect(await iterX.next()).toEqual({ value: 42, done: false });
expect(await iterX.next()).toEqual({ done: true });

const iterY = y.iter();
expect(await iterY.next()).toEqual({ done: true });

async function collect(iter: AsyncIterableIterator<number, number, void>) {
  const result = [];
  for await (const val of iter) result.push(val);
  return result;
}
expect(await collect(x.iter())).toEqual([42]);
expect(await collect(y.iter())).toEqual([]);
```

### map

[`map<U>(f: (x: T) => U): PendingOption<Awaited<U>>`](../api/Option/interfaces/PendingOption.mdx#map)

Maps the resolved value with `f`, returning a `PendingOption` with the
result if `Some`, or `None` otherwise.

This is the asynchronous version of [`map`](./option.md#map).

:::note
If `f` throws or rejects, returns `None`.
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.map((n) => n * 2)).toStrictEqual(some(4));
expect(await x.map((n) => Promise.resolve(n * 2))).toStrictEqual(some(4));
expect(await y.map((n) => n * 2)).toStrictEqual(none());
```

### mapAll

[`mapAll<U>(f: (x: Option<T>) => Option<U> | Promise<Option<U>>): PendingOption<Awaited<U>>`](../api/Option/interfaces/PendingOption.mdx#mapall)

Maps this option by applying a callback to its full state, executing the
callback for both `Some` and `None`, returning a new `PendingOption`.

Unlike [`andThen`](#andthen), which only invokes the callback for `Some`,
this method always calls `f`, passing the entire [`Option`](./option.md) as its argument.

This is the asynchronous version of [`mapAll`](./option.md#mapall).

:::note
If `f` throws or returns a `Promise` that rejects, the newly
created `PendingOption` will resolve to a `None`.
:::

```ts
const someOpt = pendingOption(some(42));
const noneOpt = pendingOption(none<number>());

const someMapped = someOpt.mapAll((opt) => Promise.resolve(some(opt.unwrapOr(0))));
expect(await someMapped).toStrictEqual(some(42));

const noneMapped = noneOpt.mapAll((opt) => Promise.resolve(some(opt.unwrapOr(0) + 1)));
expect(await noneMapped).toStrictEqual(some(1));
```

### match

[`match<U, F = U>(f: (x: T) => U, g: () => F): Promise<Awaited<U | F>>`](../api/Option/interfaces/PendingOption.mdx#match)

Matches the resolved option, returning `f` applied to the value if `Some`,
or `g` if `None`. Returns a `Promise` with the result.

This is the asynchronous version of [`match`](./option.md#match).

:::note
If `f` or `g` throws or returns a rejected `Promise`, the returned promise
rejects with the original error. In this case the caller is responsible
for handling the rejection.
:::

:::danger
Rejects with `OptionError` if `f` or `g` throws an exception or rejects,
original error will be set as [`OptionError.reason`](../api/Option/classes/OptionError.mdx#properties).
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.match(n => n * 2, () => 0)).toBe(4);
expect(await y.match(n => n * 2, () => 0)).toBe(0);
await expect(y.match(n => n * 2, () => { throw new Error() })).rejects.toThrow(OptionError);
```

### okOr

[`okOr<E>(y: Awaited<E>): PendingResult<T, E>`](../api/Option/interfaces/PendingOption.mdx#okor)

Converts to a `PendingResult`, using `y` as the error value if the
`PendingOption` resolves to `None`.

This is the asynchronous version of [`okOr`](./option.md#okor).

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.okOr("error")).toStrictEqual(ok(2));
expect(await y.okOr("error")).toStrictEqual(err("error"));
```

### okOrElse

[`okOrElse<E>(mkErr: () => E | Promise<E>): PendingResult<T, E>`](../api/Option/interfaces/PendingOption.mdx#okorelse)

Converts to a `PendingResult`, using the result of `mkErr`
as the error value if this resolves to `None`.

This is the asynchronous version of [`okOrElse`](./option.md#okorelse).

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.okOrElse(() => "error")).toStrictEqual(ok(2));
expect(await y.okOrElse(() => Promise.resolve("error"))).toStrictEqual(err("error"));
```

### or

[`or(x: Option<T> | Promise<Option<T>>): PendingOption<Awaited<T>>`](../api/Option/interfaces/PendingOption.mdx#or)

Returns this `PendingOption` if it resolves to `Some`, otherwise
returns a `PendingOption` with `x`.

This is the asynchronous version of [`or`](./option.md#or).

:::note
If `x` is a `Promise` that rejects, `None` is returned.
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.or(some(3))).toStrictEqual(some(2));
expect(await x.or(Promise.resolve(none()))).toStrictEqual(some(2));
expect(await y.or(some(3))).toStrictEqual(some(3));
expect(await y.or(Promise.resolve(none()))).toStrictEqual(none());
```

### orElse

[`orElse(f: () => Option<T> | Promise<Option<T>>): PendingOption<Awaited<T>>`](../api/Option/interfaces/PendingOption.mdx#orelse)

Returns this `PendingOption` if it resolves to `Some`, otherwise
returns a `PendingOption` with the result of `f`.

This is the asynchronous version of [`orElse`](./option.md#orelse).

:::note
If `f` throws or rejects, `None` is returned.
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.orElse(() => some(3))).toStrictEqual(some(2));
expect(await y.orElse(() => some(1))).toStrictEqual(some(1));
expect(await y.orElse(() => Promise.resolve(some(3)))).toStrictEqual(some(3));
```

### tap

[`tap(f: (x: Option<T>) => unknown): PendingOption<T>`](../api/Option/interfaces/PendingOption.mdx#tap)

Executes `f` with the resolved option, then returns a new `PendingOption` unchanged.

This is the asynchronous version of [`tap`](./option.md#tap).

:::note

- If `f` throws or rejects, the error is ignored.
- If `f` returns a promise, the promise is not awaited before returning.

:::

```ts
const x = pendingOption(some(42));
const y = pendingOption(none<number>());
let log = "";

expect(await x.tap((opt) => (log = opt.toString()))).toStrictEqual(some(42));
expect(log).toBe("Some { 42 }");
expect(await y.tap((opt) => (log = opt.toString()))).toStrictEqual(none());
expect(log).toBe("None");
```

### transpose

[`transpose<U, E>(this: PendingOption<Result<U, E>>): PendingResult<Option<U>, E>`](../api/Option/interfaces/PendingOption.mdx#transpose)

Transposes a `PendingOption` of a `Result` into a `PendingResult` containing an [`Option`](./option.md).

This is the asynchronous version of [`transpose`](./option.md#transpose).

:::note
Only available on `PendingOption`s that hold a [`Result`](../resultant/result.md) value.
:::

```ts
const x = pendingOption(none<Result<number, string>>());
const y = pendingOption(some<Result<number, string>>(ok(2)));
const z = pendingOption(some<Result<number, string>>(err("error")));

expect(await x.transpose()).toStrictEqual(ok(none()));
expect(await y.transpose()).toStrictEqual(ok(some(2)));
expect(await z.transpose()).toStrictEqual(err("error"));
```

### xor

[`xor(y: Option<T> | Promise<Option<T>>): PendingOption<Awaited<T>>`](../api/Option/interfaces/PendingOption.mdx#xor)

Returns a `PendingOption` with `Some` if exactly one of this option or
`y` resolves to `Some`, otherwise returns a `PendingOption` with `None`.

This is the asynchronous version of [`xor`](./option.md#xor).

:::note
If `y` is a `Promise` that rejects, `None` is returned.
:::

```ts
const x = pendingOption(some(2));
const y = pendingOption(none<number>());

expect(await x.xor(some(3))).toStrictEqual(none());
expect(await x.xor(Promise.resolve(none()))).toStrictEqual(some(2));
expect(await y.xor(some(3))).toStrictEqual(some(3));
expect(await y.xor(Promise.resolve(none()))).toStrictEqual(none());
```
