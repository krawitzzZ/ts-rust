/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AnyError } from "../error";
import type { Result, Ok, Err } from "../result";
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * A type that represents either a value ({@link Some | Some\<T>}) or
 * no value ({@link None | None\<T>}).
 *
 * Inspired by Rust's {@link https://doc.rust-lang.org/std/option/enum.Option.html | Option}
 * type, this is used to handle values that may or may not be present, avoiding
 * null or undefined checks.
 */
export type Option<T> = Some<T> | None<T>;

/**
 * Represents a successful {@link Option} containing a value of type `T`.
 */
export type Some<T> = IOption<T> & { [phantom]: "some"; readonly value: T };

/**
 * Represents an empty {@link Option} with no value.
 */
export type None<T> = IOption<T> & { [phantom]: "none" };

/**
 * Interface defining the core functionality of an {@link Option}, inspired by Rust's
 * {@link https://doc.rust-lang.org/std/option/enum.Option.html | Option} type with
 * additional methods for enhanced usability in TypeScript.
 *
 * This interface represents a value that may or may not be present, providing a robust
 * alternative to `null` or `undefined`. It encapsulates most methods from Rust's
 * `Option` (e.g., {@link map}, {@link andThen}, {@link unwrap}), which allow for
 * safe transformations and access to the contained value, if any.
 * Beyond Rust's standard, it includes extra methods such as {@link toPendingOption}
 * and asynchronous variants like {@link and} with {@link Promise} support, tailored
 * for TypeScript's type system and JavaScript's asynchronous nature.
 *
 * For methods that accept functions or predicates (e.g., {@link orElse},
 * {@link filter}, {@link map}, {@link andThen}), if the
 * provided function throws an exception, the method returns {@link None} instead
 * of propagating the error. This ensures type safety and predictable behavior,
 * making {@link Option} reliable for use in any context, even where errors might occur.
 *
 * In case if you are concerned about possible errors, consider using methods like
 * {@link okOr} or {@link okOrElse} to convert the option into {@link Result}.
 *
 * Implementations of this interface, such as {@link Some} and {@link None}, provide
 * concrete behavior for these methods, enabling pattern matching, transformations,
 * and error handling in a type-safe manner.
 */
export interface IOption<T> {
  /**
   * Returns {@link None} if the option is {@link None}, otherwise returns `x`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none();
   *
   * expect(x.and(some(3)).toStrictEqual(some(3));
   * expect(x.and(none()).toStrictEqual(none());
   * expect(y.and(some(3)).toStrictEqual(none());
   * expect(y.and(none()).toStrictEqual(none());
   * ```
   */
  and<U>(x: Option<U>): Option<U>;
  /**
   * Returns {@link PendingOption} with {@link None} if the promise resolves to
   * {@link None} , otherwise returns {@link PendingOption} with `x`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none();
   *
   * expect(x.and(Promise.resolve(some(3))).toBeInstanceOf(PendingOption);
   * expect(await x.and(Promise.resolve(some(3))).toStrictEqual(some(3));
   * expect(await x.and(Promise.resolve(none())).toStrictEqual(none());
   * expect(await y.and(Promise.resolve(some(3))).toStrictEqual(none());
   * expect(await y.and(Promise.resolve(none())).toStrictEqual(none());
   * ```
   */
  and<U>(x: Promise<Option<U>>): PendingOption<U>;
  /**
   * Applies `f` to the contained value if {@link Some}, returning its result; otherwise,
   * returns {@link None}. Also known as flatMap.
   *
   * ### Note
   * If `f` throws, {@link None} is returned.
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
   * Applies `f` to the contained value if {@link Some}, returning a {@link PendingOption}
   * with its async result; otherwise, returns {@link PendingOption} with {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.andThen(n => Promise.resolve(some(n * 2)))).toBeInstanceOf(PendingOption);
   * expect(await x.andThen(n => Promise.resolve(some(n * 2)))).toStrictEqual(some(4));
   * expect(await x.andThen(_ => Promise.resolve(none()))).toStrictEqual(none());
   * expect(await y.andThen(n => Promise.resolve(some(n * 2)))).toStrictEqual(none());
   * ```
   */
  andThen<U>(f: (x: T) => Promise<Option<U>>): PendingOption<U>;
  /**
   * Returns a **shallow** copy of the {@link Option}.
   *
   * ### Example
   * ```ts
   * const x = some({ a: 1 });
   * const y = none<{ a: number }>();
   *
   * expect(x.clone()).toStrictEqual(some({ a: 1 }));
   * expect(x.clone()).not.toBe(x); // Different reference
   * expect(y.clone()).toStrictEqual(none());
   * ```
   */
  clone(): Option<T>;
  /**
   * Returns the contained value if {@link Some}, or throws {@link AnyError}
   * with the provided message (or a default) if {@link None}.
   *
   * ## Throws
   * {@link AnyError} if value is {@link None}
   *
   * ### Example
   * ```ts
   * const x = some(42);
   * const y = none<number>();
   *
   * expect(x.expect("Missing value")).toBe(42);
   * expect(() => y.expect("Missing value")).toThrow("Missing value");
   * expect(() => y.expect()).toThrow(AnyError); // Default message
   * ```
   */
  expect(msg?: string): T;
  /**
   * Returns the option if {@link Some} and `f` returns `true`, otherwise returns {@link None}.
   *
   * ### Note
   * If `f` throws, {@link None} is returned.
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
   * ### Note
   * This method mutates the option.
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
  getOrInsert(x: T): T;
  /**
   * Returns the contained value if {@link Some}, or inserts and returns the
   * result of `f` if {@link None}.
   *
   * ## Throws
   * If `f` throws, rethrows {@link AnyError} with original error being set as
   * {@link AnyError.reason}.
   *
   * ### Note
   * This method mutates the option. If `f` throws, the option **remains unchanged**.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   * const z = none<number>();
   *
   * expect(x.getOrInsertWith(() => 5)).toBe(2);
   * expect(y.getOrInsertWith(() => 5)).toBe(5);
   * expect(y).toStrictEqual(some(5)); // y is mutated
   * expect(() => z.getOrInsertWith(() => { throw new Error() })).toThrow(AnyError);
   * ```
   */
  getOrInsertWith(f: () => T): T;
  /**
   * Inserts `x` into the option and returns it, overwriting any existing value.
   *
   * See also {@link getOrInsert} method, which doesn’t update the value if the
   * option already contains {@link Some}.
   *
   * ### Note
   * This method mutates the option.
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
  insert(x: T): T;
  /**
   * Calls `f` with the contained value if {@link Some}, then returns the original option.
   *
   * If `f` throws, the error is silently ignored.
   *
   * ### Note
   * Returns a new {@link Option} instance with the same value as the original, rather
   * than the exact same reference. The returned option is a distinct object, preserving
   * the original value.
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
   * ### Note
   * If `f` throws, `false` is returned.
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
   * ### Note
   * If `f` throws, `false` is returned.
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
   * ### Note
   * If `f` throws, {@link None} is returned.
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
  map<U>(f: (x: T) => U): Option<U>;
  /**
   * Returns `f` applied to the contained value if {@link Some}, otherwise returns `def`.
   *
   * ### Note
   * If `f` throws, the error is silently ignored and `def` is returned.
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
  mapOr<U>(def: U, f: (x: T) => U): U;
  /**
   * Returns `f` applied to the contained value if {@link Some}, otherwise
   * returns the result of `mkDef`.
   *
   * ## Throws
   * If `mkDef` is called and throws, rethrows {@link AnyError} with original error
   * being set as {@link AnyError.reason}.
   *
   * ### Note
   * If `f` throws, the error is silently ignored and result of `mkDef` is returned.
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
  mapOrElse<U>(mkDef: () => U, f: (x: T) => U): U;
  /**
   * Matches the option, returning `f` applied to the value if {@link Some}, or `g` if {@link None}.
   *
   * ## Throws
   * If either `f` or `g` throws, rethrows {@link AnyError} with original error
   * being set as {@link AnyError.reason}.
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
  match<U, F = U>(f: (x: T) => U, g: () => F): U | F;
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
  okOr<E>(y: E): Result<T, E>;
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
  // TODO(nikita.demin): think of how to handle the error if thrown (after result is done)
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
   * expect(x.or(Promise.resolve(some(3)))).toBeInstanceOf(PendingOption);
   * expect(await x.or(Promise.resolve(some(3)))).toStrictEqual(some(2));
   * expect(await y.or(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await y.or(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  or(x: Promise<Option<T>>): PendingOption<T>;
  /**
   * Returns the current option if {@link Some}, otherwise returns the result of `f`.
   *
   * ### Note
   * If `f` throws, {@link None} is returned.
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
   * Replaces the current value with `x` and returns the old option.
   *
   * ### Note
   * This method mutates the option.
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
   * Special case of {@link replace} for async `x`.
   *
   * Asynchronously replaces the current {@link Option} with the resolved value of `x`,
   * returning the original value and a {@link Promise} that triggers the replacement.
   *
   * Since `x` is a {@link Promise} that resolves asynchronously, this method defers the
   * update until `x` resolves. It:
   * 1. Captures the current {@link Option} (either {@link Some} or {@link None}).
   * 2. Returns a tuple where:
   *    - The first element is the original {@link Option} before any changes.
   *    - The second element is a {@link Promise} that, when awaited, mutates this
   *      {@link Option} to {@link Some} containing the resolved value of `x`.
   * 3. If `x` rejects, no mutation occurs, and the option remains unchanged.
   *
   * This is an asynchronous variant of {@link Option.replace}, designed for deferred
   * updates with pending values.
   *
   * ### Note
   * This method mutates the original {@link Option}, but the mutation is deferred until
   * the returned {@link Promise} resolves successfully. The option remains in its
   * original state until then.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * const xResult = x.replace(Promise.resolve(5));
   * const yResult = y.replace(Promise.resolve(3));
   *
   * // Check tuple structure
   * expect(xResult).toHaveLength(2);
   * expect(xResult[0]).toStrictEqual(some(2)); // Original value
   * expect(xResult[1]).toBeInstanceOf(Promise);
   * expect(x.isSome()).toBe(true); // x unchanged until promise resolves
   * await xResult[1]; // Trigger mutation
   * expect(x).toStrictEqual(some(5)); // x is now Some(5)
   *
   * expect(yResult).toHaveLength(2);
   * expect(yResult[0]).toStrictEqual(none()); // Original value
   * expect(yResult[1]).toBeInstanceOf(Promise);
   * expect(y.isNone()).toBe(true); // y unchanged until promise resolves
   * await yResult[1]; // Trigger mutation
   * expect(y).toStrictEqual(some(3)); // y is now Some(3)
   * ```
   */
  replace(x: Promise<T>): readonly [Option<T>, Promise<void>];
  /**
   * Takes the value out of the option, leaving {@link None} in its place.
   *
   * ### Note
   * This method mutates the option.
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
   * Takes the value if {@link Some} and `f` returns `true`, leaving {@link None} otherwise.
   *
   * ### Note
   * This method mutates the option.
   * If `f` throws, {@link None} is returned, and the original value **remains unchanged**.
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
   * Converts the option to a {@link PendingOption}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.toPendingOption()).toBeInstanceOf(PendingOption);
   * expect(await x.toPendingOption()).toStrictEqual(some(2));
   * expect(await y.toPendingOption()).toStrictEqual(none());
   * ```
   */
  toPendingOption(): PendingOption<T>;
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
   * {@link None} will be mapped to {@link Ok}({@link None}).
   * {@link Some}({@link Ok | Ok(_)}) and {@link Some}({@link Err | Err(_)})
   * will be mapped to {@link Ok}({@link Some | Some(_)}) and {@link Err | Err(_)}.
   *
   * ### Example
   * ```ts
   * const x = some(ok(2));
   * const y = some(err("error"));
   * const z = none<Result<number, string>>();
   *
   * expect(x.transposeResult()).toStrictEqual(ok(some(2)));
   * expect(y.transposeResult()).toStrictEqual(err("error"));
   * expect(z.transposeResult()).toStrictEqual(ok(none()));
   * ```
   */
  transposeResult<U, E>(this: Option<Result<U, E>>): Result<Option<U>, E>;
  /**
   * Transposes an {@link Option} of a {@link PromiseLike} into a
   * {@link PendingOption} of {@link Awaited}.
   *
   * ### Example
   * ```ts
   * const x: Option<Promise<Promise<string | number>>> = getOption();
   * const y: PendingOption<string | number> = x.transposeAwaitable();
   *
   * const a: Option<Promise<PendingOption<number>>> = getOption();
   * const b: PendingOption<Option<number>> = a.transposeAwaitable();
   * ```
   */
  transposeAwaitable<U>(
    this: Option<PromiseLike<U>>,
  ): PendingOption<Awaited<U>>;
  /**
   * Returns the contained value if {@link Some}, or throws {@link AnyError} if {@link None}.
   *
   * ## Throws
   * {@link AnyError} if value is {@link None}
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrap()).toBe(2);
   * expect(() => y.unwrap()).toThrow("`unwrap` is called on `None`");
   * ```
   */
  unwrap(): T;
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
  unwrapOr(def: T): T;
  /**
   * Returns the contained value if {@link Some}, or the result of `mkDef` if {@link None}.
   *
   * ## Throws
   * If `mkDef` throws, rethrows {@link AnyError} with original error being
   * set as {@link AnyError.reason}.
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
  unwrapOrElse(mkDef: () => T): T;
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
   * expect(x.xor(Promise.resolve(some(3)))).toBeInstanceOf(PendingOption);
   * expect(await x.xor(Promise.resolve(some(3)))).toStrictEqual(none());
   * expect(await x.xor(Promise.resolve(none()))).toStrictEqual(some(2));
   * expect(await y.xor(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * ```
   */
  xor(y: Promise<Option<T>>): PendingOption<T>;
}

/**
 * Interface defining the asynchronous implementation of an {@link Option}.
 *
 * Extends the synchronous {@link Option} functionality to handle pending states,
 * wrapping a {@link Promise} that resolves to an {@link Option}. Methods mirror
 * those of {@link Option}, adapted to return either a {@link PendingOption} or a
 * {@link Promise} for asynchronous operations.
 */
export interface PendingOption<T> extends PromiseLike<Option<T>> {
  /**
   * Returns a {@link PendingOption} with {@link None} if this option resolves to
   * {@link None}, otherwise returns a {@link PendingOption} with `x`.
   *
   * Accepts both synchronous and asynchronous `x`.
   *
   * Similar to the {@link Option.and}.
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
  and<U>(x: Option<U> | Promise<Option<U>>): PendingOption<U>;
  /**
   * Returns a {@link PendingOption} with {@link None} if this {@link Option} resolves
   * to {@link None}, otherwise applies `f` to the resolved value and returns the result.
   *
   * The function `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.andThen}.
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
  andThen<U>(f: (x: T) => Option<U> | Promise<Option<U>>): PendingOption<U>;
  /**
   * Creates a shallow copy of this {@link PendingOption}.
   *
   * Similar to {@link Option.clone}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.clone()).toStrictEqual(some(2));
   * expect(x.clone()).not.toBe(x); // Different instance
   * expect(await y.clone()).toStrictEqual(none());
   * ```
   */
  clone(): PendingOption<T>;
  /**
   * Returns {@link PendingOption} with {@link None} if this option resolves to {@link None},
   * otherwise calls `f` with the resolved value and returns a {@link PendingOption} with
   * the original value if `f` resolves to `true`, or {@link None} otherwise.
   *
   * The predicate `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.filter}.
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
   * Similar to {@link Option.flatten}.
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
  ): PendingOption<U>;
  /**
   * Calls `f` with the resolved value if this option is {@link Some}, then returns this
   * {@link PendingOption} unchanged. Useful for side effects.
   *
   * Similar to {@link Option.inspect}.
   *
   * ### Note
   * Returns a new {@link PendingOption} instance with the same value as the original,
   * rather than the exact same reference. The returned option is a distinct object,
   * preserving the original value.
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
   * Maps the resolved value with `f`, returning a {@link PendingOption} with the result
   * if this option is {@link Some}, or {@link None} otherwise.
   *
   * The function `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.map}.
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
  map<U>(f: (x: T) => U | Promise<U>): PendingOption<U>;
  /**
   * Matches the resolved option, returning `f` applied to the value if {@link Some},
   * or `g` if {@link None}. Returns a {@link Promise} with the result.
   *
   * Similar to {@link Option.match}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.match(n => n * 2, () => 0)).toBe(4);
   * expect(await y.match(n => n * 2, () => 0)).toBe(0);
   * ```
   */
  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<U | F>;
  /**
   * Converts to a {@link Promise} of a {@link Result}, using `y` as the error value if
   * this {@link PendingOption} resolves to {@link None}.
   *
   * Similar to {@link Option.okOr}, check it for more details.
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
  okOr<E>(y: E): Promise<Result<T, E>>;
  /**
   * Converts to a {@link Promise} of a {@link Result}, using the result of `mkErr` as
   * the error value if this {@link PendingOption} resolves to {@link None}.
   *
   * `mkErr` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.okOrElse}, check it for more details.
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
  okOrElse<E>(mkErr: () => E | Promise<E>): Promise<Result<T, E>>;
  /**
   * Returns this {@link PendingOption} if it resolves to {@link Some}, otherwise
   * returns a {@link PendingOption} with `x`.
   *
   * Accepts both synchronous and asynchronous `x`.
   *
   * Similar to {@link Option.or}.
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
   * The function `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.orElse}.
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
   * Replaces the underlying {@link Option} with `x`, returning a {@link PendingOption}
   * with the original {@link Option}.
   *
   * Accepts both synchronous and asynchronous `x`.
   *
   * Similar to {@link Option.replace}.
   *
   * ### Note
   * This method mutates the {@link PendingOption}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * const xReplaced = x.replace(5);
   * const yReplaced = x.replace(2);
   *
   * expect(await xReplaced).toStrictEqual(some(2));
   * expect(await x).toStrictEqual(some(5));
   * expect(await yReplaced).toStrictEqual(none());
   * expect(await y).toStrictEqual(some(2));
   * ```
   */
  replace(x: T | Promise<T>): PendingOption<T>;
  /**
   * Takes the resolved value out of this {@link PendingOption}, leaving it as
   * {@link PendingOption} with {@link None}.
   *
   * Similar to {@link Option.take}.
   *
   * ### Note
   * This method mutates the {@link PendingOption}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * const xTaken = x.take();
   * const yTaken = y.take();
   *
   * expect(await xTaken).toStrictEqual(some(2));
   * expect(await x).toStrictEqual(none());
   * expect(await yTaken).toStrictEqual(none());
   * expect(await y).toStrictEqual(none());
   * ```
   */
  take(): PendingOption<T>;
  /**
   * Takes the resolved value _only_ if this option is {@link Some} and `f`
   * resolves to `true`, leaving it as {@link PendingOption} with {@link None}.
   * If this option is {@link None} or `f` resolves to `false`, this {@link PendingOption}
   * remains unchanged.
   *
   * The predicate `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.takeIf}.
   *
   * ### Note
   * This method mutates the {@link PendingOption}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   * const z = pendingOption(some(0));
   *
   * const xTaken = x.takeIf(n => n > 0);
   * const yTaken = x.takeIf(n => Promise.resolve(n < 0));
   * const zTaken = z.takeIf(n => n > 0);
   *
   * expect(await xTaken).toStrictEqual(some(2));
   * expect(await x).toStrictEqual(none());
   * expect(await yTaken).toStrictEqual(none());
   * expect(await y.takeIf(n => true)).toStrictEqual(none());
   * expect(await x).toStrictEqual(none());
   * expect(await zTaken).toStrictEqual(none());
   * expect(await z).toStrictEqual(some(0));
   * ```
   */
  takeIf(f: (x: T) => boolean | Promise<boolean>): PendingOption<T>;
  /**
   * Returns a string representation of this {@link PendingOption}'s current state.
   *
   * Similar to {@link Option.toString}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(x.toString()).toBe("PendingOption { promise }"); // Before resolution
   * expect(await x.then(opt => opt.toString())).toBe("Some { 2 }");
   * expect(await y.then(opt => opt.toString())).toBe("None");
   * ```
   */
  toString(): string;
  /**
   * Transposes a {@link PendingOption} of a {@link Result} into a {@link Promise} of a
   * {@link Result} containing a {@link PendingOption}. Resolves to {@link Ok}({@link None})
   * if this option is {@link None}, or propagates the error if the result is {@link Err}.
   *
   * Similar to {@link Option.transposeResult}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(ok(2)));
   * const y = pendingOption(some(err("error")));
   * const z = pendingOption(none<Result<number, string>>());
   *
   * expect(await x.transposeResult()).toStrictEqual(ok(some(2)));
   * expect(await y.transposeResult()).toStrictEqual(err("error"));
   * expect(await z.transposeResult()).toStrictEqual(ok(none()));
   * ```
   */
  transposeResult<U, E>(
    this: PendingOption<Result<U, E>>,
  ): Promise<Result<Option<U>, E>>;
  /**
   * Transposes a {@link PendingOption} of an {@link PromiseLike} into a {@link PendingOption}
   * with the fully awaited value.
   *
   * Similar to {@link Option.transposeAwaitable}.
   *
   * ### Example
   * ```ts
   * const x: PendingOption<Promise<Promise<number>>> = getPendingOption();
   * const y: PendingOption<number> = x.transposeAwaitable();
   *
   * const a: PendingOption<Promise<Promise<PendingOption<number>>>> = getPendingOption();
   * const b: PendingOption<Option<number>> = a.transposeAwaitable();
   * ```
   */
  transposeAwaitable<U>(
    this: PendingOption<PromiseLike<U>>,
  ): PendingOption<Awaited<U>>;
  /**
   * Returns a {@link PendingOption} with {@link Some} if exactly one of this option or
   * `y` resolves to {@link Some}, otherwise returns a {@link PendingOption} with
   * {@link None}.
   *
   * Accepts both synchronous and asynchronous `y`.
   *
   * Similar to {@link Option.xor}.
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
 * A private symbol-keyed property used as a type discriminant.
 *
 * This field holds either `"some"` or `"none"` to indicate whether the
 * {@link Option} is a {@link Some} or {@link None} variant. It is not
 * intended for direct access or modification by users; instead, it serves as
 * an internal mechanism to enable TypeScript's type narrowing for methods
 * like {@link isSome} and {@link isNone}. The symbol key (`phantom`) ensures
 * this property remains private to the module, preventing external
 * interference while allowing the class to mutate its state (e.g., from
 * `None` to `Some`) as needed.
 */
// TODO(nikita.demin): check that this symbol cannot be accessed by the package users
export const phantom: unique symbol = Symbol("OptionPhantom");
