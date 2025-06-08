---
title: Result
sidebar_label: Result
---

[`Result<T, E>`](../api/Result/type-aliases/Result.mdx) is the type used for
returning and propagating errors. It is a type with the variants,
[`Ok<T>`](../api/Result/type-aliases/Ok.mdx), representing success and containing
a value, and [`Err<E>`](../api/Result/type-aliases/Err.mdx), representing error
and containing an error value.

Unlike in Rust, in JavaScript errors may occur at any time - builtin module may
throw, 3rd party package may throw, runtime errors are all over the place.
[`Result`](../api/Result/type-aliases/Result.mdx) type from `@ts-rust/std` package
aims to leverage this behavior by offering an API that is "throwless".  As long as
you use the API provided by [`Result`](../api/Result/type-aliases/Result.mdx),
all possible errors will be handled gracefully and returned as
[`Err<E>`](../api/Result/type-aliases/Err.mdx) variant. This is achieved by
using [`CheckedError<E>`](../errors/checked-error.md) type.
Let's take a look at the example so you can see how it works in practice.

Say we have a function that returns a result with either a number or an error:

```ts
function getNumberResult(): Result<number, string> {
  if (new Date().getDay() === 0) {
    // if today is Sunday, we throw an error
    // note: this is just an example! never do that in production code
    throw new Error("no numbers on Sundays");
  }

  return Math.random() > 0.5 ? ok(2) : err("random error");
}
```

:::info
functions `runResult`, `ok`, `err` as well as type `Result` are imported from `@ts-rust/std` package.
:::

:::warning
In the example above, we throw an exception if today is Sunday. This is just an example
to illustrate how `Result` in this library works. In production code,
you should never throw exceptions from functions whose return type is `Result<T, E>`!
:::

We can use now `runResult` function to execute the function and handle the result safely.
`runResult` will catch any errors thrown by the function and return an `Err<E>` variant if
an error occurs.

:::note
For functions that return raw values instead of `Result`, you can use [`run`](./functions.md#run)
function instead.  `run` will return a `Result<T, E>` where `T` is the type of
the value returned by the function
:::

```ts
const result: Result<number, string> = runResult(getNumberResult);
```

From this point on, we can safely work with the `result` variable.

If the result is `Ok<number>`, we can safely access the value.

```ts
if (result.isOk()) {
  console.log(`Got number: ${result.value}`); // (property) value: number
  return;
}
```

If the result is not `Ok<number>`, we can handle the error. Thanks to the type inference,
typescript knows that `result` is of type `Err<string>` (due to the way how [`isOk`](#isok)
and [`isErr`](#iserr) are implemented).

```ts
const { error } = result; // const error: CheckedError<string>

if (error.isExpected()) {
  // if error is expected, (e.g. `getNumberResult` returned `err(...)`) we can access the error value
  console.log("Expected error of type string:", error.expected); // (property) expected: string
}

if (error.isUnexpected()) {
  // the same way, if the error is unexpected (e.g. `getNumberResult` threw an exception),
  // we can access the underlying error and its reason
  console.log("Unexpected error:", error.unexpected); // (property) unexpected: ResultError
  console.log("Error reason:", error.unexpected.reason); // (property) AnyError<ResultErrorKind>.reason: Error
}
```

## Variants

- [`Ok<T>`](../api/Result/type-aliases/Ok.mdx) - Ok value of type `T`.
- [`Err<E>`](../api/Result/type-aliases/Err.mdx) - Error value of type [`CheckedError<E>`](../errors/checked-error.md).

## Constructors

- [`ok(value: T)`](../api/Result/functions/ok.mdx) - creates `Ok<T>` variant.
- [`err(err: E)`](../api/Result/functions/err.mdx) - creates `Err<E>` variant.

## Methods

### and

[`and<U>(x: Result<U, E>): Result<U, E>`](../api/Result/interfaces/Resultant.mdx#and)

Returns `x` if this result is `Ok`, otherwise returns the `Err` value of self.

```ts
const x = ok<number, string>(1);
const y = ok<number, string>(2);
const z = err<number, string>("failure");

expect(x.and(y)).toStrictEqual(ok(2));
expect(x.and(z)).toStrictEqual(err("failure"));
expect(z.and(x)).toStrictEqual(err("failure"));
```

### andThen

[`andThen<U>(f: (x: T) => Result<U, E>): Result<U, E>`](../api/Result/interfaces/Resultant.mdx#andthen)

Applies `f` to the value if this result is `Ok` and returns its result,
otherwise returns the `Err` value of self.

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.andThen((n) => ok(n * 2))).toStrictEqual(ok(4));
expect(y.andThen((n) => ok(n * 2))).toStrictEqual(err("failure"));
```

### check

[`check(this: SettledResult<T, E>): this extends Ok<T, E> ? [true, T] : [false, CheckedError<E>]`](../api/Result/interfaces/Resultant.mdx#check)

Inspects the `Result`’s state, returning a tuple indicating success and either a value or an error.

:::note

- Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
- Returns `[true, T]` if this is an `Ok`, or `[false, CheckedError<E>]` if this is an `Err`.
- Never throws, providing a safe way to access the result’s state without unwrapping.

:::

```ts
const x = ok<number, string>(42);
const y = err<number, string>("failure");

expect(x.check()).toEqual([true, 42]);
expect(y.check()).toEqual([false, expect.objectContaining({ expected: "failure" })]);
```

### clone

[`clone<U, F>(this: Result<Cloneable<U>, Cloneable<F>>): Result<U, F>`](../api/Result/interfaces/Resultant.mdx#clone)

Returns a clone of the `Result`.

:::note
Only available on `Result`s with [`Cloneable`](../api/Types/type-aliases/Cloneable.mdx) value and error.
:::

```ts
class CloneableClass implements Clone<CloneableClass> {
  constructor(public a: number) {}

  clone(this: Clone<CloneableClass>): CloneableClass;
  clone(this: CloneableClass): CloneableClass;
  clone(): CloneableClass {
    return new CloneableClass(this.a);
  }
}

const cloneable = new CloneableClass(1);
const x = ok<CloneableClass, string>(cloneable);
const y = err<CloneableClass, string>("oops");

expect(x.clone()).not.toBe(x); // Different reference
expect(x.clone()).toStrictEqual(cloneable);
expect(y.clone().unwrapErr().expected).toBe("oops");
```

### copy

[`copy(): Result<T, E>`](../api/Result/interfaces/Resultant.mdx#copy)

Returns a **shallow** copy of the `Result`.

```ts
const value = { a: 1 };
const x = ok<{ a: number }, string>(value);

expect(x.copy()).toStrictEqual(ok({ a: 1 }));
expect(x.copy()).not.toBe(x); // Different result reference
expect(x.copy().unwrap()).toBe(value); // Same value reference
```

### err

[`err(this: SettledResult<T, E>): Option<E>`](../api/Result/interfaces/Resultant.mdx#err)

Converts this `Result` to an `Option` containing the error, if present.

Returns `Some` with the error value if this is an `Err`, or `None` if this is an `Ok`.

:::note

- Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
- Extracts the error from [`CheckedError`](../errors/checked-error.md) if it’s an
[`ExpectedError`](../api/Result/type-aliases/ExpectedError.mdx);
returns `None` for [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).

:::

```ts
const x = ok<number, string>(1);
const y = err<number, string>("failure");

expect(x.err()).toStrictEqual(none());
expect(y.err()).toStrictEqual(some("failure"));
```

### expect

[`expect(this: SettledResult<T, E>, msg?: string): T`](../api/Result/interfaces/Resultant.mdx#expect)

Retrieves the error if this result is an `Err`, or throws a [`ResultError`](../errors/result-error.md)
with an optional message if it’s an `Ok`.

:::note
Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
:::

:::danger
Throws [`ResultError`](../errors/result-error.md) if this result is an `Ok`.
:::

```ts
const x = ok<number, string>(42);
const y = err<number, string>("failure");

expect(() => x.expectErr("Failed!")).toThrow(ResultError);
expect(isCheckedError(y.expectErr("Failed!"))).toBe(true);
expect(y.expectErr("Failed!").expected).toBe("failure");
```

### expectErr

[`expectErr(this: SettledResult<T, E>, msg?: string): CheckedError<E>`](../api/Result/interfaces/Resultant.mdx#expecterr)

Retrieves the error if this result is an `Err`, or throws a [`ResultError`](../errors/result-error.md)
with an optional message if it’s an `Ok`.

:::note
Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
:::

:::danger
Throws [`ResultError`](../errors/result-error.md) if this result is an `Ok`
:::

```ts
const x = ok<number, string>(42);
const y = err<number, string>("failure");

expect(() => x.expectErr("Failed!")).toThrow(ResultError);
expect(isCheckedError(y.expectErr("Failed!"))).toBe(true);
expect(y.expectErr("Failed!").expected).toBe("failure");
```

### flatten

[`flatten<U, F>(this: Result<Result<U, F>, F>): Result<U, F>`](../api/Result/interfaces/Resultant.mdx#flatten)

Flattens a nested result (`Result<Result<T, E>, E>`) into a single result (`Result<T, E>`).

:::note
Only available on `Result`s that hold another `Result` with the error of same type `E`.
:::

```ts
const x: Result<Result<Result<number, string>, string>, string> = ok(ok(ok(6)));
const y: Result<Result<number, string>, string> = x.flatten();
const z: Result<Result<number, string>, string> = err("oops");

expect(x.flatten()).toStrictEqual(ok(ok(6)));
expect(y.flatten()).toStrictEqual(ok(6));
expect(z.flatten()).toStrictEqual(err("oops"));
```

### inspect

[`inspect(f: (x: T) => unknown): Result<T, E>`](../api/Result/interfaces/Resultant.mdx#inspect)

Calls `f` with the value if this result is `Ok`, then returns a [`copy`](#copy) of this result.

:::note

- Returns a new `Result` instance, not the original reference.
- If `f` throws or returns a `Promise` that rejects, the error is ignored.

:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");
let sideEffect = 0;

expect(x.inspect((n) => (sideEffect = n))).toStrictEqual(ok(2));
expect(x.inspect((_) => { throw new Error(); })).toStrictEqual(ok(2));
expect(sideEffect).toBe(2);
expect(y.inspect((n) => (sideEffect = n))).toStrictEqual(err("failure"));
expect(sideEffect).toBe(2); // Unchanged
```

### inspectErr

[`inspectErr(f: (x: CheckedError<E>) => unknown): Result<T, E>`](../api/Result/interfaces/Resultant.mdx#inspecterr)

Calls `f` with the error if this result is an `Err`, then returns a [`copy`](#copy) of this result.

:::note

- Returns a new `Result` instance, not the original reference.
- If `f` throws or returns a `Promise` that rejects, the error is ignored.

:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");
let sideEffect = 0;

expect(x.inspect((n) => (sideEffect = n))).toStrictEqual(ok(2));
expect(x.inspect((_) => { throw new Error(); })).toStrictEqual(ok(2));
expect(sideEffect).toBe(0); // unchanged
expect(y.inspect((n) => (sideEffect = n))).toStrictEqual(err("failure"));
expect(y.inspect((_) => { throw new Error(); })).toStrictEqual(err("failure"));
expect(sideEffect).toBe(2);
```

### isErr

[`isErr(): this is Err<T, E>`](../api/Result/interfaces/Resultant.mdx#iserr)

Checks if this result is an `Err`, narrowing its type to `Err` if true.

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.isErr()).toBe(false);
expect(y.isErr()).toBe(true);
```

### isErrAnd

[`isErrAnd(f: (x: CheckedError<E>) => boolean): this is Err<T, E> & boolean`](../api/Result/interfaces/Resultant.mdx#iserrand)

Returns `true` if the result is `Err` and `f` returns `true` for the contained error.

:::note
If `f` throws, `false` is returned.
:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.isErrAnd((e) => e.expected === "failure")).toBe(false);
expect(y.isErrAnd((e) => e.expected === "failure")).toBe(true);
expect(y.isErrAnd((e) => Boolean(e.unexpected))).toBe(false);
```

### isOk

[`isOk(): this is Ok<T, E>`](../api/Result/interfaces/Resultant.mdx#isok)

Checks if this result is an `Ok`, narrowing its type to `Ok` if true.

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.isOk()).toBe(true);
expect(y.isOk()).toBe(false);
```

### isOkAnd

[`isOkAnd(f: (x: T) => boolean): this is Ok<T, E> & boolean`](../api/Result/interfaces/Resultant.mdx#isokand)

Returns `true` if the result is `Ok` and `f` returns `true` for the contained value.

:::note
If `f` throws, `false` is returned.
:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.isOkAnd((n) => n > 0)).toBe(true);
expect(x.isOkAnd((n) => n < 0)).toBe(false);
expect(y.isOkAnd((_) => true)).toBe(false);
```

### iter

[`iter(): IterableIterator<T, T, void>`](../api/Result/interfaces/Resultant.mdx#iter)

Returns an iterator over this result’s value, yielding it if `Ok` or nothing if `Err`.

:::note

- Yields exactly one item for `Ok`, or zero items for `Err`.
- Compatible with `for...of` loops and spread operators.
- Ignores the error value in `Err` cases, focusing only on the success case.

:::

```ts
const x = ok<number, string>(42);
const y = err<number, string>("failure");

const iterX = x.iter();
expect(iterX.next()).toEqual({ value: 42, done: false });
expect(iterX.next()).toEqual({ done: true });

const iterY = y.iter();
expect(iterY.next()).toEqual({ done: true });

expect([...x.iter()]).toEqual([42]);
expect([...y.iter()]).toEqual([]);
```

### map

[`map<U>(f: (x: T) => Awaited<U>): Result<U, E>`](../api/Result/interfaces/Resultant.mdx#map)

Transforms this result by applying `f` to the value if it’s an `Ok`,
or preserves the `Err` unchanged.

:::note
If `f` throws, returns an `Err` with an
[`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx)
containing the original error.
:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.map((n) => n * 2)).toStrictEqual(ok(4));
expect(x.map(() => { throw new Error("boom"); }).unwrapErr().unexpected).toBeDefined();
expect(y.map((n) => n * 2)).toStrictEqual(err("failure"));
```

### mapAll

- [`mapAll<U, F>(f: (x: Result<T, E>) => Result<U, F>): Result<U, F>`](../api/Result/interfaces/Resultant.mdx#mapall)
- [`mapAll<U, F>(f: (x: Result<T, E>) => Promise<Result<U, F>>): PendingResult<Awaited<U>, Awaited<F>>`](../api/Result/interfaces/Resultant.mdx#mapall)

Maps this result by applying a callback `f` to its full state, executing the callback
for both `Ok` and `Err`, returning a new `Result` (or a [`PendingResult`](./pending-result.md),
if provided callback returns a `Promise`).

Unlike [`andThen`](#andthen), which only invokes the callback for `Ok`,
this method always calls `f`, passing the entire `Result` as its argument.

:::note
If `f` throws or returns a `Promise` that rejects, an `Err` (or a [`PendingResult`](./pending-result.md)
that resolves to an `Err`) with an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx) is returned.
:::

```ts
const okRes = ok<number, string>(42);
const errRes = err<number, string>("failure");

expect(okRes.mapAll((res) => ok(res.unwrapOr(0) + 1))).toStrictEqual(ok(43));
expect(errRes.mapAll((res) => ok(res.unwrapOr(0) + 1))).toStrictEqual(ok(1));
expect(okRes.mapAll((res) => (res.isOk() ? ok("success") : err("fail")))).toStrictEqual(ok("success"));
expect(errRes.mapAll(() => { throw new Error("boom"); }).unwrapErr().unexpected).toBeDefined();

const mappedOk = okRes.mapAll((res) => Promise.resolve(ok(res.unwrapOr(0) + 1)));
expect(await mappedOk).toStrictEqual(ok(43));

const mappedErr = errRes.mapAll((res) => Promise.resolve(ok(res.unwrapOr(0) + 1)));
expect(await mappedErr).toStrictEqual(ok(1));

const mappedCheck = okRes.mapAll((res) => Promise.resolve(res.isOk() ? ok("success") : err("fail")));
expect(await mappedCheck).toStrictEqual(ok("success"));

const mappedThrow = errRes.mapAll(() => Promise.reject(new Error("boom")));
expect((await mappedThrow).unwrapErr().unexpected).toBeDefined();
```

### mapErr

[`mapErr<F>(f: (e: E) => Awaited<F>): Result<T, F>`](../api/Result/interfaces/Resultant.mdx#maperr)

Transforms this result by applying `f` to the error if it’s an `Err` with
an expected error, or preserves the result unchanged.

:::note

- If `f` throws, returns an `Err` with an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx)
containing the original error.
- If this is an `Err` with an [`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx),
`f` is not called, and the original error is preserved.

:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.mapErr((e) => e.length)).toStrictEqual(ok(2));
expect(y.mapErr((e) => e.length)).toStrictEqual(err(7));
expect(y.mapErr(() => { throw new Error("boom"); }).unwrapErr().unexpected).toBeDefined();
```

### mapOr

[`mapOr<U>(this: SettledResult<T, E>, def: Awaited<U>, f: (x: T) => Awaited<U>): U`](../api/Result/interfaces/Resultant.mdx#mapor)

Returns `f` applied to the value if `Ok`, otherwise returns provided default.

:::note

- Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
- `f` has to return a synchronous (`Awaited`) value.
- If `f` throws, returns `def`.

:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.mapOr(0, (n) => n * 2)).toBe(4);
expect(x.mapOr(0, () => { throw new Error("boom"); })).toBe(0);
expect(y.mapOr(0, (n) => n * 2)).toBe(0);
```

### mapOrElse

[`mapOrElse<U>(this: SettledResult<T, E>, mkDef: () => Awaited<U>, f: (x: T) => Awaited<U>): U`](../api/Result/interfaces/Resultant.mdx#maporelse)

Returns `f` applied to the contained value if `Ok`, otherwise returns the result of `mkDef`.

:::note

- Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
- If `f` throws, the error is silently ignored, and the result of `mkDef` is returned.

:::

:::danger
If `mkDef` is called and throws an exception, [`ResultError`](../errors/result-error.md) is thrown
with the original error set as [`ResultError.reason`](../api/Result/classes/ResultError.mdx#properties).
:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.mapOrElse(() => 0, n => n * 2)).toBe(4);
expect(x.mapOrElse(() => 1, () => { throw new Error("boom") })).toBe(1);
expect(() => y.mapOrElse(() => { throw new Error("boom") }, n => n * 2)).toThrow(ResultError);
expect(y.mapOrElse(() => 0, n => n * 2)).toBe(0);
```

### match

[`match<U, F = U>(this: SettledResult<T, E>, f: (x: T) => Awaited<U>, g: (e: CheckedError<E>) => Awaited<F>): U | F`](../api/Result/interfaces/Resultant.mdx#match)

Matches this result, returning `f` applied to the value if `Ok`, or `g` applied
to the [`CheckedError`](../errors/checked-error.md) if `Err`.

:::note

- Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
- If `f` or `g` return a `Promise` that rejects, the caller is responsible for handling the rejection.

:::

:::danger
Throws [`ResultError`](../errors/result-error.md) if `f` or `g` throws an exception,
with the original  error set as [`ResultError.reason`](../api/Result/classes/ResultError.mdx#properties).
:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.match(n => n * 2, () => 0)).toBe(4);
expect(() => x.match(_ => { throw new Error() }, () => 0)).toThrow(ResultError);
expect(y.match(n => n * 2, e => e.expected?.length)).toBe(7);
expect(() => y.match(n => n * 2, () => { throw new Error() })).toThrow(ResultError);
```

### ok

[`ok(): Option<T>`](../api/Result/interfaces/Resultant.mdx#ok)

Converts this result to an `Option`, discarding the error if present.

Maps `Ok(_)` to `Some(_)` and `Err(_)` to `None`.

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.ok()).toStrictEqual(some(2));
expect(y.ok()).toStrictEqual(none());
```

### or

[`or<F>(x: Result<T, F>): Result<T, F>`](../api/Result/interfaces/Resultant.mdx#or)

Returns the current result if it is `Ok`, otherwise returns `x`.

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.or(ok(3))).toStrictEqual(ok(2));
expect(x.or(err("failure"))).toStrictEqual(ok(2));
expect(y.or(ok(3))).toStrictEqual(ok(3));
expect(y.or(err("another one"))).toStrictEqual(err("another one"));
```

### orElse

[`orElse<F>(f: () => Result<T, F>): Result<T, F>`](../api/Result/interfaces/Resultant.mdx#orelse)

Returns the current result if `Ok`, otherwise returns the result of `f`.

:::note
If `f` throws, returns an `Err` with an
[`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx)
containing the original error.
:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.orElse(() => ok(3))).toStrictEqual(ok(2));
expect(y.orElse(() => ok(3))).toStrictEqual(ok(3));
expect(y.orElse(() => { throw new Error("boom") }).unwrapErr().unexpected).toBeDefined();
expect(y.orElse(() => err("another one"))).toStrictEqual(err("another one"));
```

### tap

[`tap(f: (x: Result<T, E>) => unknown): Result<T, E>`](../api/Result/interfaces/Resultant.mdx#tap)

Executes `f` with a copy of this result, then returns a new copy unchanged.

Useful for side-effects like logging, works with both `Ok` and `Err`.

:::note

- If `f` throws or rejects, the error is silently ignored.
- If `f` returns a promise, the promise is not awaited before returning.

:::

```ts
const x = ok<number, string>(42);
const y = err<number, string>("failure");
let log = "";

expect(x.tap(res => (log = res.toString()))).toStrictEqual(ok(42));
expect(log).toBe("Ok { 42 }");
expect(y.tap(res => (log = res.toString()))).toStrictEqual(err("failure"));
expect(log).toBe("Err { 'failure' }");
```

### toPending

[`toPending(): PendingResult<Awaited<T>, Awaited<E>>`](../api/Result/interfaces/Resultant.mdx#topending)

Converts this result to a [`PendingResult`](./pending-result.md) using
a shallow [`copy`](#copy) of its current state.

:::note

- Useful for transposing a result with a `PromiseLike` value to
a [`PendingResult`](./pending-result.md) with an `Awaited` value.
- If inner `T` or `E` is a promise-like that rejects, maps to a
[`PendingResult`](./pending-result.md) that resolves to `Err` with
[`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).

:::

```ts
const value = { a: 1 };
const x = ok<{ a: number }, string>(value);
const pendingX = x.toPending();

expect(isPendingResult(pendingX)).toBe(true);
expect(await pendingX).toStrictEqual(ok({ a: 1 }));
value.a = 2;
expect(await pendingX).toStrictEqual(ok({ a: 2 }));
```

### toPendingCloned

[`toPendingCloned(this: Result<Cloneable<T>, Cloneable<E>>): PendingResult<Awaited<T>, Awaited<E>>`](../api/Result/interfaces/Resultant.mdx#topendingcloned)

Converts this result to a `PendingResult` using a deep [`clone`](#clone) of its current state.

:::note

- Useful for transposing a result with a `PromiseLike` value to
a [`PendingResult`](./pending-result.md) with an `Awaited` value,
preserving independence from the original data.
- If inner `T` or `E` is a promise-like that rejects, maps to a
[`PendingResult`](./pending-result.md) that resolves to `Err` with
[`UnexpectedError`](../api/Result/type-aliases/UnexpectedError.mdx).

:::

```ts
class CloneableClass implements Clone<CloneableClass> {
  constructor(public a: number) {}

  clone(this: Clone<CloneableClass>): CloneableClass;
  clone(this: CloneableClass): CloneableClass;
  clone(): CloneableClass {
    return new CloneableClass(this.a);
  }
}

const value = new CloneableClass(0);
const x = ok<CloneableClass, number>(value);
const y = err<CloneableClass, number>(1);
const pendingX = x.toPendingCloned();

expect(isPendingResult(pendingX)).toBe(true);
expect((await pendingX).unwrap().a).toBe(0);
value.a = 42;
expect((await pendingX).unwrap().a).toBe(0);
expect(await y.toPendingCloned()).toStrictEqual(err(1));
```

### toString

[`toString(): string`](../api/Result/interfaces/Resultant.mdx#tostring)

Generates a string representation of this result, reflecting its current state.

```ts
const x = ok<number, string>(2);
const y = err<number, string>("error");

expect(x.toString()).toBe("Ok { 2 }");
expect(y.toString()).toBe("Err { 'error' }");
```

### transpose

[`transpose<U, F>(this: Result<Option<U>, F>): Option<Result<U, F>>`](../api/Result/interfaces/Resultant.mdx#transpose)

Transposes a `Result` of an `Option` into an `Option` of a `Result`.

Maps `Ok(None)` to `None`, `Ok(Some(_))` to `Some(Ok(_))` and `Err(_)` to `Some(Err(_))`.

```ts
const x = ok<Option<number>, string>(none());
const y = ok<Option<number>, string>(some(2));
const z = err<Option<number>, string>("error");

expect(x.transpose()).toStrictEqual(none());
expect(y.transpose()).toStrictEqual(some(ok(2)));
expect(z.transpose()).toStrictEqual(some(err("error")));
```

### try

[`try(this: SettledResult<T, E>): this extends Ok<T, E> ? [true, undefined, T] : [false, CheckedError<E>, undefined]`](../api/Result/interfaces/Resultant.mdx#try)

Extracts this result’s state, returning a tuple with a success flag, error, and value.

Inspired by the [Try Operator](https://github.com/arthurfiorette/proposal-try-operator) proposal.

:::note

- Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
- Returns `[true, undefined, T]` if this is an `Ok`, or `[false, CheckedError<E>, undefined]` if this is an `Err`.
- Never throws, offering a safe way to inspect the result’s state with explicit success indication.

:::

```ts
const x = ok<number, string>(42);
const y = err<number, string>("failure");

expect(x.try()).toEqual([true, undefined, 42]);
expect(y.try()).toEqual([false, expect.objectContaining({ expected: "failure" }), undefined]);
```

### unwrap

[`unwrap(this: SettledResult<T, E>): T`](../api/Result/interfaces/Resultant.mdx#unwrap)

Retrieves the value if this result is an `Ok`, or throws a
[`ResultError`](../errors/result-error.md) if it’s an `Err`.

:::note
Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
:::

:::danger
Throws [`ResultError`](../errors/result-error.md) if this result is an `Err`.
:::

```ts
const x = ok<number, string>(42);
const y = err<number, string>("failure");

expect(x.unwrap()).toBe(42);
expect(() => y.unwrap()).toThrow(ResultError);
```

### unwrapErr

[`unwrapErr(this: SettledResult<T, E>): CheckedError<E>`](../api/Result/interfaces/Resultant.mdx#unwraperr)

Retrieves the [`CheckedError`](../errors/checked-error.md) if this result is an `Err`, or
throws a [`ResultError`](../api/Result/classes/ResultError.mdx) if it’s an `Ok`.

:::note
Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
:::

:::danger
Throws [`ResultError`](../errors/result-error.md) if this result is an `Ok`.
:::

```ts
const x = ok<number, string>(42);
const y = err<number, string>("failure");

expect(() => x.unwrapErr()).toThrow(ResultError);
expect(y.unwrapErr().expected).toBe("failure");
```

### unwrapOr

[`unwrapOr(this: SettledResult<T, E>, def: Awaited<T>): T`](../api/Result/interfaces/Resultant.mdx#unwrapor)

Returns the contained value if `Ok`, or `def` if `Err`.

:::note
Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.unwrapOr(0)).toBe(2);
expect(y.unwrapOr(0)).toBe(0);
```

### unwrapOrElse

[`unwrapOrElse(this: SettledResult<T, E>, mkDef: () => Awaited<T>): T`](../api/Result/interfaces/Resultant.mdx#unwraporelse)

Returns the contained value if `Ok`, or the result of `mkDef` if `Err`.

:::note
Only available on `Result`s that are [`Settled`](../api/Result/type-aliases/SettledResult.mdx).
:::

:::danger
Throws [`ResultError`](../errors/result-error.md) if `mkDef` throws, with the original error
set as [`ResultError.reason`](../api/Result/classes/ResultError.mdx#properties).
:::

```ts
const x = ok<number, string>(2);
const y = err<number, string>("failure");

expect(x.unwrapOrElse(() => 0)).toBe(2);
expect(y.unwrapOrElse(() => 0)).toBe(0);
expect(() => y.unwrapOrElse(() => { throw new Error("boom") })).toThrow(ResultError);
```
