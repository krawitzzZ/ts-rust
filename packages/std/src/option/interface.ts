/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Cloneable, Recoverable } from "../types";
import type { Result, Ok, Err, PendingResult } from "../result";
import type { OptionError } from "./error";
import type { SomeAwaitedValues, SomeValues } from "./types";
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Represents an {@link Option} containing a value of type `T`.
 */
export type Some<T> = Optional<T> & { [phantom]: "some"; readonly value: T };

/**
 * Represents an empty {@link Option} with no value.
 *
 * Unlike {@link Some}, it does not provide a `value` property.
 */
export type None<T> = Optional<T> & { [phantom]: "none" };

/**
 * A type that represents either a value ({@link Some | Some\<T>}) or
 * no value ({@link None | None\<T>}).
 *
 * Inspired by Rust's {@link https://doc.rust-lang.org/std/option/enum.Option.html | Option},
 * it is used to handle values that may or may not be present, avoiding null or undefined
 * checks. This is a union of {@link Some} and {@link None} variants.
 */
export type Option<T> = Some<T> | None<T>;

/**
 * A synchronous {@link Option} where the contained value `T` is guaranteed to be
 * non-`PromiseLike`, ensuring immediate availability without awaiting.
 *
 * This restricted {@link Option} variant enforces synchronous values for methods
 * like {@link Optional.insert | insert}, {@link Optional.getOrInsert | getOrInsert},
 * and {@link Optional.getOrInsertWith | getOrInsertWith}, which mutate the option.
 * Use it when you need a type-safe, synchronous option.
 */
export type SettledOption<T> = Option<Awaited<T>>;

/**
 * Interface defining the core functionality of an {@link Option}, inspired by Rust's
 * {@link https://doc.rust-lang.org/std/option/enum.Option.html | Option} type, with
 * additional methods tailored for TypeScript.
 *
 * Represents a value that may or may not be present, offering a robust alternative to
 * `null` or `undefined`. It includes most Rust `Option` methods (e.g., `map`, `andThen`,
 * `unwrap`) for safe value handling, plus TypeScript-specific extensions like
 * {@link toPending} and async variants of {@link and} with `Promise` support.
 *
 * For methods accepting predicates (e.g., {@link orElse}, {@link filter}, {@link map},
 * {@link andThen}), exceptions in the provided function result in {@link None}, ensuring
 * predictable, type-safe behavior. If error handling is a concern, use {@link okOr} or
 * {@link okOrElse} to convert to a {@link Result}.
 *
 * Implementations like {@link Some} and {@link None} enable pattern matching,
 * transformations, and error handling in a type-safe way.
 */
export interface Optional<T> {
  /**
   * Returns {@link None} if this option is {@link None}, otherwise returns `x`.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.and(some(3))).toStrictEqual(some(3));
   * expect(x.and(none())).toStrictEqual(none());
   * expect(y.and(some(3))).toStrictEqual(none());
   * expect(y.and(none())).toStrictEqual(none());
   * ```
   */
  and<U>(x: Option<U>): Option<U>;

  /**
   * Applies `f` to the value if {@link Some}, returning its result; otherwise,
   * returns {@link None}. Also known as `flatMap`.
   *
   * @notes
   * - *Default*: If `f` throws, returns {@link None}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.andThen(n => some(n * 2))).toStrictEqual(some(4));
   * expect(x.andThen(_ => { throw new Error() })).toStrictEqual(none());
   * expect(x.andThen(_ => none())).toStrictEqual(none());
   * expect(y.andThen(n => some(n * 2))).toStrictEqual(none());
   * ```
   */
  andThen<U>(f: (x: T) => Option<U>): Option<U>;

  /**
   * Returns a clone of the {@link Option}.
   *
   * Only available on {@link Option}s with {@link Cloneable} values.
   *
   * @example
   * ```ts
   * const x = some(1);
   * const y = some({ a: 1, clone: () => ({ a: 1 }) });
   *
   * expect(x.clone()).toStrictEqual(some(1));
   * expect(x.clone()).not.toBe(x); // Different reference
   * expect(x.clone().unwrap()).toBe(1);
   * expect(y.clone()).toStrictEqual(some({ a: 1 }));
   * ```
   */
  clone<U>(this: Option<Cloneable<U>>): Option<U>;

  /**
   * Combines this {@link Option} with other `Option` instances into a single
   * `Option` * containing a tuple of values.
   *
   * The `combine` method takes an arbitrary number of `Option` instances,
   * all sharing the same error-free structure. If all `Option` instances
   * (including this one) are `Some`, it returns an `Option` with a tuple of
   * their values in the order provided. If any `Option` is `None`, it returns
   * `None`. The resulting tuple includes the value of this `Option` as the first
   * element, followed by the values from the provided `Option` instances.
   *
   * @example
   * ```ts
   * const a = some(Promise.resolve(1));
   * const b = some("hi");
   * const c = none<Date>();
   * const d = a.combine(b, c); // Option<[Promise<number>, string, Date]>
   * ```
   */
  combine<U extends Option<unknown>[]>(
    ...opts: U
  ): Option<[T, ...SomeValues<U>]>;

  /**
   * Returns a **shallow** copy of the {@link Option}.
   *
   * @example
   * ```ts
   * const value = { a: 1 };
   * const x = some(value);
   * const y = none<{ a: number }>();
   *
   * expect(x.copy()).toStrictEqual(some({ a: 1 }));
   * expect(x.copy()).not.toBe(x); // Different option reference
   * expect(x.copy().unwrap()).toBe(value); // Same value reference
   * expect(y.copy()).toStrictEqual(none());
   * ```
   */
  copy(): Option<T>;

  /**
   * Returns the value if {@link Some}, or throws an {@link OptionError} with `msg`
   * (or a default message) if {@link None}.
   *
   * @throws
   * - {@link OptionError} if this is {@link None}
   *
   * @example
   * ```ts
   * const x = some(42);
   * const y = none<number>();
   *
   * expect(x.expect("Missing value")).toBe(42);
   * expect(() => y.expect("Missing value")).toThrow("Missing value");
   * expect(() => y.expect()).toThrow("`expect`: called on `None`");
   * ```
   */
  expect(this: SettledOption<T>, msg?: string): T;

  /**
   * Returns the option if {@link Some} and `f` returns `true`, otherwise
   * returns {@link None}.
   *
   * @notes
   * - *Default*: If `f` throws, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.filter(n => n > 0)).toStrictEqual(some(2));
   * expect(x.filter(n => n < 0)).toStrictEqual(none());
   * expect(x.filter(_ => { throw new Error() })).toStrictEqual(none());
   * expect(y.filter(n => n > 0)).toStrictEqual(none());
   * ```
   */
  filter(f: (x: T) => boolean): Option<T>;

  /**
   * Flattens an {@link Option} of an {@link Option} into a single {@link Option}.
   *
   * @example
   * ```ts
   * const x: Option<Option<Option<number>>> = some(some(some(6)));
   * const y: Option<Option<number>> = x.flatten();
   * const z = none<Option<Option<number>>>();
   *
   * expect(x.flatten()).toStrictEqual(some(some(6)));
   * expect(y.flatten()).toStrictEqual(some(6));
   * expect(z.flatten()).toStrictEqual(none());
   * ```
   */
  flatten<U>(this: Option<Option<U>>): Option<U>;

  /**
   * Returns the contained value if {@link Some}, or inserts and returns `x`
   * if {@link None}.
   *
   * See also {@link insert} method, which updates the value even if the option
   * already contains {@link Some}.
   *
   * @notes
   * - *Mutation*: This method mutates the {@link Option}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.getOrInsert(5)).toBe(2);
   * expect(y.getOrInsert(5)).toBe(5);
   * expect(y).toStrictEqual(some(5)); // y is mutated
   * ```
   */
  getOrInsert(this: SettledOption<T>, x: T): T;

  /**
   * Returns the value if {@link Some}, or inserts and returns the result of `f`
   * if {@link None}.
   *
   * @throws
   * - {@link OptionError} if `f` throws, with the original error as
   *   {@link OptionError.reason}
   *
   * @notes
   * - *Mutation*: Mutates this option to {@link Some} with `f`’s result if {@link None}.
   *   If `f` throws, the option remains unchanged.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   * const z = none<number>();
   *
   * expect(x.getOrInsertWith(() => 5)).toBe(2);
   * expect(y.getOrInsertWith(() => 5)).toBe(5);
   * expect(y).toStrictEqual(some(5)); // Mutated
   * expect(() => z.getOrInsertWith(() => { throw new Error() })).toThrow(OptionError);
   * expect(z).toStrictEqual(none()); // Unchanged
   * ```
   */
  getOrInsertWith(this: SettledOption<T>, f: () => T): T;

  /**
   * Inserts `x` into the option and returns it, overwriting any existing value.
   *
   * See also {@link getOrInsert} method, which doesn’t update the value if the
   * option already contains {@link Some}.
   *
   * @notes
   * - *Mutation*: This method mutates the {@link Option}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.insert(5)).toBe(5);
   * expect(x).toStrictEqual(some(5));
   * expect(y.insert(5)).toBe(5);
   * expect(y).toStrictEqual(some(5));
   * ```
   */
  insert(this: SettledOption<T>, x: T): T;

  /**
   * Calls `f` with the value if {@link Some}, then returns a copy of this option.
   *
   * If `f` throws or returns a `Promise` that rejects, the error is ignored.
   *
   * @notes
   * - Returns a new {@link Option} instance, not the original reference.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   * let sideEffect = 0;
   *
   * expect(x.inspect(n => (sideEffect = n))).toStrictEqual(some(2));
   * expect(x.inspect(_ => { throw new Error() })).toStrictEqual(some(2));
   * expect(sideEffect).toBe(2);
   * expect(y.inspect(n => (sideEffect = n))).toStrictEqual(none());
   * expect(sideEffect).toBe(2); // Unchanged
   * ```
   */
  inspect(f: (x: T) => unknown): Option<T>;

  /**
   * Returns `true` if the option is {@link None}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.isNone()).toBe(false);
   * expect(y.isNone()).toBe(true);
   * ```
   */
  isNone(): this is None<T>;

  /**
   * Returns `true` if the option is {@link None} or if `f` returns `true` for the contained value.
   *
   * @notes
   * - *Default*: If `f` throws, `false` is returned.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.isNoneOr(n => n > 0)).toBe(true);
   * expect(x.isNoneOr(_ => { throw new Error() })).toBe(false);
   * expect(x.isNoneOr(n => n < 0)).toBe(false);
   * expect(y.isNoneOr(n => n > 0)).toBe(true);
   * ```
   */
  isNoneOr(f: (x: T) => boolean): boolean;

  /**
   * Returns `true` if the option is {@link Some}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.isSome()).toBe(true);
   * expect(y.isSome()).toBe(false);
   * ```
   */
  isSome(): this is Some<T>;

  /**
   * Returns `true` if the option is {@link Some} and `f` returns `true`
   * for the contained value.
   *
   * @notes
   * - *Default*: If `f` throws, `false` is returned.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.isSomeAnd(n => n > 0)).toBe(true);
   * expect(x.isSomeAnd(_ => { throw new Error() })).toBe(false);
   * expect(x.isSomeAnd(n => n < 0)).toBe(false);
   * expect(y.isSomeAnd(n => n > 0)).toBe(false);
   * ```
   */
  isSomeAnd(f: (x: T) => boolean): this is Some<T> & boolean;

  /**
   * Returns an iterator over this option’s value, yielding it if {@link Some}
   * or nothing if {@link None}.
   *
   * @notes
   * - Yields exactly one item for {@link Some}, or zero items for {@link None}.
   * - Compatible with `for...of` loops and spread operators.
   *
   * @example
   * ```ts
   * const x = some(42);
   * const y = none<number>();
   *
   * const iterX = x.iter();
   * expect(iterX.next()).toEqual({ value: 42, done: false });
   * expect(iterX.next()).toEqual({ done: true });
   *
   * const iterY = y.iter();
   * expect(iterY.next()).toEqual({ done: true });
   *
   * expect([...x.iter()]).toEqual([42]);
   * expect([...y.iter()]).toEqual([]);
   * ```
   */
  iter(): IterableIterator<T, T, void>;

  /**
   * Maps the contained value with `f` if {@link Some}, returning a new
   * {@link Option}; otherwise, returns {@link None}.
   *
   * @notes
   * - *Default*: If `f` throws, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.map(n => n * 2)).toStrictEqual(some(4));
   * expect(x.map(_ => { throw new Error() })).toStrictEqual(none());
   * expect(y.map(n => n * 2)).toStrictEqual(none());
   * ```
   */
  map<U>(f: (x: T) => Awaited<U>): Option<U>;

  /**
   * Maps this option by applying a callback to its full state, executing the
   * callback for both {@link Some} and {@link None}, returning a new {@link Option}.
   *
   * Unlike {@link andThen}, which only invokes the callback for {@link Some},
   * this method always calls `f`, passing the entire {@link Option} as its argument.
   *
   * @notes
   * - *Default*: If `f` throws, the error is silently ignored and {@link None}
   *   is returned.
   *
   * @example
   * ```ts
   * const someOpt = some(42);
   * const noneOpt = none<number>();
   * const undefOpt = some(undefined);
   *
   * expect(someOpt.mapAll(opt => some(opt.unwrapOr(0) + 1))).toStrictEqual(some(43));
   * expect(noneOpt.mapAll(opt => some(opt.unwrapOr(0) + 1))).toStrictEqual(some(1));
   * expect(undefOpt.mapAll(opt => some(opt.isSome() ? "some" : "none"))).toStrictEqual(some("some"));
   * ```
   */
  mapAll<U>(f: (x: Option<T>) => Option<U>): Option<U>;
  /**
   * Maps this option by applying a callback to its full state, executing the
   * callback for both {@link Some} and {@link None}, returning a {@link PendingOption}.
   *
   * Unlike {@link andThen}, which only invokes the callback for {@link Some},
   * this method always calls `f`, passing the entire {@link Option} as its argument.
   *
   * @notes
   * - *Default*: If `f` returns a `Promise` that rejects, the resulting
   *   {@link PendingOption} resolves to {@link None}.
   *
   * @example
   * ```ts
   * const someOpt = some(42);
   * const noneOpt = none<number>();
   *
   * const mappedSome = someOpt.mapAll(opt => Promise.resolve(some(opt.unwrapOr(0))));
   * expect(isPendingOption(mappedSome)).toBe(true);
   * expect(await mappedSome).toStrictEqual(some(42));
   *
   * const mappedNone = noneOpt.mapAll(opt => Promise.resolve(some(opt.unwrapOr(0) + 1)));
   * expect(isPendingOption(mappedNone)).toBe(true);
   * expect(await mappedNone).toStrictEqual(some(1));
   * ```
   */
  mapAll<U>(f: (x: Option<T>) => Promise<Option<U>>): PendingOption<Awaited<U>>;

  /**
   * Returns `f` applied to the value if {@link Some}, otherwise returns `def`.
   *
   * @notes
   * - *Default*: If `f` throws, returns `def`.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.mapOr(0, n => n * 2)).toBe(4);
   * expect(x.mapOr(0, _ => { throw new Error() })).toBe(0);
   * expect(y.mapOr(0, n => n * 2)).toBe(0);
   * ```
   */
  mapOr<U>(this: SettledOption<T>, def: Awaited<U>, f: (x: T) => Awaited<U>): U;

  /**
   * Returns `f` applied to the contained value if {@link Some}, otherwise
   * returns the result of `mkDef`.
   *
   * @throws
   * - {@link OptionError} if `mkDef` is called and throws an exception. Original
   *   error will be set as {@link OptionError.reason}.
   *
   * @notes
   * - *Default*: If `f` throws, the error is silently ignored and result of
   *   `mkDef` is returned.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.mapOrElse(() => 0, n => n * 2)).toBe(4);
   * expect(x.mapOrElse(() => 1, _ => { throw new Error() })).toBe(1);
   * expect(() => x.mapOrElse(() => { throw new Error() }, _ => { throw new Error() })).toThrow(OptionError);
   * expect(y.mapOrElse(() => 0, n => n * 2)).toBe(0);
   * ```
   */
  mapOrElse<U>(
    this: SettledOption<T>,
    mkDef: () => Awaited<U>,
    f: (x: T) => Awaited<U>,
  ): U;

  /**
   * Matches the option, returning `f` applied to the value if {@link Some},
   * or `g` if {@link None}.
   *
   * @throws
   * - {@link OptionError} if `f` or `g` throws an exception, original error will be
   *   set as {@link OptionError.reason}.
   *
   * @notes
   * - If `f` or `g` returns a `Promise` that rejects, the caller is responsible
   *   for handling the rejection.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.match(n => n * 2, () => 0)).toBe(4);
   * expect(() => x.match(_ => { throw new Error() }, () => 0)).toThrow(OptionError);
   * expect(y.match(n => n * 2, () => 0)).toBe(0);
   * expect(() => y.match(n => n * 2, () => { throw new Error() })).toThrow(OptionError);
   * ```
   */
  match<U, F = U>(
    this: SettledOption<T>,
    f: (x: T) => Awaited<U>,
    g: () => Awaited<F>,
  ): U | F;

  /**
   * Converts to a {@link Result}, using `y` as the error value if {@link None}.
   *
   * {@link Some | Some(v)} is mapped to {@link Ok | Ok(v)} and {@link None} to
   * {@link Err | Err(y)}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.okOr("error")).toStrictEqual(ok(2));
   * expect(y.okOr("error")).toStrictEqual(err("error"));
   * ```
   */
  okOr<E>(y: Awaited<E>): Result<T, E>;

  /**
   * Converts to a {@link Result}, using the result of `mkErr` as the error
   * value if {@link None}.
   *
   * {@link Some | Some(v)} is mapped to {@link Ok | Ok(v)} and {@link None}
   * to {@link Err | Err(mkErr())}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.okOrElse(() => "error")).toStrictEqual(ok(2));
   * expect(y.okOrElse(() => "error")).toStrictEqual(err("error"));
   * ```
   */
  okOrElse<E>(mkErr: () => Awaited<E>): Result<T, E>;

  /**
   * Returns the current option if it is {@link Some}, otherwise returns `x`.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.or(some(3))).toStrictEqual(some(2));
   * expect(x.or(none())).toStrictEqual(some(2));
   * expect(y.or(some(3))).toStrictEqual(some(3));
   * expect(y.or(none())).toStrictEqual(none());
   * ```
   */
  or(x: Option<T>): Option<T>;

  /**
   * Returns the current option if {@link Some}, otherwise returns the result of `f`.
   *
   * @notes
   * - *Default*: If `f` throws, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.orElse(() => some(3))).toStrictEqual(some(2));
   * expect(y.orElse(() => some(3))).toStrictEqual(some(3));
   * expect(y.orElse(() => { throw new Error() })).toStrictEqual(none());
   * expect(y.orElse(() => none())).toStrictEqual(none());
   * ```
   */
  orElse(f: () => Option<T>): Option<T>;

  /**
   * Replaces the current value with `x` and returns the old {@link Option}.
   *
   * @notes
   * - *Mutation*: This method mutates the {@link Option}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.replace(5)).toStrictEqual(some(2));
   * expect(x).toStrictEqual(some(5));
   * expect(y.replace(5)).toStrictEqual(none());
   * expect(y).toStrictEqual(some(5)); // y is mutated
   * ```
   */
  replace(x: T): Option<T>;

  /**
   * Takes the value out of the {@link Option}, leaving {@link None} in its place.
   *
   * @notes
   * - *Mutation*: This method mutates the {@link Option}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.take()).toStrictEqual(some(2));
   * expect(x).toStrictEqual(none());
   * expect(y.take()).toStrictEqual(none());
   * expect(y).toStrictEqual(none());
   * ```
   */
  take(): Option<T>;

  /**
   * Takes the value out of the {@link Option}, but only if `f` returns `true`.
   * Similar to {@link take}, but conditional.
   *
   * @notes
   * - *Mutation*: This method mutates the {@link Option}.
   * - *Default*: If `f` throws, {@link None} is returned and the original
   *   value **remains unchanged**.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   * const z = some(1);
   *
   * expect(x.takeIf(n => n > 0)).toStrictEqual(some(2));
   * expect(x).toStrictEqual(none());
   * expect(x.takeIf(n => n < 0)).toStrictEqual(none());
   * expect(y.takeIf(n => n > 0)).toStrictEqual(none());
   * expect(z.takeIf(_ => { throw new Error() })).toStrictEqual(none())
   * expect(z).toStrictEqual(some(1));
   * ```
   */
  takeIf(f: (x: T) => boolean): Option<T>;

  /**
   * Executes `f` with a copy of this option, then returns a new copy unchanged.
   *
   * Useful for side-effects like logging, works with both {@link Some} and {@link None}.
   *
   * @notes
   * - If `f` throws or rejects, the error is ignored.
   * - If `f` returns a promise, the promise is not awaited before returning.
   *
   * @example
   * ```ts
   * const x = some(42);
   * const y = none<number>();
   * let log = "";
   *
   * expect(x.tap(opt => (log = opt.toString()))).toStrictEqual(some(42));
   * expect(log).toBe("Some { 42 }");
   * expect(y.tap(opt => (log = opt.toString()))).toStrictEqual(none());
   * expect(log).toBe("None");
   * ```
   */
  tap(f: (x: Option<T>) => unknown): Option<T>;

  /**
   * Maps this option to a {@link PendingOption} by supplying a shallow
   * {@link Optional.copy | copy} of this option to {@link PendingOption} factory.
   *
   * Useful for transposing an option with `PromiseLike` value to a
   * {@link PendingOption} with `Awaited` value.
   *
   * @notes
   * - *Default*: If inner `T` is a promise-like that rejects, maps to a
   *   {@link PendingOption} with {@link None}.
   *
   * @example
   * ```ts
   * const value = { a: 1 };
   * const x = some(value);
   * const y = none<number>();
   * const pendingX = x.toPending();
   *
   * expect(isPendingOption(pendingX)).toBe(true);
   * expect(await pendingX).toStrictEqual(some({ a: 1 }));
   * value.a = 2;
   * expect(await pendingX).toStrictEqual(some({ a: 2 }));
   * expect(await y.toPending()).toStrictEqual(none());
   * ```
   */
  toPending(): PendingOption<Awaited<T>>;

  /**
   * Maps this option to a {@link PendingOption} by supplying a
   * {@link Optional.clone | clone} of this option to {@link PendingOption} factory.
   *
   * Useful for transposing an option with `PromiseLike` value to a
   * {@link PendingOption} with `Awaited` value.
   *
   * @notes
   * - *Default*: If inner `T` is a promise-like that rejects, maps to a
   *   {@link PendingOption} with {@link None}.
   *
   * @example
   * ```ts
   * const value = { a: 0, clone: () => ({ a: 0 })};
   * const x = some(value);
   * const y = none<number>();
   * const pendingX = x.toPendingCloned();
   *
   * expect(isPendingOption(pendingX)).toBe(true);
   * expect((await pendingX).unwrap().a).toBe(0);
   * value.a = 42;
   * expect((await pendingX).unwrap().a).toBe(0);
   * expect(await y.toPendingCloned()).toStrictEqual(none());
   * ```
   */
  toPendingCloned(this: Option<Cloneable<T>>): PendingOption<Awaited<T>>;

  /**
   * Returns a string representation of the {@link Option}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.toString()).toBe("Some { 2 }");
   * expect(y.toString()).toBe("None");
   * ```
   */
  toString(): string;

  /**
   * Transposes an {@link Option} of a {@link Result} into a {@link Result}
   * of an {@link Option}.
   *
   * Maps `None` to `Ok(None)`, `Some(Ok(_))` to `Ok(Some(_))`,
   * and `Some(Err(_))` to `Err(_)`.
   *
   * @example
   * ```ts
   * const x = none<Result<number, string>>();
   * const y = some<Result<number, string>>(ok(2));
   * const z = some<Result<number, string>>(err("error"));
   *
   * expect(x.transpose()).toStrictEqual(ok(none()));
   * expect(y.transpose()).toStrictEqual(ok(some(2)));
   * expect(z.transpose()).toStrictEqual(err("error"));
   * ```
   */
  transpose<U, E>(this: Option<Result<U, E>>): Result<Option<U>, E>;

  /**
   * Returns the value if {@link Some}, or throws an {@link OptionError} if {@link None}.
   *
   * @throws
   * - {@link OptionError} if this is {@link None}
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrap()).toBe(2);
   * expect(() => y.unwrap()).toThrow("`unwrap`: called on `None`");
   * ```
   */
  unwrap(this: SettledOption<T>): T;

  /**
   * Returns the contained value if {@link Some}, or `def` if {@link None}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrapOr(0)).toBe(2);
   * expect(y.unwrapOr(0)).toBe(0);
   * ```
   */
  unwrapOr(this: SettledOption<T>, def: Awaited<T>): T;

  /**
   * Returns the contained value if {@link Some}, or the result of `mkDef` if {@link None}.
   *
   * @throws
   * - {@link OptionError} if `mkDef` throws, original error will be set as
   *   {@link OptionError.reason}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrapOrElse(() => 0)).toBe(2);
   * expect(y.unwrapOrElse(() => 0)).toBe(0);
   * expect(() => y.unwrapOrElse(() => { throw new Error() })).toThrow(OptionError);
   * ```
   */
  unwrapOrElse(this: SettledOption<T>, mkDef: () => Awaited<T>): T;

  /**
   * Returns {@link Some} if exactly one of `this` or `y` is {@link Some}, otherwise returns {@link None}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.xor(some(3))).toStrictEqual(none());
   * expect(x.xor(none())).toStrictEqual(some(2));
   * expect(y.xor(some(3))).toStrictEqual(some(3));
   * expect(y.xor(none())).toStrictEqual(none());
   * ```
   */
  xor(y: Option<T>): Option<T>;
  /**
   * Returns a {@link PendingOption} with {@link Some} if exactly one of `this` or `y` is
   * {@link Some}, otherwise with {@link None}.
   *
   * @example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(isPendingOption(x.xor(Promise.resolve(some(3))))).toBe(true);
   * expect(await x.xor(Promise.resolve(some(3)))).toStrictEqual(none());
   * expect(await x.xor(Promise.resolve(none()))).toStrictEqual(some(2));
   * expect(await y.xor(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * ```
   */
  xor(y: Promise<Option<T>>): PendingOption<Awaited<T>>;
}

/**
 * Interface defining an asynchronous {@link Option} that wraps a `Promise`
 * resolving to an {@link Option}.
 *
 * Extends {@link Option} functionality for pending states, with methods mirroring
 * their synchronous counterparts but returning {@link PendingOption} or `Promise`
 * for async operations. Rejections typically resolve to {@link None} unless otherwise
 * specified.
 */
export interface PendingOption<T>
  extends PromiseLike<Option<T>>,
    Recoverable<Option<T>> {
  /**
   * Returns a {@link PendingOption} with {@link None} if this option resolves to
   * {@link None}, otherwise returns a {@link PendingOption} with `x`.
   *
   * This is the asynchronous version of {@link Optional.and | and}.
   *
   * @notes
   * - *Default*: If `x` is a `Promise` and rejects, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.and(some(3))).toStrictEqual(some(3));
   * expect(await x.and(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await x.and(none())).toStrictEqual(none());
   * expect(await x.and(Promise.resolve(none()))).toStrictEqual(none());
   * expect(await y.and(some(3))).toStrictEqual(none());
   * expect(await y.and(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  and<U>(
    x: Option<U> | PendingOption<U> | Promise<Option<U>>,
  ): PendingOption<Awaited<U>>;

  /**
   * Returns a {@link PendingOption} with {@link None} if this {@link Option} resolves
   * to {@link None}, otherwise applies `f` to the resolved value and returns the result.
   *
   * This is the asynchronous version of {@link Optional.andThen | andThen}.
   *
   * @notes
   * - *Default*: If `f` rejects or throws, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.andThen(n => some(n * 2))).toStrictEqual(some(4));
   * expect(await x.andThen(n => Promise.resolve(some(n * 2)))).toStrictEqual(some(4));
   * expect(await x.andThen(_ => none())).toStrictEqual(none());
   * expect(await y.andThen(n => some(n * 2))).toStrictEqual(none());
   * ```
   */
  andThen<U>(
    f: (x: T) => Option<U> | PendingOption<U> | Promise<Option<U>>,
  ): PendingOption<Awaited<U>>;

  /**
   * Combines this {@link PendingOption} with other {@link Option} or `PendingOption`
   * instances into a single `PendingOption` containing a tuple of resolved values.
   *
   * The `combine` method takes an arbitrary number of `Option` or `PendingOption`
   * instances. It resolves all inputs and returns a `PendingOption` that, when
   * resolved, contains an `Option` with a tuple of their values if all resolve
   * to `Some`. If any input resolves to `None`, the result resolves to `None`.
   * The resulting tuple includes the resolved value of this `PendingOption` as
   * the first element, followed by the resolved values from the provided instances.
   *
   * @example
   * ```ts
   * const x = pendingSome(1);
   * const y = some(Promise.resolve("hi"));
   * const z = none<Error>();
   * const h = pendingNone<Promise<Date>>();
   * const w = x.combine(y, z, h); // PendingOption<[number, Promise<string>, Error, Date]>
   * ```
   */
  combine<U extends (Option<unknown> | PendingOption<unknown>)[]>(
    ...opts: U
  ): PendingOption<[Awaited<T>, ...SomeAwaitedValues<U>]>;

  /**
   * Returns a {@link PendingOption} with {@link None} if this option resolves to
   * {@link None}, otherwise calls `f` with the resolved value and returns
   * a {@link PendingOption} with the original value if `f` resolves to `true`,
   * or {@link None} otherwise.
   *
   * This is the asynchronous version of {@link Optional.filter | filter}.
   *
   * @notes
   * - *Default*: If `f` rejects or throws, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.filter(n => n > 0)).toStrictEqual(some(2));
   * expect(await x.filter(n => Promise.resolve(n < 0))).toStrictEqual(none());
   * expect(await y.filter(_ => true)).toStrictEqual(none());
   * ```
   */
  filter(f: (x: T) => boolean | Promise<boolean>): PendingOption<T>;

  /**
   * Flattens a {@link PendingOption} of a {@link PendingOption} or {@link Option},
   * resolving nested pending states.
   *
   * This is the asynchronous version of {@link Optional.flatten | flatten}.
   *
   * @notes
   * - *Default*: If inner {@link Option} is wrapped in a `Promise` and rejects,
   * flattened {@link PendingOption} with {@link None} is returned.
   *
   * @example
   * ```ts
   * const option1: PendingOption<Option<number>> = getPendingOption();
   * option1.flatten(); // PendingOption<number>
   *
   * const option2: PendingOption<PendingOption<number>> = getPendingOption();
   * option2.flatten(); // PendingOption<number>
   *
   * const option3: PendingOption<PendingOption<PendingOption<number>>> = getPendingOption();
   * option3.flatten(); // PendingOption<Option<number>>
   * ```
   */
  flatten<U>(
    this:
      | PendingOption<Option<U>>
      | PendingOption<PendingOption<U>>
      | PendingOption<PromiseLike<Option<U>>>,
  ): PendingOption<Awaited<U>>;

  /**
   * Calls `f` with the resolved value if this option is {@link Some}, then returns this
   * {@link PendingOption} unchanged. Useful for side effects.
   *
   * This is the asynchronous version of {@link Optional.inspect | inspect}.
   *
   * @notes
   * - Returns a new {@link PendingOption} instance with the same value as the original,
   *   rather than the exact same reference. The returned option is a distinct object,
   *   preserving the original value.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   * let sideEffect = 0;
   *
   * expect(await x.inspect(n => (sideEffect = n))).toStrictEqual(some(2));
   * expect(sideEffect).toBe(2);
   * expect(await y.inspect(n => (sideEffect = n))).toStrictEqual(none());
   * expect(sideEffect).toBe(2); // Unchanged
   * ```
   */
  inspect(f: (x: T) => unknown): PendingOption<T>;

  /**
   * Returns an async iterator over this pending option’s value, yielding it if
   * it resolves to {@link Some} or nothing if it resolves to {@link None}.
   *
   * @notes
   * - Yields exactly one item for a resolved {@link Some}, or zero items for
   *   a resolved {@link None}.
   * - Compatible with `for await...of` loops and async spread operators (with caution).
   *
   * @example
   * ```ts
   * const x = some(42).toPending();
   * const y = none<number>().toPending();
   *
   * const iterX = x.iter();
   * expect(await iterX.next()).toEqual({ value: 42, done: false });
   * expect(await iterX.next()).toEqual({ done: true });
   *
   * const iterY = y.iter();
   * expect(await iterY.next()).toEqual({ done: true });
   *
   * async function collect(iter) {
   *   const result = [];
   *   for await (const val of iter) result.push(val);
   *   return result;
   * }
   * expect(await collect(x.iter())).toEqual([42]);
   * expect(await collect(y.iter())).toEqual([]);
   * ```
   */
  iter(): AsyncIterableIterator<Awaited<T>, Awaited<T>, void>;

  /**
   * Maps the resolved value with `f`, returning a {@link PendingOption} with the
   * result if {@link Some}, or {@link None} if {@link None}.
   *
   * This is the async version of {@link Optional.map | map}.
   *
   * @notes
   * - If `f` throws or rejects, returns {@link None}.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.map(n => n * 2)).toStrictEqual(some(4));
   * expect(await x.map(n => Promise.resolve(n * 2))).toStrictEqual(some(4));
   * expect(await y.map(n => n * 2)).toStrictEqual(none());
   * ```
   */
  map<U>(f: (x: T) => U): PendingOption<Awaited<U>>;

  /**
   * Maps this option by applying a callback to its full state, executing the
   * callback for both {@link Some} and {@link None}, returning a new {@link PendingOption}.
   *
   * Unlike {@link andThen}, which only invokes the callback for {@link Some},
   * this method always calls `f`, passing the entire {@link Option} as its argument.
   *
   * This is the asynchronous version of {@link Optional.mapAll | mapAll}.
   *
   * @notes
   * - *Default*: If `f` throws or returns a `Promise` that rejects, the newly
   *   created {@link PendingOption} will resolve to a {@link None}.
   *
   * @example
   * ```ts
   * const someOpt = pendingOption(some(42));
   * const noneOpt = pendingOption(none<number>());
   *
   * const someMapped = someOpt.mapAll(opt => Promise.resolve(some(opt.unwrapOr(0))));
   * expect(await someMapped).toStrictEqual(some(42));
   *
   * const noneMapped = noneOpt.mapAll(opt => Promise.resolve(some(opt.unwrapOr(0) + 1)));
   * expect(await noneMapped).toStrictEqual(some(1));
   * ```
   */
  mapAll<U>(
    f: (x: Option<T>) => Option<U> | PendingOption<U> | Promise<Option<U>>,
  ): PendingOption<Awaited<U>>;

  /**
   * Matches the resolved option, returning `f` applied to the value if {@link Some},
   * or `g` if {@link None}. Returns a `Promise` with the result.
   *
   * This is the asynchronous version of {@link Optional.match | match}.
   *
   * @throws
   * - Rejects with {@link OptionError} if `f` or `g` throws an exception or rejects,
   *   original error will be set as {@link OptionError.reason}.
   *
   * @notes
   * - If `f` or `g` throws or returns a rejected `Promise`, the returned promise
   *   rejects with the original error. In this case the caller is responsible
   *   for handling the rejection.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.match(n => n * 2, () => 0)).toBe(4);
   * expect(await y.match(n => n * 2, () => 0)).toBe(0);
   * await expect(y.match(n => n * 2, () => { throw new Error() })).rejects.toThrow(OptionError);
   * ```
   */
  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<Awaited<U | F>>;

  /**
   * Converts to a {@link PendingResult}, using `y` as the error value if this
   * {@link PendingOption} resolves to {@link None}.
   *
   * This is the asynchronous version of {@link Optional.okOr | okOr},
   * check it for more details.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.okOr("error")).toStrictEqual(ok(2));
   * expect(await y.okOr("error")).toStrictEqual(err("error"));
   * ```
   */
  okOr<E>(y: Awaited<E>): PendingResult<T, E>;

  /**
   * Converts to a {@link PendingResult}, using the result of `mkErr`
   * as the error value if this resolves to {@link None}.
   *
   * This is the asynchronous version of {@link Optional.okOrElse | okOrElse}.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.okOrElse(() => "error")).toStrictEqual(ok(2));
   * expect(await y.okOrElse(() => Promise.resolve("error"))).toStrictEqual(err("error"));
   * ```
   */
  okOrElse<E>(mkErr: () => E | Promise<E>): PendingResult<T, E>;

  /**
   * Returns this {@link PendingOption} if it resolves to {@link Some}, otherwise
   * returns a {@link PendingOption} with `x`.
   *
   * This is the asynchronous version of {@link Optional.or | or}.
   *
   * @notes
   * - *Default*: If `x` is a `Promise` that rejects, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.or(some(3))).toStrictEqual(some(2));
   * expect(await x.or(Promise.resolve(none()))).toStrictEqual(some(2));
   * expect(await y.or(some(3))).toStrictEqual(some(3));
   * expect(await y.or(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  or(
    x: Option<T> | PendingOption<T> | Promise<Option<T>>,
  ): PendingOption<Awaited<T>>;

  /**
   * Returns this {@link PendingOption} if it resolves to {@link Some}, otherwise
   * returns a {@link PendingOption} with the result of `f`.
   *
   * This is the asynchronous version of {@link Optional.orElse | orElse}.
   *
   * @notes
   * - *Default*: If `f` throws or rejects, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.orElse(() => some(3))).toStrictEqual(some(2));
   * expect(await y.orElse(() => Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await y.orElse(() => some(1))).toStrictEqual(some(1));
   * ```
   */
  orElse(
    f: () => Option<T> | PendingOption<T> | Promise<Option<T>>,
  ): PendingOption<Awaited<T>>;

  /**
   * Executes `f` with the resolved option, then returns a new {@link PendingOption}
   * unchanged.
   *
   * This is the asynchronous version of {@link Optional.tap | tap}.
   *
   * @notes
   * - If `f` throws or rejects, the error is ignored.
   * - If `f` returns a promise, the promise is not awaited before returning.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(42));
   * const y = pendingOption(none<number>());
   * let log = "";
   *
   * expect(await x.tap(opt => (log = opt.toString()))).toStrictEqual(some(42));
   * expect(log).toBe("Some { 42 }");
   * expect(await y.tap(opt => (log = opt.toString()))).toStrictEqual(none());
   * expect(log).toBe("None");
   * ```
   */
  tap(f: (x: Option<T>) => unknown): PendingOption<T>;

  /**
   * Transposes a {@link PendingOption} of a {@link Result} into a {@link PendingResult}
   * containing an {@link Option}.
   *
   * This is the asynchronous version of {@link Optional.transpose | transpose}.
   *
   * @example
   * ```ts
   * const x = pendingOption(none<Result<number, string>>());
   * const y = pendingOption(some<Result<number, string>>(ok(2)));
   * const z = pendingOption(some<Result<number, string>>(err("error")));
   *
   * expect(await x.transpose()).toStrictEqual(ok(none()));
   * expect(await y.transpose()).toStrictEqual(ok(some(2)));
   * expect(await z.transpose()).toStrictEqual(err("error"));
   * ```
   */
  transpose<U, E>(
    this: PendingOption<Result<U, E>>,
  ): PendingResult<Option<U>, E>;

  /**
   * Returns a {@link PendingOption} with {@link Some} if exactly one of this option or
   * `y` resolves to {@link Some}, otherwise returns a {@link PendingOption} with
   * {@link None}.
   *
   * This is the asynchronous version of {@link Optional.xor | xor}.
   *
   * @notes
   * - *Default*: If `y` is a `Promise` that rejects, {@link None} is returned.
   *
   * @example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.xor(some(3))).toStrictEqual(none());
   * expect(await x.xor(Promise.resolve(none()))).toStrictEqual(some(2));
   * expect(await y.xor(some(3))).toStrictEqual(some(3));
   * expect(await y.xor(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  xor(
    y: Option<T> | PendingOption<T> | Promise<Option<T>>,
  ): PendingOption<Awaited<T>>;
}

/**
 * Internal symbol-keyed property used as a type discriminant, holding `"some"`
 * or `"none"` to indicate whether the {@link Option} is a {@link Some} or
 * {@link None} variant.
 *
 * Not intended for direct user access or modification, this enables TypeScript's
 * type narrowing for methods like {@link isSome} and {@link isNone}. The `phantom`
 * symbol ensures module-level privacy, allowing internal state mutation (e.g.,
 * from `None` to `Some`) without external interference.
 */
export const phantom: unique symbol = Symbol("OptionPhantom");
