---
title: PendingResult
sidebar_label: PendingResult
---

[`PendingResult`](../api/Result/interfaces/PendingResult.mdx) represents a
[`Result`](./result.md), whose value is not yet resolved (thus, pending).

`PendingResult` implements `PromiseLike<Result<T, E>>` interface, which means that
it can be `Awaited` as a regular `Promise`.

In order to access the value of `PendingResult`, you need to await it, which
will resolve it to either `Ok<T>` or `Err<E>` variant. Once resolved, you can
use the methods available on [`Result`](./result.md) to work with the value.

## Constructors

- [`pendingErr(error: E | CheckedError<E> | Promise<E> | Promise<CheckedError<E>>)`](../api/Result/functions/pendingErr.mdx) -
creates a `PendingResult` that resolves to `Err<E>` variant.
- [`pendingOk(value: T | Promise<T>)`](../api/Result/functions/pendingOk.mdx) -
creates a `PendingOption` that resolves to `Some<T>` variant.
- [`pendingResult(resultOrFactory: | Result<T, E> | Promise<Result<T, E>> | (() => Result<T, E> | Promise<Result<T, E>>))`](../api/Result/functions/pendingResult.mdx) -
creates a `PendingOption` that resolves to the provided [`Result`](./result.md).

## Methods

### and

[`and<U>(x: Result<U, E> | PendingResult<U, E> | Promise<Result<U, E>>): PendingResult<Awaited<U>, Awaited<E>>`](../api/Result/interfaces/PendingResult.mdx#and)

Returns a `PendingResult` that resolves to `Err` if this result resolves to `Err`,
otherwise returns a `PendingResult` with `x`.

This is the asynchronous version of [`and`](./result.md#and).

:::note
If `x` is a `Promise` and rejects, `None` is returned.
:::

```ts
const x = ok<number, string>(1).toPending();
const y = ok<number, string>(2);
const z = err<number, string>("failure").toPending();

expect(await x.and(y)).toStrictEqual(ok(2));
expect(await x.and(z)).toStrictEqual(err("failure"));
expect(await z.and(x)).toStrictEqual(err("failure"));
```

### andThen

[`andThen<U>(f: (x: T) => Result<U, E> | PendingResult<U, E> | Promise<Result<U, E>>): PendingResult<Awaited<U>, Awaited<E>>`](../api/Result/interfaces/PendingResult.mdx#andthen)

Returns a `PendingResult` that resolves to `Err` if this result resolves to `Err`,
otherwise applies `f` to the resolved `Ok` value and returns its result.

This is the asynchronous version of [`andThen`](./result.md#andthen).

```ts
const x = ok<number, string>(2).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.andThen((n) => ok(n * 2))).toStrictEqual(ok(4));
expect(await x.andThen((_) => err("oops"))).toStrictEqual(err("oops"));
expect(await y.andThen((_) => err("oops"))).toStrictEqual(err("failure"));
```

### check

[`check(): Promise<[boolean, Awaited<T> | CheckedError<Awaited<E>>]>`](../api/Result/interfaces/PendingResult.mdx#check)

Inspects this `PendingResult`’s state, returning a promise of
a tuple with a success flag and either the value or error.

This is the asynchronous version of [`check`](./result.md#check).

:::note

- Resolves to `[true, Awaited<T>]` if this is an `Ok`, or to
`[false, CheckedError<Awaited<E>>]` if this is an `Err`.
- Never rejects, providing a safe way to await the result’s state.

:::

```ts
const x = ok<number, string>(42).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.check()).toEqual([true, 42]);
expect(await y.check()).toEqual([false, expect.objectContaining({ expected: "failure" })]);
```

### err

[`err(): PendingOption<Awaited<E>>`](../api/Result/interfaces/PendingResult.mdx#err)

Converts this `PendingResult` to a `PendingOption` containing the awaited error, if present.

Returns a `PendingOption` that resolves to [`Some`](../api/Option/type-aliases/Some.mdx)
with the error value if this resolves to an `Err` with [`ExpectedError`](../api/Result/type-aliases/ExpectedError.mdx),
or to [`None`](../api/Option/type-aliases/None.mdx) if this resolves to an `Ok`
or `Err` with [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).

This is the asynchronous version of [`err`](./result.md#err).

```ts
const x = ok<number, string>(1).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.err()).toStrictEqual(none());
expect(await y.err()).toStrictEqual(some("failure"));
```

### flatten

[`flatten<U, F>(this: PendingResult<Result<U, F>, F> | PendingResult<PendingResult<U, F>, F> | PendingResult<PromiseLike<Result<U, F>>, F>): PendingResult<Awaited<U>, Awaited<F>>`](../api/Result/interfaces/PendingResult.mdx#flatten)

Flattens a nested `PendingResult` into a single pending result,
resolving any inner `Result` or `PendingResult` to its final state.

This is the asynchronous version of [`flatten`](./result.md#flatten).

```ts
const x = ok(ok(6)).toPending();
const y = ok(err<number, string>("oops")).toPending();

expect(await x.flatten()).toStrictEqual(ok(6));
expect(await y.flatten()).toStrictEqual(err("oops"));
```

### inspect

[`inspect(f: (x: T) => unknown): PendingResult<T, E>`](../api/Result/interfaces/PendingResult.mdx#inspect)

Calls `f` with the value if this pending result resolves to an `Ok`,
then returns a new pending result with the original state.

This is the asynchronous version of [`inspect`](./result.md#inspect).

:::note

- Returns a new `PendingResult` instance, not the original reference.
- If `f` throws or returns a `Promise` that rejects, the error is ignored,
and the returned promise still resolves to the original state.

:::

```ts
const x = ok<number, string>(2).toPending();
const y = err<number, string>("failure").toPending();
let sideEffect = 0;

expect(await x.inspect(n => (sideEffect = n))).toStrictEqual(ok(2));
expect(await x.inspect(_ => { throw new Error() })).toStrictEqual(ok(2));
expect(sideEffect).toBe(2);
expect(await y.inspect(n => (sideEffect = n))).toStrictEqual(err("failure"));
expect(sideEffect).toBe(2); // Unchanged
```

### inspectErr

[`inspectErr(f: (x: CheckedError<E>) => unknown): PendingResult<T, E>`](../api/Result/interfaces/PendingResult.mdx#inspecterr)

Calls `f` with the error if this pending result resolves to an `Err`,
then returns a new pending result with the original state.

This is the asynchronous version of [`inspectErr`](./result.md#inspecterr).

:::note

- Returns a new `PendingResult` instance, not the original reference.
- If `f` throws or returns a `Promise` that rejects, the error is ignored,
and the returned promise still resolves to the original state.

:::

```ts
const x = ok<number, string>(2).toPending();
const y = err<number, string>("failure").toPending();
let sideEffect: CheckedError<string> | null = null;

expect(await x.inspectErr(n => (sideEffect = n))).toStrictEqual(ok(2));
expect(await x.inspectErr(_ => { throw new Error() })).toStrictEqual(ok(2));
expect(sideEffect).toBeNull();
expect(await y.inspectErr(n => (sideEffect = n))).toStrictEqual(err("failure"));
expect(await y.inspectErr(_ => { throw new Error() })).toStrictEqual(err("failure"));
expect(isCheckedError(sideEffect)).toBe(true);
```

### iter

[`iter(): AsyncIterableIterator<Awaited<T>, Awaited<T>, void>`](../api/Result/interfaces/PendingResult.mdx#iter)

Returns an async iterator over this pending result’s value, yielding it if
it resolves to `Ok` or nothing if it resolves to `Err`.

:::note

- Yields exactly one item for a resolved `Ok`, or zero items for a resolved `Err`.
- Compatible with `for await...of` loops and async spread operators (with caution).
- Ignores the error value in `Err` cases, focusing only on the success case.

:::

```ts
const x = ok<number, string>(42).toPending();
const y = err<number, string>("failure").toPending();

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

[`map<U>(f: (x: T) => U): PendingResult<Awaited<U>, Awaited<E>>`](../api/Result/interfaces/PendingResult.mdx#map)

Maps the resolved value with `f`, returning a `PendingResult` with
the result if `Ok`, or the original `Err` if `Err`.

This is the asynchronous version of [`map`](./result.md#map).

:::note
If `f` throws or returns a rejected promise, returns a `PendingResult`
with an `Err` containing an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).
:::

```ts
const x = ok<number, string>(2).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.map(n => n * 2)).toStrictEqual(ok(4));
expect((await x.map(() => { throw new Error("boom") })).unwrapErr().unexpected).toBeDefined();
expect(await y.map(n => n * 2)).toStrictEqual(err("failure"));
```

### mapAll

[`mapAll<U, F>(f: (x: Result<T, E>) => Result<U, F> | PendingResult<U, F> | Promise<Result<U, F>>): PendingResult<Awaited<U>, Awaited<F>>`](../api/Result/interfaces/PendingResult.mdx#mapall)

Maps this pending result by applying a callback to its full state,
executing the callback for both `Ok` and `Err`, returning
a new `PendingResult`.

Unlike `andThen`, which only invokes the callback for `Ok`,
this method always calls `f`, passing the entire `Result` as its argument.

This is the asynchronous version of [`mapAll`](./result.md#mapall).

:::note
If `f` throws or returns a `Promise` that rejects, the newly created `PendingResult`
will resolve to an `Err` with an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).
:::

```ts
const okRes = ok<number, string>(42).toPending();
const errRes = err<number, string>("failure").toPending();

const okMapped = okRes.mapAll(res => Promise.resolve(ok(res.unwrapOr(0) + 1)));
expect(await okMapped).toStrictEqual(ok(43));

const errMapped = errRes.mapAll(res => Promise.resolve(ok(res.unwrapOr(0) + 1)));
expect(await errMapped).toStrictEqual(ok(1));

const throwMapped = okRes.mapAll(() => { throw new Error("boom") });
expect((await throwMapped).unwrapErr().unexpected).toBeDefined();
```

### mapErr

[`mapErr<F>(f: (x: E) => F): PendingResult<Awaited<T>, Awaited<F>>`](../api/Result/interfaces/PendingResult.mdx#maperr)

Transforms this pending result by applying `f` to the error if it resolves
to an `Err` with an expected error, or preserves the `Ok` unchanged.

This is the asynchronous version of [`mapErr`](./result.md#maperr).

:::note

- If `f` throws or returns a rejected promise, returns a `PendingResult`
with an `Err` containing an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).
- If this resolves to an `Err` with an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx),
`f` is not called, and the original error is preserved.

:::

```ts
const x = ok<number, string>(2).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.mapErr(e => e.length)).toStrictEqual(ok(2));
expect(await y.mapErr(e => e.length)).toStrictEqual(err(7));
expect((await y.mapErr(() => { throw new Error("boom") })).unwrapErr().unexpected).toBeDefined();
```

### match

[`match<U, F = U>(f: (x: T) => U, g: (e: CheckedError<E>) => F): Promise<Awaited<U | F>>`](../api/Result/interfaces/PendingResult.mdx#match)

Returns this pending result if it resolves to an `Ok`, otherwise returns `x`.

This is the asynchronous version of [`match`](./result.md#match).

:::note
If `f` or `g` throws or returns a rejected `Promise`, the returned promise rejects with
the original error. In this case the caller is responsible for handling the rejection.
:::

:::danger
 Rejects with [`ResultError`](../errors/result-error.md) if `f` or `g` throws an exception or rejects,
  original error will be set as [`ResultError.reason`](../api/Result/classes/ResultError.mdx#properties).
:::

```ts
const x = ok<number, string>(2).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.match(n => n * 2, () => 0)).toBe(4);
expect(await y.match(n => n * 2, e => e.expected?.length)).toBe(7);
```

### or

[`or<F>(x: Result<T, F> | PendingResult<T, F> | Promise<Result<T, F>>): PendingResult<Awaited<T>, Awaited<F>>`](../api/Result/interfaces/PendingResult.mdx#or)

Returns this pending result if it resolves to an `Ok`, otherwise returns `x`.

This is the asynchronous version of [`or`](./result.md#or).

:::note
If this result resolves to an `Err` and `x` is a `Promise` that rejects, the resulting
`PendingResult` resolves to an `Err` with an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).
:::

```ts
const x = ok<number, string>(2).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.or(ok(3))).toStrictEqual(ok(2));
expect(await x.or(err("another one"))).toStrictEqual(ok(2));
expect(await y.or(ok(3))).toStrictEqual(ok(3));
expect(await y.or(err("another one"))).toStrictEqual(err("failure"));
expect((await y.or(Promise.reject(new Error("boom")))).unwrapErr().unexpected).toBeDefined();
```

### orElse

[`orElse<F>(f: () => Result<T, F> | PendingResult<T, F> | Promise<Result<T, F>>): PendingResult<Awaited<T>, Awaited<F>>`](../api/Result/interfaces/PendingResult.mdx#orelse)

Returns this `PendingResult` if it resolves to `Ok`, otherwise
returns a `PendingResult` with the result of `f`.

This is the asynchronous version of [`orElse`](./result.md#orelse).

:::note
If `f` throws or returns a rejected promise, the resulting `PendingResult` resolves
to an `Err` with an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).
:::

```ts
const x = ok<number, string>(2).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.orElse(() => ok(3))).toStrictEqual(ok(2));
expect(await y.orElse(() => Promise.resolve(ok(3)))).toStrictEqual(ok(3));
expect((await y.orElse(() => { throw new Error("boom") })).unwrapErr().unexpected).toBeDefined();
expect(await y.orElse(() => err("another one"))).toStrictEqual(err("another one"));
```

### tap

[`tap(f: (x: Result<T, E>) => unknown): PendingResult<T, E>`](../api/Result/interfaces/PendingResult.mdx#tap)

Executes `f` with the resolved result, then returns a new `PendingResult` unchanged.

This is the asynchronous version of [`tap`](./result.md#tap).

:::note

- If `f` throws or rejects, the error is ignored.
- If `f` returns a promise, the promise is not awaited before returning.

:::

```ts
const x = pendingResult(ok<number, string>(42));
const y = pendingResult(err<number, string>("failure"));
let log = "";

expect(await x.tap(res => (log = res.toString()))).toStrictEqual(ok(42));
expect(log).toBe("Ok { 42 }");
expect(await y.tap(res => (log = res.toString()))).toStrictEqual(err("failure"));
expect(log).toBe("Err { 'failure' }");
```

### transpose

[`transpose<U, F>(this: PendingResult<Option<U>, F>): PendingOption<Result<U, F>>`](../api/Result/interfaces/PendingResult.mdx#transpose)

Transposes a `PendingResult` of an `Option` into a `PendingOption` containing a `Result`.

This is the asynchronous version of [`transpose`](./result.md#transpose).

:::note
Only available when the `PendingResult` resolves to an `Option`.
:::

```ts
const x = pendingOption(some(ok(2)));
const y = pendingOption(some(err("error")));
const z = pendingOption(none<Result<number, string>>());

expect(await x.transpose()).toStrictEqual(ok(some(2)));
expect(await y.transpose()).toStrictEqual(err("error"));
expect(await z.transpose()).toStrictEqual(ok(none()));
```

### try

[`try(): Promise<[boolean, CheckedError<Awaited<E>> | undefined, Awaited<T> | undefined]>`](../api/Result/interfaces/PendingResult.mdx#try)

Extracts this `PendingResult`’s state, returning a promise of a tuple with a success flag, error, and value.

Inspired by the [`Try Operator`](https://github.com/arthurfiorette/proposal-try-operator) proposal.

This is the asynchronous version of [`try`](./result.md#try).

:::note

- Resolves to `[true, undefined, Awaited<T>]` if this is an `Ok`,
or `[false, CheckedError<Awaited<E>>, undefined]` if this is an `Err`.
- Never rejects, offering a safe way to await the result’s state
with explicit success indication.

:::

```ts
const x = ok<number, string>(42).toPending();
const y = err<number, string>("failure").toPending();

expect(await x.try()).toEqual([true, undefined, 42]);
expect(await y.try()).toEqual([false, expect.objectContaining({ expected: "failure" }), undefined]);
```
