---
title: Option
sidebar_label: Option
---

Type [`Option`](../api/Option/type-aliases/Option.mdx) represents an optional value:
every `Option` is either [`Some`](../api/Option/type-aliases/Some.mdx) and contains
a value, or [`None`](../api/Option/type-aliases/None.mdx), and does not. `Option`
types are very common, as they have a number of uses:

- Initial values
- Return value for otherwise reporting simple errors, where None is returned on error
- Optional object fields
- Optional function arguments
- Swapping things out of difficult situations

## Variants

- [`None`](../api/Option/type-aliases/None.mdx) - No value.
- [`Some<T>`](../api/Option/type-aliases/Some.mdx) - Some value of type `T`.

## Constructors

- [`none()`](../api/Option/functions/none.mdx) - creates `None` variant.
- [`some<T>(value: T)`](../api/Option/functions/some.mdx) - creates `Some<T>` variant.

## Methods

### and

[`and<U>(x: Option<U>): Option<U>`](../api/Option/interfaces/Optional.mdx#and)

Takes another `Option` and returns `None` if this options is `None`, otherwise
returns provided option.

```ts
const x = some(2);
const y = none<number>();

expect(x.and(some(3))).toStrictEqual(some(3));
expect(x.and(none())).toStrictEqual(none());
expect(y.and(some(3))).toStrictEqual(none());
expect(y.and(none())).toStrictEqual(none());
```

### andThen

[`andThen<U>(f: (x: T) => Option<U>): Option<U>`](../api/Option/interfaces/Optional.mdx#andthen)

Takes a predicate function `f` that is called with current `Option` if it's `Some`,
otherwise returns `None` without calling the predicate.

```ts

const x = some(2);
const y = none<number>();

expect(x.andThen(n => some(n * 2))).toStrictEqual(some(4));
expect(x.andThen(_ => { throw new Error() })).toStrictEqual(none());
expect(x.andThen(_ => none())).toStrictEqual(none());
expect(y.andThen(n => some(n * 2))).toStrictEqual(none());
```

### clone

[`clone<U>(this: Option<Cloneable<U>>): Option<U>`](../api/Option/interfaces/Optional.mdx#clone)

Returns a clone of the `Option`.

:::note
Only available on `Option`s with [`Cloneable`](../api/Types/type-aliases/Cloneable.mdx) values.
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
const x = some(1);
const y = some(cloneable);

expect(x.clone()).toStrictEqual(some(1));
expect(x.clone()).not.toBe(x); // Different reference
expect(x.clone().unwrap()).toBe(1);
expect(y.clone()).toStrictEqual(cloneable);
expect(y.clone()).not.toBe(cloneable);
```

### copy

[`copy(): Option<T>`](../api/Option/interfaces/Optional.mdx#copy)

Returns a **shallow** copy of the `Option`.

```ts
const value = { a: 1 };
const x = some(value);
const y = none<{ a: number }>();

expect(x.copy()).toStrictEqual(some({ a: 1 }));
expect(x.copy()).not.toBe(x); // Different option reference
expect(x.copy().unwrap()).toBe(value); // Same value reference
expect(y.copy()).toStrictEqual(none());
```

### expect

[`expect(this: SettledOption<T>, msg?: string): T`](../api/Option/interfaces/Optional.mdx#expect)

Returns the value if `Some`, or throws an [`OptionError`](../errors/option-error.md)
with `msg` (or a default message) if `None`.

:::note
Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
:::

:::danger
This method throws if called on `Option` that is `None`.
:::

```ts
const x = some(42);
const y = none<number>();

expect(x.expect("Missing value")).toBe(42);
expect(() => y.expect("Missing value")).toThrow("Missing value");
expect(() => y.expect()).toThrow("`expect`: called on `None`");
```

### filter

[`filter(f: (x: T) => boolean): Option<T>`](../api/Option/interfaces/Optional.mdx#filter)

Returns the option if `Some` and `f` returns `true`, otherwise returns `None`.

:::info
If `f` throws, `None` is returned.
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.filter((n) => n > 0)).toStrictEqual(some(2));
expect(x.filter((n) => n < 0)).toStrictEqual(none());
expect(x.filter((_) => { throw new Error(); })).toStrictEqual(none());
expect(y.filter((n) => n > 0)).toStrictEqual(none());
```

### flatten

[`flatten<U>(this: Option<Option<U>>): Option<U>`](../api/Option/interfaces/Optional.mdx#flatten)

Flattens an `Option` of an `Option` into a single `Option`.

:::note
Only available on `Option`s that hold another `Option`.
:::

```ts
const x: Option<Option<Option<number>>> = some(some(some(6)));
const y: Option<Option<number>> = x.flatten();
const z = none<Option<Option<number>>>();

expect(x.flatten()).toStrictEqual(some(some(6)));
expect(y.flatten()).toStrictEqual(some(6));
expect(z.flatten()).toStrictEqual(none());
```

### getOrInsert

[`getOrInsert(this: SettledOption<T>, x: T): T`](../api/Option/interfaces/Optional.mdx#getorinsert)

Returns the contained value if `Some`, or inserts and returns `x` if `None`.

See also [`insert`](#insert) method, which updates the value even if the option
already contains `Some`.

:::note

- Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
- This method mutates the `Option`.

:::

```ts
const x = some(2);
const y = none<number>();

expect(x.getOrInsert(5)).toBe(2);
expect(y.getOrInsert(5)).toBe(5);
expect(y).toStrictEqual(some(5)); // y is mutated
```

### getOrInsertWith

[`getOrInsertWith(this: SettledOption<T>, f: () => T): T`](../api/Option/interfaces/Optional.mdx#getorinsertwith)

Returns the value if `Some`, or inserts and returns the result of `f` if `None`.

:::note

- Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
- Mutates this option to `Some` with `f`’s result if `None`.  If `f` throws, the option remains unchanged.

:::

:::danger
Throws [`OptionError`](../errors/option-error.md) if `f` throws.
:::

```ts
const x = some(2);
const y = none<number>();
const z = none<number>();

expect(x.getOrInsertWith(() => 5)).toBe(2);
expect(y.getOrInsertWith(() => 5)).toBe(5);
expect(y).toStrictEqual(some(5)); // Mutated
expect(() => z.getOrInsertWith(() => { throw new Error(); }))
  .toThrow("`getOrInsertWith`: callback `f` threw an exception");
expect(z).toStrictEqual(none()); // Unchanged
```

### insert

[`insert(this: SettledOption<T>, x: T): T`](../api/Option/interfaces/Optional.mdx#insert)

Inserts `x` into the option and returns it, overwriting any existing value.

See also [`getOrInsert`](#getorinsert) method, which doesn’t update the value if
the option already contains `Some`.

:::note

- Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
- This method mutates the `Option`.

:::

```ts
const x = some(2);
const y = none<number>();

expect(x.insert(5)).toBe(5);
expect(x).toStrictEqual(some(5));
expect(y.insert(5)).toBe(5);
expect(y).toStrictEqual(some(5));
```

### inspect

[`inspect(f: (x: T) => unknown): Option<T>`](../api/Option/interfaces/Optional.mdx#inspect)

Calls `f` with the value if `Some`, then returns a [copy](#copy) of this option.

:::note

- Returns a new `Option` instance, not the original reference.
- If `f` throws or returns a `Promise` that rejects, the error is ignored.

:::

```ts
const x = some(2);
const y = none<number>();
let sideEffect = 0;

expect(x.inspect((n) => (sideEffect = n))).toStrictEqual(some(2));
expect(x.inspect((_) => { throw new Error(); })).toStrictEqual(some(2));
expect(sideEffect).toBe(2);
expect(y.inspect((n) => (sideEffect = n))).toStrictEqual(none());
expect(sideEffect).toBe(2); // Unchanged
```

### isNone

[`isNone(): this is None<T>`](../api/Option/interfaces/Optional.mdx#isnone)

Returns `true` if the option is `None`.

```ts
const x = some(2);
const y = none<number>();

expect(x.isNone()).toBe(false);
expect(y.isNone()).toBe(true);
```

### isNoneOr

[`isNoneOr(f: (x: T) => boolean): boolean`](../api/Option/interfaces/Optional.mdx#isnoneor)

Returns `true` if the option is `None` or if `f` returns `true` for the contained value.

:::note
If `f` throws, `false` is returned.
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.isNoneOr((n) => n > 0)).toBe(true);
expect(x.isNoneOr((_) => { throw new Error(); })).toBe(false);
expect(x.isNoneOr((n) => n < 0)).toBe(false);
expect(y.isNoneOr((n) => n > 0)).toBe(true);
```

### isSome

[`isSome(): this is Some<T>`](../api/Option/interfaces/Optional.mdx#issome)

Returns `true` if the option is `Some`.

```ts
const x = some(2);
const y = none<number>();

expect(x.isSome()).toBe(true);
expect(y.isSome()).toBe(false);
```

### isSomeAnd

[`isSomeAnd(f: (x: T) => boolean): this is Some<T> & boolean`](../api/Option/interfaces/Optional.mdx#issomeand)

Returns `true` if the option is `Some` **and** `f` returns `true` for the contained value.

:::note
If `f` throws, `false` is returned.
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.isSomeAnd((n) => n > 0)).toBe(true);
expect(x.isSomeAnd((_) => { throw new Error(); })).toBe(false);
expect(x.isSomeAnd((n) => n < 0)).toBe(false);
expect(y.isSomeAnd((n) => n > 0)).toBe(false);
```

### iter

[`iter(): IterableIterator<T, T, void>`](../api/Option/interfaces/Optional.mdx#iter)

Returns an iterator over this option’s value, yielding it if `Some` or nothing if `None`.

:::note

- Yields exactly one item for `Some`, or zero items for `None`.
- Compatible with `for...of` loops and spread operators.

:::

```ts
const x = some(42);
const y = none<number>();

const iterX = x.iter();
expect(iterX.next()).toEqual({ value: 42, done: false });
expect(iterX.next()).toEqual({ done: true });

const iterY = y.iter();
expect(iterY.next()).toEqual({ done: true });

expect([...x.iter()]).toEqual([42]);
expect([...y.iter()]).toEqual([]);
```

### map

[`map<U>(f: (x: T) => Awaited<U>): Option<U>`](../api/Option/interfaces/Optional.mdx#map)

Maps the contained value with `f` if `Some`, returning a new `Option`;
otherwise, returns `None`.

:::note
If `f` throws, `None` is returned.
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.map((n) => n * 2)).toStrictEqual(some(4));
expect(x.map((_) => { throw new Error(); })).toStrictEqual(none());
expect(y.map((n) => n * 2)).toStrictEqual(none());
```

### mapAll

- [`mapAll<U>(f: (x: Option<T>) => Option<U>): Option<U>`](../api/Option/interfaces/Optional.mdx#mapall)
- [`mapAll<U>(f: (x: Option<T>) => Promise<Option<U>>): PendingOption<Awaited<U>>`](../api/Option/interfaces/Optional.mdx#mapall)

Maps this option by applying a callback to its full state, executing the callback for both `Some`
and `None`, returning a new `Option` or a [`PendingOption`](./pending-option.md), depending on
what kind of predicate function was provided (see method overloads for more details).

Unlike [`andThen`](#andthen), which only invokes the callback for `Some`, this method always
calls `f`, passing the entire `Option` as its argument.

:::note
If `f` throws or returns a `Promise` that rejects, the error is silently ignored and `None`
(or a [`PendingOption`](./pending-option.md) resolves to `None`) is returned.
:::

```ts
const someOpt = some(42);
const noneOpt = none<number>();
const undefOpt = some(undefined);

expect(someOpt.mapAll((opt) => some(opt.unwrapOr(0) + 1))).toStrictEqual(some(43));
expect(noneOpt.mapAll((opt) => some(opt.unwrapOr(0) + 1))).toStrictEqual(some(1));
expect(undefOpt.mapAll((opt) => some(opt.isSome() ? "some" : "none"))).toStrictEqual(some("some"));

const mappedSome = someOpt.mapAll((opt) => Promise.resolve(some(opt.unwrapOr(0))));
expect(isPendingOption(mappedSome)).toBe(true);
expect(await mappedSome).toStrictEqual(some(42));

const mappedNone = noneOpt.mapAll((opt) => Promise.resolve(some(opt.unwrapOr(0) + 1)));
expect(isPendingOption(mappedNone)).toBe(true);
expect(await mappedNone).toStrictEqual(some(1));
```

### mapOr

[`mapOr<U>(this: SettledOption<T>, def: Awaited<U>, f: (x: T) => Awaited<U>): U`](../api/Option/interfaces/Optional.mdx#mapor)

Returns `f` applied to the value if `Some`, otherwise returns `def`.

:::note

- Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
- `f` has to return a synchronous (`Awaited`) value.
- If `f` throws, returns `def`.

:::

```ts
const x = some(2);
const y = none<number>();

expect(x.mapOr(0, (n) => n * 2)).toBe(4);
expect(x.mapOr(0, (_) => { throw new Error(); })).toBe(0);
expect(y.mapOr(0, (n) => n * 2)).toBe(0);
```

### mapOrElse

[`mapOrElse<U>(this: SettledOption<T>, mkDef: () => Awaited<U>, f: (x: T) => Awaited<U>): U`](../api/Option/interfaces/Optional.mdx#maporelse)

Returns `f` applied to the contained value if `Some`, otherwise returns the result of `mkDef`.

:::note

- Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
- If `f` throws, the error is silently ignored and result of `mkDef` is returned.

:::

:::danger
Throws [`OptionError`](../errors/option-error.md) if `mkDef` is called and throws an exception.
Original error will be set as [`OptionError.reason`](../api/Option/classes/OptionError.mdx#properties).
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.mapOrElse(() => 0, n => n * 2)).toBe(4);
expect(x.mapOrElse(() => 1, _ => { throw new Error() })).toBe(1);
expect(() => x.mapOrElse(() => { throw new Error() }, _ => { throw new Error() })).toThrow(OptionError);
expect(y.mapOrElse(() => 0, n => n * 2)).toBe(0);
```

### match

[`match<U, F = U>(this: SettledOption<T>, f: (x: T) => Awaited<U>, g: () => Awaited<F>): U | F`](../api/Option/interfaces/Optional.mdx#match)

Matches the option, returning `f` applied to the value if `Some`, or `g` if `None`.

:::note

- Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
- If `f` or `g` returns a `Promise` that rejects, the caller is responsible for handling the rejection.

:::

:::danger
Throws [`OptionError`](../errors/option-error.md) if `f` or `g` throws an exception.
Original error will be  set as [`OptionError.reason`](../api/Option/classes/OptionError.mdx#properties).
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.match(n => n * 2, () => 0)).toBe(4);
expect(() => x.match(_ => { throw new Error() }, () => 0)).toThrow(OptionError);
expect(y.match(n => n * 2, () => 0)).toBe(0);
expect(() => y.match(n => n * 2, () => { throw new Error() })).toThrow(OptionError);
```

### okOr

[`okOr<E>(y: Awaited<E>): Result<T, E>`](../api/Option/interfaces/Optional.mdx#okor)

Converts to a [`Result`](../resultant/result.md), using `y` as the error value if
this option is `None`. `Some(v)` is mapped to `Ok(v)` and `None` to `Err(y)`.

```ts
const x = some(2);
const y = none<number>();

expect(x.okOr("error")).toStrictEqual(ok(2));
expect(y.okOr("error")).toStrictEqual(err("error"));
```

### okOrElse

[`okOrElse<E>(mkErr: () => Awaited<E>): Result<T, E>`](../api/Option/interfaces/Optional.mdx#okorelse)

Converts to a `Result`, using the result of `mkErr` as the error value if `None`.
`Some(v)` is mapped to `Ok(v)` and `None` to `Err(mkErr())`.

```ts
const x = some(2);
const y = none<number>();

expect(x.okOrElse(() => "error")).toStrictEqual(ok(2));
expect(y.okOrElse(() => "error")).toStrictEqual(err("error"));
```

### or

[`or(x: Option<T>): Option<T>`](../api/Option/interfaces/Optional.mdx#or)

Returns the current option if it is `Some`, otherwise returns `x`.

```ts
const x = some(2);
const y = none<number>();

expect(x.or(some(3))).toStrictEqual(some(2));
expect(x.or(none())).toStrictEqual(some(2));
expect(y.or(some(3))).toStrictEqual(some(3));
expect(y.or(none())).toStrictEqual(none());
```

### orElse

[`orElse(f: () => Option<T>): Option<T>`](../api/Option/interfaces/Optional.mdx#orelse)

Returns the current option if `Some`, otherwise returns the result of `f`.

:::note
If `f` throws, `None` is returned.
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.orElse(() => some(3))).toStrictEqual(some(2));
expect(y.orElse(() => some(3))).toStrictEqual(some(3));
expect(y.orElse(() => { throw new Error(); })).toStrictEqual(none());
expect(y.orElse(() => none())).toStrictEqual(none());
```

### replace

[`replace(x: T): Option<T>`](../api/Option/interfaces/Optional.mdx#replace)

Replaces the current value with `x` and returns the old `Option`.

:::note
This method mutates the `Option`.
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.replace(5)).toStrictEqual(some(2));
expect(x).toStrictEqual(some(5));
expect(y.replace(5)).toStrictEqual(none());
expect(y).toStrictEqual(some(5)); // y is mutated
```

### take

[`take(): Option<T>`](../api/Option/interfaces/Optional.mdx#take)

Takes the value out of the `Option`, leaving `None` in its place.

:::note
This method mutates the `Option`.
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.take()).toStrictEqual(some(2));
expect(x).toStrictEqual(none());
expect(y.take()).toStrictEqual(none());
expect(y).toStrictEqual(none());
```

### takeIf

[`takeIf(f: (x: T) => boolean): Option<T>`](../api/Option/interfaces/Optional.mdx#takeif)

Takes the value out of the `Option`, but only if `f` returns `true`.
Similar to [`take`](#take), but conditional.

:::note

- This method mutates the `Option`.
- If `f` throws, `None` is returned and the original value **remains unchanged**.

:::

```ts
const x = some(2);
const y = none<number>();
const z = some(1);

expect(x.takeIf((n) => n > 0)).toStrictEqual(some(2));
expect(x).toStrictEqual(none());
expect(x.takeIf((n) => n < 0)).toStrictEqual(none());
expect(y.takeIf((n) => n > 0)).toStrictEqual(none());
expect(z.takeIf((_) => { throw new Error(); })).toStrictEqual(none());
expect(z).toStrictEqual(some(1));
```

### tap

[`tap(f: (x: Option<T>) => unknown): Option<T>`](../api/Option/interfaces/Optional.mdx#tap)

Executes `f` with a copy of this `Option`, then returns a new copy unchanged.

Useful for side-effects like logging, works with both `Some` and `None`.

:::note

- If `f` throws or rejects, the error is ignored.
- If `f` returns a promise, the promise is not awaited before returning.

:::

```ts
const x = some(42);
const y = none<number>();
let log = "";

expect(x.tap((opt) => (log = opt.toString()))).toStrictEqual(some(42));
expect(log).toBe("Some { 42 }");
expect(y.tap((opt) => (log = opt.toString()))).toStrictEqual(none());
expect(log).toBe("None");
```

### toPending

[`toPending(): PendingOption<Awaited<T>>`](../api/Option/interfaces/Optional.mdx#topending)

Maps the option to a [`PendingOption`](./pending-option.md) by supplying a shallow
[`copy`](#copy) of the option to a [`PendingOption`](./pending-option.md) factory.

Useful for transposing an option with `PromiseLike` value to a
[`PendingOption`](./pending-option.md) with `Awaited` value.

:::note
If inner `T` is a promise-like that rejects, maps to a `PendingOption` with `None`.
:::

```ts
const value = { a: 1 };
const x = some(value);
const y = none<number>();
const pendingX = x.toPending();

expect(isPendingOption(pendingX)).toBe(true);
expect(await pendingX).toStrictEqual(some({ a: 1 }));
value.a = 2;
expect(await pendingX).toStrictEqual(some({ a: 2 }));
expect(await y.toPending()).toStrictEqual(none());
```

### toPendingCloned

[`toPendingCloned(this: Option<Cloneable<T>>): PendingOption<Awaited<T>>`](../api/Option/interfaces/Optional.mdx#topendingcloned)

Maps this option to a [`PendingOption`](./pending-option.md) by supplying
a [`clone`](#clone) of the option to [`PendingOption`](./pending-option.md) factory.

Useful for transposing an option with `PromiseLike` value to a
[`PendingOption`](./pending-option.md) with `Awaited` value.

:::note
If inner `T` is a promise-like that rejects, maps to a `PendingOption` with `None`.
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
const x = some(value);
const y = none<number>();
const pendingX = x.toPendingCloned();

expect(isPendingOption(pendingX)).toBe(true);
expect((await pendingX).unwrap().a).toBe(0);
value.a = 42;
expect((await pendingX).unwrap().a).toBe(0);
expect(await y.toPendingCloned()).toStrictEqual(none());
```

### toString

[`toString(): string`](../api/Option/interfaces/Optional.mdx#tostring)

Returns a string representation of the `Option`.

```ts
const x = some(2);
const y = none<number>();

expect(x.toString()).toBe("Some { 2 }");
expect(y.toString()).toBe("None");
```

### transpose

[`transpose<U, E>(this: Option<Result<U, E>>): Result<Option<U>, E>`](../api/Option/interfaces/Optional.mdx#transpose)

Transposes an `Option` of a `Result` into a `Result` of an `Option`.

Maps `None` to `Ok(None)`, `Some(Ok(_))` to `Ok(Some(_))`, and `Some(Err(_))` to `Err(_)`.

:::note
Only available on `Option`s that hold a [`Result`](../resultant/result.md) value.
:::

```ts
const x = none<Result<number, string>>();
const y = some<Result<number, string>>(ok(2));
const z = some<Result<number, string>>(err("error"));

expect(x.transpose()).toStrictEqual(ok(none()));
expect(y.transpose()).toStrictEqual(ok(some(2)));
expect(z.transpose()).toStrictEqual(err("error"));
```

### unwrap

[`unwrap(this: SettledOption<T>): T`](../api/Option/interfaces/Optional.mdx#unwrap)

Returns the value if `Some`, or throws an [`OptionError`](../errors/option-error.md) if `None`.

:::note
Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
:::

:::danger
Throws [`OptionError`](../errors/option-error.md) if this is `None`
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.unwrap()).toBe(2);
expect(() => y.unwrap()).toThrow("`unwrap`: called on `None`");
```

### unwrapOr

[`unwrapOr(this: SettledOption<T>, def: Awaited<T>): T`](../api/Option/interfaces/Optional.mdx#unwrapor)

Returns the contained value if `Some`, or `def` if `None`.

:::note
Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.unwrapOr(0)).toBe(2);
expect(y.unwrapOr(0)).toBe(0);
```

### unwrapOrElse

[`unwrapOrElse(this: SettledOption<T>, mkDef: () => Awaited<T>): T`](../api/Option/interfaces/Optional.mdx#unwraporelse)

Returns the contained value if `Some`, or the result of `mkDef` if `None`.

:::note
Only available on `Option`s that are [`Settled`](../api/Option/type-aliases/SettledOption.mdx).
:::

:::danger
Throws [`OptionError`](../errors/option-error.md) if `mkDef` throws. Original error will be set as
[`OptionError.reason`](../api/Option/classes/OptionError.mdx#properties).
:::

```ts
const x = some(2);
const y = none<number>();

expect(x.unwrapOrElse(() => 0)).toBe(2);
expect(y.unwrapOrElse(() => 0)).toBe(0);
expect(() => y.unwrapOrElse(() => { throw new Error(); })).toThrow(OptionError);
```

### xor

- [`xor(y: Option<T>): Option<T>`](../api/Option/interfaces/Optional.mdx#xor)
- [`xor(y: Promise<Option<T>>): PendingOption<Awaited<T>>`](../api/Option/interfaces/Optional.mdx#xor)

Returns `Some` (or [`PendingOption`](./pending-option.md) with `Some`, when `y` is a promise)
if exactly one of `this` or `y` is `Some`, otherwise returns `None`.

```ts
const x = some(2);
const y = none<number>();

expect(x.xor(some(3))).toStrictEqual(none());
expect(x.xor(none())).toStrictEqual(some(2));
expect(y.xor(some(3))).toStrictEqual(some(3));
expect(y.xor(none())).toStrictEqual(none());

expect(isPendingOption(x.xor(Promise.resolve(some(3))))).toBe(true);
expect(await x.xor(Promise.resolve(some(3)))).toStrictEqual(none());
expect(await x.xor(Promise.resolve(none()))).toStrictEqual(some(2));
expect(await y.xor(Promise.resolve(some(3)))).toStrictEqual(some(3));
```
