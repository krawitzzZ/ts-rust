/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AnyError } from "../error";
import type { Cloneable, Recoverable, Sync } from "../types";
import type { Result, Ok, Err } from "../result";
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
 * non-{@link PromiseLike}, ensuring immediate availability without awaiting.
 *
 * This restricted {@link Option} variant enforces synchronous values for methods
 * like {@link insert}, {@link getOrInsert}, and {@link getOrInsertWith}, which
 * mutate the option. Use it when you need a type-safe, synchronous option.
 */
export type SettledOption<T> = Option<Sync<T>>;

/**
 * Interface defining the core functionality of an {@link Option}, inspired by Rust's
 * {@link https://doc.rust-lang.org/std/option/enum.Option.html | Option} type, with
 * additional methods tailored for TypeScript.
 *
 * Represents a value that may or may not be present, offering a robust alternative to
 * `null` or `undefined`. It includes most Rust `Option` methods (e.g., `map`, `andThen`,
 * `unwrap`) for safe value handling, plus TypeScript-specific extensions like
 * {@link toPending} and async variants of {@link and} with {@link Promise} support.
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
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none();
   *
   * expect(x.and(some(3))).toStrictEqual(some(3));
   * expect(x.and(none())).toStrictEqual(none());
   * expect(y.and(some(3))).toStrictEqual(none());
   * expect(y.and(none())).toStrictEqual(none());
   * ```
   */
  and<U>(x: Option<U>): Option<U>;
  /**
   * Returns a {@link PendingOption} with {@link None} if this option is {@link None},
   * otherwise with the resolved value of `x`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none();
   *
   * expect(isPendingOption(x.and(Promise.resolve(some(3))))).toBe(true);
   * expect(await x.and(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await x.and(Promise.resolve(none()))).toStrictEqual(none());
   * expect(await y.and(Promise.resolve(some(3)))).toStrictEqual(none());
   * expect(await y.and(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  and<U>(x: Promise<Option<U>>): PendingOption<Awaited<U>>;

  /**
   * Applies `f` to the value if {@link Some}, returning its result; otherwise,
   * returns {@link None}. Also known as `flatMap`.
   *
   * ### Notes
   * - *Default*: If `f` throws, returns {@link None}.
   *
   * ### Example
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
   * ### Example
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
   * Returns a **shallow** copy of the {@link Option}.
   *
   * ### Example
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
   * Returns the value if {@link Some}, or throws an {@link AnyError} with `msg`
   * (or a default message) if {@link None}.
   *
   * ## Throws
   * - {@link AnyError} if this is {@link None}
   *
   * ### Example
   * ```ts
   * const x = some(42);
   * const y = none<number>();
   *
   * expect(x.expect("Missing value")).toBe(42);
   * expect(() => y.expect("Missing value")).toThrow("Missing value");
   * expect(() => y.expect()).toThrow("`Option.expect` - called on `None`");
   * ```
   */
  expect(this: SettledOption<T>, msg?: string): T;

  /**
   * Returns the option if {@link Some} and `f` returns `true`, otherwise
   * returns {@link None}.
   *
   * ### Notes
   * - *Default*: If `f` throws, {@link None} is returned.
   *
   * ### Example
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
   * Think of it as of unwrapping a box inside a box.
   *
   * ### Example
   * ```ts
   * const x: Option<Option<Option<number>>> = some(some(some(6)));
   * const y: Option<Option<number>> = x.flatten();
   * const z = none<Option<number>>();
   *
   * expect(x.flatten()).toStrictEqual(some(some(6)));
   * expect(y.flatten()).toStrictEqual(none());
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
   * ### Notes
   * - *Mutation*: This method mutates the {@link Option}.
   *
   * ### Example
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
   * ## Throws
   * - {@link AnyError} if `f` throws, with the original error as {@link AnyError.reason}
   *
   * ### Notes
   * - *Mutation*: Mutates this option to {@link Some} with `f`’s result if {@link None}.
   *   If `f` throws, the option remains unchanged.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   * const z = none<number>();
   *
   * expect(x.getOrInsertWith(() => 5)).toBe(2);
   * expect(y.getOrInsertWith(() => 5)).toBe(5);
   * expect(y).toStrictEqual(some(5)); // Mutated
   * expect(() => z.getOrInsertWith(() => { throw new Error() })).toThrow(AnyError);
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
   * ### Notes
   * - *Mutation*: This method mutates the {@link Option}.
   *
   * ### Example
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
   * If `f` throws or returns a {@link Promise} that rejects, the error is ignored.
   *
   * ### Notes
   * - Returns a new {@link Option} instance, not the original reference.
   *
   * ### Example
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
   * ### Example
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
   * ### Notes
   * - *Default*: If `f` throws, `false` is returned.
   *
   * ### Example
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
   * ### Example
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
   * Returns `true` if the option is {@link Some} and `f` returns `true` for the contained value.
   *
   * ### Notes
   * - *Default*: If `f` throws, `false` is returned.
   *
   * ### Example
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
   * Maps the contained value with `f` if {@link Some}, returning a new {@link Option}; otherwise,
   * returns {@link None}.
   *
   * ### Notes
   * - *Default*: If `f` throws, {@link None} is returned.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.map(n => n * 2)).toStrictEqual(some(4));
   * expect(x.map(n => { throw new Error() })).toStrictEqual(none());
   * expect(y.map(n => n * 2)).toStrictEqual(none());
   * ```
   */
  map<U>(f: (x: T) => Sync<U>): Option<U>;

  /**
   * Maps this option by applying a callback to its full state, executing the
   * callback for both {@link Some} and {@link None}, returning a new {@link Option}.
   *
   * Unlike {@link andThen}, which only invokes the callback for {@link Some},
   * this method always calls `f`, passing the entire {@link Option} as its argument.
   *
   * ### Notes
   * - *Default*: If `f` throws, the error is silently ignored and {@link None}
   *   is returned.
   *
   * ### Example
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
   * ### Notes
   * - *Default*: If `f` returns a {@link Promise} that rejects, the resulting
   *   {@link PendingOption} resolves to {@link None}.
   *
   * ### Example
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
   * ### Notes
   * - *Default*: If `f` throws, returns `def`.
   * - For async values, use {@link PendingOption.mapOr} via {@link toPending}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.mapOr(0, n => n * 2)).toBe(4);
   * expect(x.mapOr(0, _ => { throw new Error() })).toBe(0);
   * expect(y.mapOr(0, n => n * 2)).toBe(0);
   * ```
   */
  mapOr<U>(this: SettledOption<T>, def: Sync<U>, f: (x: T) => Sync<U>): U;

  /**
   * Returns `f` applied to the contained value if {@link Some}, otherwise
   * returns the result of `mkDef`.
   *
   * ## Throws
   * - {@link AnyError} if `mkDef` is called and throws an exception. Original
   * error will be set as {@link AnyError.reason}.
   *
   * ### Notes
   * - *Default*: If `f` throws, the error is silently ignored and result of
   *   `mkDef` is returned.
   * - For asynchronous values, convert to {@link PendingOption} with {@link toPending}
   *   and use {@link PendingOption.mapOrElse}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.mapOrElse(() => 0, n => n * 2)).toBe(4);
   * expect(x.mapOrElse(() => 1, _ => { throw new Error() })).toBe(1);
   * expect(() => x.mapOrElse(() => { throw new Error() }, _ => { throw new Error() })).toThrow(AnyError);
   * expect(y.mapOrElse(() => 0, n => n * 2)).toBe(0);
   * ```
   */
  mapOrElse<U>(
    this: SettledOption<T>,
    mkDef: () => Sync<U>,
    f: (x: T) => Sync<U>,
  ): U;

  /**
   * Matches the option, returning `f` applied to the value if {@link Some},
   * or `g` if {@link None}.
   *
   * ## Throws
   * - {@link AnyError} if `f` or `g` throws an exception, original error will be
   *   set as {@link AnyError.reason}.
   *
   * ### Notes
   * - If `f` or `g` return a {@link Promise} that rejects, the caller is responsible
   *   for handling the rejection.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.match(n => n * 2, () => 0)).toBe(4);
   * expect(() => x.match(_ => { throw new Error() }, () => 0)).toThrow(AnyError);
   * expect(y.match(n => n * 2, () => 0)).toBe(0);
   * expect(() => y.match(n => n * 2, () => { throw new Error() })).toThrow(AnyError);
   * ```
   */
  match<U, F = U>(
    this: SettledOption<T>,
    f: (x: T) => Sync<U>,
    g: () => Sync<F>,
  ): U | F;

  /**
   * Converts to a {@link Result}, using `y` as the error value if {@link None}.
   *
   * {@link Some | Some(v)} is mapped to {@link Ok | Ok(v)} and {@link None} to {@link Err | Err(y)}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.okOr("error")).toStrictEqual(ok(2));
   * expect(y.okOr("error")).toStrictEqual(err("error"));
   * ```
   */
  okOr<E>(y: Sync<E>): Result<T, E>;

  /**
   * Converts to a {@link Result}, using the result of `mkErr` as the error value if {@link None}.
   *
   * {@link Some | Some(v)} is mapped to {@link Ok | Ok(v)} and {@link None} to {@link Err | Err(mkErr())}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.okOrElse(() => "error")).toStrictEqual(ok(2));
   * expect(y.okOrElse(() => "error")).toStrictEqual(err("error"));
   * ```
   */
  okOrElse<E>(mkErr: () => E): Result<T, E>;

  /**
   * Returns the current option if it is {@link Some}, otherwise returns `x`.
   *
   * ### Example
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
   * Returns a {@link PendingOption} with the current value if this option is
   * {@link Some}, otherwise with `x`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(isPendingOption(x.or(Promise.resolve(some(3))))).toBe(true);
   * expect(await x.or(Promise.resolve(some(3)))).toStrictEqual(some(2));
   * expect(await y.or(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await y.or(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  or(x: Promise<Option<T>>): PendingOption<T>;

  /**
   * Returns the current option if {@link Some}, otherwise returns the result of `f`.
   *
   * ### Notes
   * - *Default*: If `f` throws, {@link None} is returned.
   *
   * ### Example
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
   * ### Notes
   * - *Mutation*: This method mutates the {@link Option}.
   *
   * ### Example
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
   * Takes the value out of the option, leaving {@link None} in its place.
   *
   * ### Notes
   * - *Mutation*: This method mutates the {@link Option}.
   *
   * ### Example
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
   * ### Notes
   * - *Mutation*: This method mutates the {@link Option}.
   * - *Default*: If `f` throws, {@link None} is returned and the original
   *   value **remains unchanged**.
   *
   * ### Example
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
   * Useful for side-effects like logging, affecting both {@link Some} and {@link None}.
   *
   * ### Notes
   * - If `f` throws, the error is ignored.
   *
   * ### Example
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
  tap(f: (opt: Option<T>) => unknown): Option<T>;

  /**
   * Maps this option to a {@link PendingOption} by supplying a shallow
   * {@link Optional.copy | copy} of this option to {@link PendingOption} factory.
   *
   * Useful for transposing an option with {@link PromiseLike} value to a
   * {@link PendingOption} with {@link Awaited} value.
   *
   * ### Notes
   * - *Default*: If inner `T` is a promise-like that rejects, maps to a
   *   {@link PendingOption} with {@link None}.
   *
   * ### Example
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
   * Useful for transposing an option with {@link PromiseLike} value to a
   * {@link PendingOption} with {@link Awaited} value.
   *
   * ### Notes
   * - *Default*: If inner `T` is a promise-like that rejects, maps to a
   *   {@link PendingOption} with {@link None}.
   *
   * ### Example
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
   * ### Example
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
   * Transposes an {@link Option} of a {@link Result} into a {@link Result} of an {@link Option}.
   *
   * Maps {@link None} to {@link Ok}({@link None}), {@link Some}({@link Ok | Ok(v)}) to
   * {@link Ok}({@link Some | Some(v)}), and {@link Some}({@link Err | Err(e)}) to
   * {@link Err | Err(e)}.
   *
   * ### Example
   * ```ts
   * const x = some(ok(2));
   * const y = some(err("error"));
   * const z = none<Result<number, string>>();
   *
   * expect(x.transpose()).toStrictEqual(ok(some(2)));
   * expect(y.transpose()).toStrictEqual(err("error"));
   * expect(z.transpose()).toStrictEqual(ok(none()));
   * ```
   */
  transpose<U, E>(this: Option<Result<U, E>>): Result<Option<U>, E>;

  /**
   * Returns the value if {@link Some}, or throws an {@link AnyError} if {@link None}.
   *
   * ## Throws
   * - {@link AnyError} if this is {@link None}
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrap()).toBe(2);
   * expect(() => y.unwrap()).toThrow("`Option.unwrap` - called on `None`");
   * ```
   */
  unwrap(this: SettledOption<T>): T;

  /**
   * Returns the contained value if {@link Some}, or `def` if {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrapOr(0)).toBe(2);
   * expect(y.unwrapOr(0)).toBe(0);
   * ```
   */
  unwrapOr(this: SettledOption<T>, def: Sync<T>): T;

  /**
   * Returns the contained value if {@link Some}, or the result of `mkDef` if {@link None}.
   *
   * ## Throws
   * - {@link AnyError} if `mkDef` throws, original error will be set as
   *   {@link AnyError.reason}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrapOrElse(() => 0)).toBe(2);
   * expect(y.unwrapOrElse(() => 0)).toBe(0);
   * expect(() => y.unwrapOrElse(() => { throw new Error() })).toThrow(AnyError);
   * ```
   */
  unwrapOrElse(this: SettledOption<T>, mkDef: () => Sync<T>): T;

  /**
   * Returns {@link Some} if exactly one of `this` or `y` is {@link Some}, otherwise returns {@link None}.
   *
   * ### Example
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
   * ### Example
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
  xor(y: Promise<Option<T>>): PendingOption<T>;
}

/**
 * Interface defining an asynchronous {@link Option} that wraps a {@link Promise}
 * resolving to an {@link Option}.
 *
 * Extends {@link Option} functionality for pending states, with methods mirroring
 * their synchronous counterparts but returning {@link PendingOption} or {@link Promise}
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
   * This is the asynchronous version of the {@link Option.and}.
   *
   * ### Notes
   * - *Default*: If `x` is a {@link Promise} and rejects, {@link None} is returned.
   *
   * ### Example
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
  and<U>(x: Option<U> | Promise<Option<U>>): PendingOption<Awaited<U>>;

  /**
   * Returns a {@link PendingOption} with {@link None} if this {@link Option} resolves
   * to {@link None}, otherwise applies `f` to the resolved value and returns the result.
   *
   * This is the asynchronous version of the {@link Option.andThen}.
   *
   * ### Notes
   * - *Default*: If `f` rejects or throws, {@link None} is returned.
   *
   * ### Example
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
    f: (x: T) => Option<U> | Promise<Option<U>>,
  ): PendingOption<Awaited<U>>;

  /**
   * Returns {@link PendingOption} with {@link None} if this option resolves to {@link None},
   * otherwise calls `f` with the resolved value and returns a {@link PendingOption} with
   * the original value if `f` resolves to `true`, or {@link None} otherwise.
   *
   * This is the asynchronous version of the {@link Option.filter}.
   *
   * ### Notes
   * - *Default*: If `f` rejects or throws, {@link None} is returned.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.filter(n => n > 0)).toStrictEqual(some(2));
   * expect(await x.filter(n => Promise.resolve(n < 0))).toStrictEqual(none());
   * expect(await y.filter(n => true)).toStrictEqual(none());
   * ```
   */
  filter(f: (x: T) => boolean | Promise<boolean>): PendingOption<T>;

  /**
   * Flattens a {@link PendingOption} of a {@link PendingOption} or {@link Option},
   * resolving nested pending states.
   *
   * This is the asynchronous version of the {@link Option.flatten}.
   *
   * ### Notes
   * - *Default*: If inner {@link Option} is wrapped in a {@link Promise} and rejects,
   * flattened {@link PendingOption} with {@link None} is returned.
   *
   * ### Example
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
   * This is the asynchronous version of the {@link Option.inspect}.
   *
   * ### Notes
   * - Returns a new {@link PendingOption} instance with the same value as the original,
   *   rather than the exact same reference. The returned option is a distinct object,
   *   preserving the original value.
   *
   * ### Example
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
   * Maps the resolved value with `f`, returning a {@link PendingOption} with the
   * result if {@link Some}, or {@link None} if {@link None}.
   *
   * This is the async version of {@link Option.map}.
   *
   * ### Notes
   * - If `f` throws or rejects, returns {@link None}.
   *
   * ### Example
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
   * ### Notes
   * - *Default*: If `f` throws or returns a {@link Promise} that rejects, newly
   *   created {@link PendingOption} will resolve to a {@link None}.
   *
   * ### Example
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
    f: (x: Option<T>) => Option<U> | Promise<Option<U>>,
  ): PendingOption<U>;

  /**
   * Matches the resolved option, returning `f` applied to the value if {@link Some},
   * or `g` if {@link None}. Returns a {@link Promise} with the result.
   *
   * This is the asynchronous version of the {@link Option.match}.
   *
   * ## Rejects
   * - With {@link AnyError} if `f` or `g` throws an exception, original error
   *   will be set as {@link AnyError.reason}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.match(n => n * 2, () => 0)).toBe(4);
   * expect(await y.match(n => n * 2, () => 0)).toBe(0);
   * await expect(y.match(n => n * 2, () => { throw new Error() })).rejects.toThrow(AnyError);
   * ```
   */
  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<Awaited<U | F>>;

  /**
   * Converts to a {@link Promise} of a {@link Result}, using `y` as the error value if
   * this {@link PendingOption} resolves to {@link None}.
   *
   * This is the asynchronous version of the {@link Option.okOr}, check it for more details.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.okOr("error")).toStrictEqual(ok(2));
   * expect(await y.okOr("error")).toStrictEqual(err("error"));
   * ```
   */
  // TODO(nikita.demin): will be PendingResult as soon as it's implemented
  okOr<E>(y: Sync<E>): Promise<Result<T, E>>;

  /**
   * Converts to a {@link Promise} of a {@link Result}, using the result of `mkErr`
   * as the error value if this resolves to {@link None}.
   *
   * This is the asynchronous version of {@link Option.okOrElse}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.okOrElse(() => "error")).toStrictEqual(ok(2));
   * expect(await y.okOrElse(() => Promise.resolve("error"))).toStrictEqual(err("error"));
   * ```
   */
  // TODO(nikita.demin): will be PendingResult as soon as it's implemented
  okOrElse<E>(mkErr: () => E | Promise<E>): Promise<Result<T, E>>;

  /**
   * Returns this {@link PendingOption} if it resolves to {@link Some}, otherwise
   * returns a {@link PendingOption} with `x`.
   *
   * This is the asynchronous version of the {@link Option.or}.
   *
   * ### Notes
   * - *Default*: If `x` is a {@link Promise} that rejects, {@link None} is returned.
   *
   * ### Example
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
  or(x: Option<T> | Promise<Option<T>>): PendingOption<T>;

  /**
   * Returns this {@link PendingOption} if it resolves to {@link Some}, otherwise
   * returns a {@link PendingOption} with the result of `f`.
   *
   * This is the asynchronous version of the {@link Option.orElse}.
   *
   * ### Notes
   * - *Default*: If `f` is throws or rejects, {@link None} is returned.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.orElse(() => some(3))).toStrictEqual(some(2));
   * expect(await y.orElse(() => Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await y.orElse(() => none())).toStrictEqual(none());
   * ```
   */
  orElse(f: () => Option<T> | Promise<Option<T>>): PendingOption<T>;

  /**
   * Executes `f` with the resolved option, then returns a new {@link PendingOption}
   * unchanged.
   *
   * ### Notes
   * - If `f` throws or rejects, the error is ignored.
   *
   * ### Example
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
  tap(f: (opt: Option<T>) => void | Promise<void>): PendingOption<T>;

  /**
   * Transposes a {@link PendingOption} of a {@link Result} into a {@link Promise} of a
   * {@link Result} containing a {@link PendingOption}. Resolves to {@link Ok}({@link None})
   * if this option is {@link None}, or propagates the error if the result is {@link Err}.
   *
   * This is the asynchronous version of the {@link Option.transpose}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(ok(2)));
   * const y = pendingOption(some(err("error")));
   * const z = pendingOption(none<Result<number, string>>());
   *
   * expect(await x.transpose()).toStrictEqual(ok(some(2)));
   * expect(await y.transpose()).toStrictEqual(err("error"));
   * expect(await z.transpose()).toStrictEqual(ok(none()));
   * ```
   */
  // TODO(nikita.demin): will pending result as soon as it's implemented
  transpose<U, E>(
    this: PendingOption<Result<U, E>>,
  ): Promise<Result<Option<U>, E>>;

  /**
   * Returns a {@link PendingOption} with {@link Some} if exactly one of this option or
   * `y` resolves to {@link Some}, otherwise returns a {@link PendingOption} with
   * {@link None}.
   *
   * This is the asynchronous version of the {@link Option.xor}.
   *
   * ### Notes
   * - *Default*: If `y` is a {@link Promise} that rejects, {@link None} is returned.
   *
   * ### Example
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
  xor(y: Option<T> | Promise<Option<T>>): PendingOption<T>;
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
