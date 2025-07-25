/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Option, Some, None, PendingOption } from "../option";
import type { Cloneable, Recoverable } from "../types";
import type { ResultError } from "./error";
import type { OkAwaitedValues, OkValues } from "./types";
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Represents a successful outcome of a {@link Result}, holding a value
 * of type `T`.
 */
export type Ok<T, E> = Resultant<T, E> & { readonly value: T };

/**
 * Represents a failed outcome of a {@link Result}, holding a {@link CheckedError}
 * of type `E`.
 *
 * This type ensures errors are checked, distinguishing between expected errors
 * of type `E` and unexpected runtime failures wrapped in {@link ResultError}.
 */
export type Err<T, E> = Resultant<T, E> & { readonly error: CheckedError<E> };

/**
 * A type representing the outcome of an operation, either a success
 * ({@link Ok}) or a checked failure ({@link Err}).
 *
 * Inspired by Rust’s
 * {@link https://doc.rust-lang.org/std/result/enum.Result.html | Result}, this
 * type provides a type-safe way to handle computations that may succeed with
 * a value of type `T` or fail with a checked error of type `E`, distinguishing
 * expected and unexpected failures via {@link CheckedError}.
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

/**
 * A {@link Result} type where both the value (`T`) and error (`E`) types have
 * been resolved from potential `PromiseLike` types to their awaited forms.
 */
export type SettledResult<T, E> =
  | Ok<Awaited<T>, Awaited<E>>
  | Err<Awaited<T>, Awaited<E>>;

/**
 * Represents an expected error of type `E` within a {@link CheckedError}.
 */
export type ExpectedError<E> = EitherError<E> & {
  /**
   * The expected error value of type `E`.
   */
  readonly expected: E;
  /**
   * Always `undefined`
   */
  readonly unexpected: undefined;
  /**
   * Retrieves the contained error value, either an expected error of type `E` or
   * an unexpected {@link ResultError}.
   */
  get(): E;
};

/**
 * Represents an unexpected error of type {@link ResultError} within a
 * {@link CheckedError}.
 */
export type UnexpectedError<E> = EitherError<E> & {
  /**
   * Always `undefined`.
   */
  readonly expected: undefined;
  /**
   * The unexpected error value of type {@link ResultError}.
   */
  readonly unexpected: ResultError;
  /**
   * Retrieves the contained error value, either an expected error of type `E` or
   * an unexpected {@link ResultError}.
   */
  get(): ResultError;
};

/**
 * A type representing the error state of a {@link Result}, containing either
 * an expected error of type `E` or an unexpected {@link ResultError}.
 *
 * This type ensures exactly one error is present: either an expected error
 * (an anticipated failure of type `E`) or an unexpected error (a runtime or
 * exceptional failure). Use {@link EitherError.isExpected | isExpected} or
 * {@link EitherError.isUnexpected | isUnexpected} to narrow the type if needed.
 */
export type CheckedError<E> = ExpectedError<E> | UnexpectedError<E>;

/**
 * Base interface for {@link CheckedError} instances, providing methods to inspect
 * and handle the contained error.
 */
export interface EitherError<E> extends Error {
  /**
   * Applies one of two functions to the contained error based on its type.
   *
   * Applies the first function in case the inner error is unexpected
   * {@link ResultError}, or the second function if the inner error is
   * expected `E`.
   */
  handle<T>(f: (e: ResultError) => T, g: (e: E) => T): T;

  /**
   * Checks if this is an expected error, narrowing to {@link ExpectedError}.
   */
  isExpected(): this is ExpectedError<E>;

  /**
   * Checks if this is an unexpected error, narrowing to {@link UnexpectedError}.
   */
  isUnexpected(): this is UnexpectedError<E>;
}

/**
 * Interface representing the resultant state of an operation, either a success
 * ({@link Ok | Ok\<T>}) or an error ({@link Err | Err\<E>}).
 *
 * Inspired by Rust’s {@link https://doc.rust-lang.org/std/result/enum.Result.html | Result},
 * it provides a type-safe alternative to exceptions for handling success or
 * failure outcomes.
 */
export interface Resultant<T, E> {
  /**
   * Returns `x` if this result is {@link Ok}, otherwise returns the {@link Err}
   * value of self.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(1);
   * const y = ok<number, string>(2);
   * const z = err<number, string>("failure");
   *
   * expect(x.and(y)).toStrictEqual(ok(2));
   * expect(x.and(z)).toStrictEqual(err("failure"));
   * expect(z.and(x)).toStrictEqual(err("failure"));
   * ```
   */
  and<U>(x: Result<U, E>): Result<U, E>;

  /**
   * Applies `f` to the value if this result is {@link Ok} and returns its result,
   * otherwise returns the {@link Err} value of self.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.andThen(n => ok(n * 2))).toStrictEqual(ok(4));
   * expect(y.andThen(n => ok(n * 2))).toStrictEqual(err("failure"));
   * ```
   */
  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E>;

  /**
   * Inspects this result’s state, returning a tuple indicating success and either the value or error.
   *
   * @notes
   * - Returns `[true, T]` if this is an {@link Ok}, or `[false, CheckedError<E>]`
   *   if this is an {@link Err}.
   * - Never throws, providing a safe way to access the result’s state without
   *   unwrapping.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   *
   * expect(x.check()).toEqual([true, 42]);
   * expect(y.check()).toEqual([false, expect.objectContaining({ expected: "failure" })]);
   * ```
   */
  check(
    this: SettledResult<T, E>,
  ): this extends Ok<T, E>
    ? readonly [true, T]
    : readonly [false, CheckedError<E>];

  /**
   * Returns a clone of the {@link Result}.
   *
   * Only available on {@link Result}s with {@link Cloneable} value and error.
   *
   * @example
   * ```ts
   * const x = ok(1);
   * const y = ok({ a: 1, clone: () => ({ a: 0 }) });
   *
   * expect(x.clone()).toStrictEqual(ok(1));
   * expect(x.clone()).not.toBe(x); // Different reference
   * expect(x.clone().unwrap()).toBe(1);
   * expect(y.clone()).toStrictEqual(ok({ a: 0 }));
   * ```
   */
  clone<U, F>(this: Result<Cloneable<U>, Cloneable<F>>): Result<U, F>;

  /**
   * Combines this {@link Result} with other `Result` instances into a single
   * `Result` containing a tuple of values.
   *
   * The `combine` method takes an arbitrary number of `Result` instances,
   * all sharing the same {@link Err} type. If all `Result` instances
   * (including this one) are {@link Ok}, it returns a `Result` with a tuple of
   * their `Ok` values in the order provided. If any `Result` is `Err`, it returns
   * that `Err`. The resulting tuple includes the value of this `Result` as the first
   * element, followed by the values from the provided `Result` instances.
   *
   * @example
   * ```ts
   * const a = ok<Promise<number>, string>(Promise.resolve(1));
   * const b = ok<string, string>("hi");
   * const c = err<Date, string>("no");
   * const d = a.combine(b, c); // Result<[Promise<number>, string, Date], string>
   * ```
   */
  combine<U extends Result<unknown, E>[]>(
    ...results: U
  ): Result<[T, ...OkValues<U>], E>;

  /**
   * Returns a **shallow** copy of the {@link Result}.
   *
   * @example
   * ```ts
   * const value = { a: 1 };
   * const x = ok<{ a: number }, string>(value);
   *
   * expect(x.copy()).toStrictEqual(ok({ a: 1 }));
   * expect(x.copy()).not.toBe(x); // Different result reference
   * expect(x.copy().unwrap()).toBe(value); // Same value reference
   * ```
   */
  copy(): Result<T, E>;

  /**
   * Converts this {@link Result} to an {@link Option | Option\<E>} containing
   * the error, if present.
   *
   * Returns {@link Some} with the error value if this is an {@link Err}, or
   * {@link None} if this is an {@link Ok}.
   *
   * @notes
   * - Extracts the error from {@link CheckedError} if it’s an {@link ExpectedError};
   *   returns {@link None} for {@link UnexpectedError}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(1);
   * const y = err<number, string>("failure");
   *
   * expect(x.err()).toStrictEqual(none());
   * expect(y.err()).toStrictEqual(some("failure"));
   * ```
   */
  err(this: SettledResult<T, E>): Option<E>;

  /**
   * Retrieves the value if this result is an {@link Ok}, or throws a
   * {@link ResultError} with an optional message if it’s an {@link Err}.
   *
   * @throws
   * - {@link ResultError} if this result is an {@link Err}
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   *
   * expect(x.expect("Failed!")).toBe(42);
   * expect(() => y.expect("Failed!")).toThrow(ResultError);
   * ```
   */
  expect(this: SettledResult<T, E>, msg?: string): T;

  /**
   * Retrieves the error if this result is an {@link Err}, or throws a
   * {@link ResultError} with an optional message if it’s an {@link Ok}.
   *
   * @throws
   * - {@link ResultError} if this result is an {@link Ok}
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   *
   * expect(() => x.expectErr("Failed!")).toThrow(ResultError);
   * expect(isCheckedError(y.expectErr("Failed!"))).toBe(true);
   * expect(y.expectErr("Failed!").expected).toBe("failure");
   * ```
   */
  expectErr(this: SettledResult<T, E>, msg?: string): CheckedError<E>;

  /**
   * Flattens a nested result (`Result<Result<T, E>, E>`) into a single result
   * (`Result<T, E>`).
   *
   * @example
   * ```ts
   * const x: Result<Result<Result<number, string>, string>, string> = ok(ok(ok(6)));
   * const y: Result<Result<number, string>, string> = x.flatten();
   * const z: Result<Result<number, string>, string> = err("oops");
   *
   * expect(x.flatten()).toStrictEqual(ok(ok(6)));
   * expect(y.flatten()).toStrictEqual(ok(6));
   * expect(z.flatten().expected).toBe("oops");
   * ```
   */
  flatten<U, F>(this: Result<Result<U, F>, F>): Result<U, F>;

  /**
   * Calls `f` with the value if this result is an {@link Ok}, then returns
   * a copy of this result.
   *
   * @notes
   * - Returns a new {@link Result} instance, not the original reference.
   * - If `f` throws or returns a `Promise` that rejects, the error is ignored.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   * let sideEffect = 0;
   *
   * expect(x.inspect(n => (sideEffect = n))).toStrictEqual(ok(2));
   * expect(x.inspect(_ => { throw new Error() })).toStrictEqual(ok(2));
   * expect(sideEffect).toBe(2);
   * expect(y.inspect(n => (sideEffect = n))).toStrictEqual(err("failure"));
   * expect(sideEffect).toBe(2); // Unchanged
   * ```
   */
  inspect(f: (x: T) => unknown): Result<T, E>;

  /**
   * Calls `f` with the error if this result is an {@link Err}, then returns
   * a copy of this result.
   *
   * @notes
   * - Returns a new {@link Result} instance, not the original reference.
   * - If `f` throws or returns a `Promise` that rejects, the error is ignored.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   * let sideEffect = 0;
   *
   * expect(x.inspect(n => (sideEffect = n))).toStrictEqual(ok(2));
   * expect(x.inspect(_ => { throw new Error() })).toStrictEqual(ok(2));
   * expect(sideEffect).toBe(0);
   * expect(y.inspect(n => (sideEffect = n))).toStrictEqual(err("failure"));
   * expect(y.inspect(_ => { throw new Error() })).toStrictEqual(err("failure"));
   * expect(sideEffect).toBe(2);
   * ```
   */
  inspectErr(f: (x: CheckedError<E>) => unknown): Result<T, E>;

  /**
   * Checks if this result is an {@link Err}, narrowing its type to
   * {@link Err} if true.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.isErr()).toBe(false);
   * expect(y.isErr()).toBe(true);
   * ```
   */
  isErr(): this is Err<T, E>;

  /**
   * Returns `true` if the result is {@link Err} and `f` returns `true`
   * for the contained error.
   *
   * @notes
   * - *Default*: If `f` throws, `false` is returned.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.isErrAnd(e => e.expected === "failure")).toBe(false);
   * expect(y.isErrAnd(e => e.expected === "failure")).toBe(true);
   * expect(y.isErrAnd(e => Boolean(e.unexpected))).toBe(false);
   * ```
   */
  isErrAnd(f: (x: CheckedError<E>) => boolean): this is Err<T, E> & boolean;

  /**
   * Checks if this result is an {@link Ok}, narrowing its type to
   * {@link Ok} if true.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.isOk()).toBe(true);
   * expect(y.isOk()).toBe(false);
   * ```
   */
  isOk(): this is Ok<T, E>;

  /**
   * Returns `true` if the result is {@link Ok} and `f` returns `true`
   * for the contained value.
   *
   * @notes
   * - *Default*: If `f` throws, `false` is returned.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.isOkAnd(n => n > 0)).toBe(true);
   * expect(x.isOkAnd(n => n < 0)).toBe(false);
   * expect(y.isOkAnd(_ => true)).toBe(false);
   * ```
   */
  isOkAnd(f: (x: T) => boolean): this is Ok<T, E> & boolean;

  /**
   * Returns an iterator over this result’s value, yielding it if {@link Ok}
   * or nothing if {@link Err}.
   *
   * @notes
   * - Yields exactly one item for {@link Ok}, or zero items for {@link Err}.
   * - Compatible with `for...of` loops and spread operators.
   * - Ignores the error value in {@link Err} cases, focusing only on the success case.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
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
   * Transforms this result by applying `f` to the value if it’s an {@link Ok},
   * or preserves the {@link Err} unchanged.
   *
   * @notes
   * - If `f` throws, returns an {@link Err} with an {@link UnexpectedError}
   *   containing the original error.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.map(n => n * 2)).toStrictEqual(ok(4));
   * expect(x.map(() => { throw new Error("boom") }).unwrapErr().unexpected).toBeDefined();
   * expect(y.map(n => n * 2)).toStrictEqual(err("failure"));
   * ```
   */
  map<U>(f: (x: T) => Awaited<U>): Result<U, E>;

  /**
   * Maps this result by applying a callback to its full state, executing the
   * callback for both {@link Ok} and {@link Err}, returning a new {@link Result}.
   *
   * Unlike {@link Resultant.andThen | andThen}, which only invokes the callback
   * for {@link Ok}, this method always calls `f`, passing the entire {@link Result}
   * as its argument.
   *
   * @notes
   * - If `f` throws an {@link Err} with an {@link UnexpectedError} is returned.
   *
   * @example
   * ```ts
   * const okRes = ok<number, string>(42);
   * const errRes = err<number, string>("failure");
   *
   * expect(okRes.mapAll(res => ok(res.unwrapOr(0) + 1))).toStrictEqual(ok(43));
   * expect(errRes.mapAll(res => ok(res.unwrapOr(0) + 1))).toStrictEqual(ok(1));
   * expect(okRes.mapAll(res => res.isOk() ? ok("success") : err("fail"))).toStrictEqual(ok("success"));
   * expect(errRes.mapAll(() => { throw new Error("boom") }).unwrapErr().unexpected).toBeDefined();
   * ```
   */
  mapAll<U, F>(f: (x: Result<T, E>) => Result<U, F>): Result<U, F>;
  /**
   * Maps this result by applying a callback to its full state, executing the
   * callback for both {@link Ok} and {@link Err}, returning a new
   * {@link PendingResult}.
   *
   * Unlike {@link Resultant.andThen | andThen}, which only invokes the callback
   * for {@link Ok}, this method always calls `f`, passing the entire
   * {@link Result} as its argument.
   *
   * @notes
   * - If `f` returns a `Promise` that rejects, the resulting {@link PendingResult}
   *   resolves to an {@link Err} with an {@link UnexpectedError}.
   *
   * @example
   * ```ts
   * const okRes = ok<number, string>(42);
   * const errRes = err<number, string>("failure");
   *
   * const mappedOk = okRes.mapAll(res => Promise.resolve(ok(res.unwrapOr(0) + 1)));
   * expect(await mappedOk).toStrictEqual(ok(43));
   *
   * const mappedErr = errRes.mapAll(res => Promise.resolve(ok(res.unwrapOr(0) + 1)));
   * expect(await mappedErr).toStrictEqual(ok(1));
   *
   * const mappedCheck = okRes.mapAll(res => Promise.resolve(res.isOk() ? ok("success") : err("fail")));
   * expect(await mappedCheck).toStrictEqual(ok("success"));
   *
   * const mappedThrow = errRes.mapAll(() => Promise.reject(new Error("boom")));
   * expect((await mappedThrow).unwrapErr().unexpected).toBeDefined();
   * ```
   */
  mapAll<U, F>(
    f: (x: Result<T, E>) => Promise<Result<U, F>>,
  ): PendingResult<Awaited<U>, Awaited<F>>;

  /**
   * Transforms this result by applying `f` to the error if it’s an {@link Err}
   * with an expected error, or preserves the result unchanged.
   *
   * @notes
   * - If `f` throws, returns an {@link Err} with an {@link UnexpectedError}
   *   containing the original error.
   * - If this is an {@link Err} with an {@link UnexpectedError}, `f` is not called,
   *   and the original error is preserved.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.mapErr(e => e.length)).toStrictEqual(ok(2));
   * expect(y.mapErr(e => e.length)).toStrictEqual(err(7));
   * expect(y.mapErr(() => { throw new Error("boom") }).unwrapErr().unexpected).toBeDefined();
   * ```
   */
  mapErr<F>(f: (e: E) => Awaited<F>): Result<T, F>;

  /**
   * Returns `f` applied to the value if {@link Ok}, otherwise returns `def`.
   *
   * @notes
   * - *Default*: If `f` throws, returns `def`.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.mapOr(0, n => n * 2)).toBe(4);
   * expect(x.mapOr(0, () => { throw new Error("boom"); })).toBe(0);
   * expect(y.mapOr(0, n => n * 2)).toBe(0);
   * ```
   */
  mapOr<U>(
    this: SettledResult<T, E>,
    def: Awaited<U>,
    f: (x: T) => Awaited<U>,
  ): U;

  /**
   * Returns `f` applied to the contained value if {@link Ok}, otherwise
   * returns the result of `mkDef`.
   *
   * @throws
   * - {@link ResultError} if `mkDef` is called and throws an exception, with
   *   the original error set as {@link ResultError.reason}.
   *
   * @notes
   * - If `f` throws, the error is silently ignored, and the result of `mkDef`
   *   is returned.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.mapOrElse(() => 0, n => n * 2)).toBe(4);
   * expect(x.mapOrElse(() => 1, () => { throw new Error("boom") })).toBe(1);
   * expect(() => y.mapOrElse(() => { throw new Error("boom") }, n => n * 2)).toThrow(ResultError);
   * expect(y.mapOrElse(() => 0, n => n * 2)).toBe(0);
   * ```
   */
  mapOrElse<U>(
    this: SettledResult<T, E>,
    mkDef: () => Awaited<U>,
    f: (x: T) => Awaited<U>,
  ): U;

  /**
   * Matches this result, returning `f` applied to the value if {@link Ok},
   * or `g` applied to the {@link CheckedError} if {@link Err}.
   *
   * @throws
   * - {@link ResultError} if `f` or `g` throws an exception, with the original
   *   error set as {@link ResultError.reason}.
   *
   * @notes
   * - If `f` or `g` return a `Promise` that rejects, the caller is responsible
   *   for handling the rejection.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.match(n => n * 2, () => 0)).toBe(4);
   * expect(() => x.match(_ => { throw new Error() }, () => 0)).toThrow(ResultError);
   * expect(y.match(n => n * 2, e => e.expected?.length)).toBe(7);
   * expect(() => y.match(n => n * 2, () => { throw new Error() })).toThrow(ResultError);
   * ```
   */
  match<U, F = U>(
    this: SettledResult<T, E>,
    f: (x: T) => Awaited<U>,
    g: (e: CheckedError<E>) => Awaited<F>,
  ): U | F;

  /**
   * Converts this result to an {@link Option}, discarding the error if present.
   *
   * Maps {@link Ok | Ok(v)} to {@link Some | Some(v)} and {@link Err | Err(e)}
   * to {@link None}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.ok()).toStrictEqual(some(2));
   * expect(y.ok()).toStrictEqual(none());
   * ```
   */
  ok(): Option<T>;

  /**
   * Returns the current result if it is {@link Ok}, otherwise returns `x`.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.or(ok(3))).toStrictEqual(ok(2));
   * expect(x.or(err("failure"))).toStrictEqual(ok(2));
   * expect(y.or(ok(3))).toStrictEqual(ok(3));
   * expect(y.or(err("another one"))).toStrictEqual(err("another one"));
   * ```
   */
  or<F>(x: Result<T, F>): Result<T, F>;

  /**
   * Returns the current result if {@link Ok}, otherwise returns the result of `f`.
   *
   * @notes
   * - If `f` throws, returns an {@link Err} with an {@link UnexpectedError}
   *   containing the original error.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.orElse(() => ok(3))).toStrictEqual(ok(2));
   * expect(y.orElse(() => ok(3))).toStrictEqual(ok(3));
   * expect(y.orElse(() => { throw new Error("boom") }).unwrapErr().unexpected).toBeDefined();
   * expect(y.orElse(() => err("another one"))).toStrictEqual(err("another one"));
   * ```
   */
  orElse<F>(f: () => Result<T, F>): Result<T, F>;

  /**
   * Executes `f` with a copy of this result, then returns a new copy unchanged.
   *
   * Useful for side-effects like logging, works with both {@link Ok} and {@link Err}.
   *
   * @notes
   * - If `f` throws or rejects, the error is silently ignored.
   * - If `f` returns a promise, the promise is not awaited before returning.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   * let log = "";
   *
   * expect(x.tap(res => (log = res.toString()))).toStrictEqual(ok(42));
   * expect(log).toBe("Ok { 42 }");
   * expect(y.tap(res => (log = res.toString()))).toStrictEqual(err("failure"));
   * expect(log).toBe("Err { 'failure' }");
   * ```
   */
  tap(f: (x: Result<T, E>) => unknown): Result<T, E>;

  /**
   * Converts this result to a {@link PendingResult} using a shallow
   * {@link Resultant.copy | copy} of its current state.
   *
   * @notes
   * - Useful for transposing a result with a `PromiseLike` value to
   *   a {@link PendingResult} with an `Awaited` value.
   *
   * @example
   * ```ts
   * const value = { a: 1 };
   * const x = ok<{ a: number }, string>(value);
   * const pendingX = x.toPending();
   *
   * expect(isPendingResult(pendingX)).toBe(true);
   * expect(await pendingX).toStrictEqual(ok({ a: 1 }));
   * value.a = 2;
   * expect(await pendingX).toStrictEqual(ok({ a: 2 }));
   * ```
   */
  toPending(): PendingResult<Awaited<T>, Awaited<E>>;

  /**
   * Converts this result to a {@link PendingResult} using a deep
   * {@link Resultant.clone | clone} of its current state.
   *
   * @notes
   * - Useful for transposing a result with a `PromiseLike` value to
   *   a {@link PendingResult} with an `Awaited` value, preserving independence
   *   from the original data.
   * - If inner `T` or `E` is a promise-like that rejects, maps to a {@link PendingResult}
   *   that resolves to {@link Err} with {@link UnexpectedError}.
   *
   * @example
   * ```ts
   * const value = { a: 1, clone: () => ({ a: 0 }) };
   * const x = ok(value);
   * const pendingX = x.toPendingCloned();
   *
   * expect(isPendingResult(pendingX)).toBe(true);
   * expect((await pendingX).unwrap()).toStrictEqual({ a: 0 });
   * value.a = 42;
   * expect((await pendingX).unwrap()).toStrictEqual({ a: 0 });
   * ```
   */
  toPendingCloned(
    this: Result<Cloneable<T>, Cloneable<E>>,
  ): PendingResult<Awaited<T>, Awaited<E>>;

  /**
   * Generates a string representation of this result,
   * reflecting its current state.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("error");
   *
   * expect(x.toString()).toBe("Ok { 2 }");
   * expect(y.toString()).toBe("Err { 'error' }");
   * ```
   */
  toString(): string;

  /**
   * Transposes a {@link Result} of an {@link Option} into an {@link Option}
   * of a {@link Result}.
   *
   * Maps `Ok(None)` to `None`, `Ok(Some(_))` to `Some(Ok(_))` and
   * `Err(_)` to `Some(Err(_))`.
   *
   * @example
   * ```ts
   * const x = ok<Option<number>, string>(none());
   * const y = ok<Option<number>, string>(some(2));
   * const z = err<Option<number>, string>("error");
   *
   * expect(x.transpose()).toStrictEqual(none());
   * expect(y.transpose()).toStrictEqual(some(ok(2)));
   * expect(z.transpose()).toStrictEqual(some(err("error")));
   * ```
   */
  transpose<U, F>(this: Result<Option<U>, F>): Option<Result<U, F>>;

  /**
   * Extracts this result’s state, returning a tuple with a success flag, error,
   * and value.
   *
   * Inspired by the {@link https://github.com/arthurfiorette/proposal-try-operator Try Operator}
   * proposal.
   *
   * @notes
   * - Returns `[true, undefined, T]` if this is an {@link Ok}, or
   *   `[false, CheckedError<E>, undefined]` if this is an {@link Err}.
   * - Never throws, offering a safe way to inspect the result’s state with
   *   explicit success indication.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   *
   * expect(x.try()).toEqual([true, undefined, 42]);
   * expect(y.try()).toEqual([false, expect.objectContaining({ expected: "failure" }), undefined]);
   * ```
   */
  try(
    this: SettledResult<T, E>,
  ): this extends Ok<T, E>
    ? readonly [true, undefined, T]
    : readonly [false, CheckedError<E>, undefined];

  /**
   * Retrieves the value if this result is an {@link Ok}, or throws
   * a {@link ResultError} if it’s an {@link Err}.
   *
   * @throws
   * - {@link ResultError} if this result is an {@link Err}
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   *
   * expect(x.unwrap()).toBe(42);
   * expect(() => y.unwrap()).toThrow(ResultError);
   * ```
   */
  unwrap(this: SettledResult<T, E>): T;

  /**
   * Retrieves the {@link CheckedError} if this result is an {@link Err}, or
   * throws a {@link ResultError} if it’s an {@link Ok}.
   *
   * @throws
   * - {@link ResultError} if this result is an {@link Ok}
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   *
   * expect(() => x.unwrapErr()).toThrow(ResultError);
   * expect(y.unwrapErr().expected).toBe("failure");
   * ```
   */
  unwrapErr(this: SettledResult<T, E>): CheckedError<E>;

  /**
   * Returns the contained value if {@link Ok}, or `def` if {@link Err}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.unwrapOr(0)).toBe(2);
   * expect(y.unwrapOr(0)).toBe(0);
   * ```
   */
  unwrapOr(this: SettledResult<T, E>, def: Awaited<T>): T;

  /**
   * Returns the contained value if {@link Ok}, or the result of `mkDef`
   * if {@link Err}.
   *
   * @throws
   * - {@link ResultError} if `mkDef` throws, with the original error set as
   *   {@link ResultError.reason}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.unwrapOrElse(() => 0)).toBe(2);
   * expect(y.unwrapOrElse(() => 0)).toBe(0);
   * expect(() => y.unwrapOrElse(() => { throw new Error("boom") })).toThrow(ResultError);
   * ```
   */
  unwrapOrElse(this: SettledResult<T, E>, mkDef: () => Awaited<T>): T;
}

/**
 * Interface defining an asynchronous {@link Result} that wraps a `Promise`
 * resolving to a {@link Result}.
 *
 * Extends {@link Result} functionality for pending states, with methods mirroring
 * their synchronous counterparts but returning {@link PendingResult} or `Promise`
 * for async operations. Rejections typically resolve to {@link Err} unless otherwise
 * specified.
 */
export interface PendingResult<T, E>
  extends PromiseLike<Result<T, E>>,
    Recoverable<Result<T, E>> {
  /**
   * Returns a {@link PendingResult} that resolves to {@link Err} if this result
   * resolves to {@link Err}, otherwise returns a {@link PendingResult} with `x`.
   *
   * This is the asynchronous version of {@link Resultant.and | and}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(1).toPending();
   * const y = ok<number, string>(2);
   * const z = err<number, string>("failure").toPending();
   *
   * expect(await x.and(y)).toStrictEqual(ok(2));
   * expect(await x.and(z)).toStrictEqual(err("failure"));
   * expect(await z.and(x)).toStrictEqual(err("failure"));
   * ```
   */
  and<U>(
    x: Result<U, E> | PendingResult<U, E> | Promise<Result<U, E>>,
  ): PendingResult<Awaited<U>, Awaited<E>>;

  /**
   * Returns a {@link PendingResult} that resolves to {@link Err} if this result
   * resolves to {@link Err}, otherwise applies `f` to the resolved {@link Ok}
   * value and returns its result.
   *
   * This is the asynchronous version of {@link Resultant.andThen | andThen}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.andThen(n => ok(n * 2))).toStrictEqual(ok(4));
   * expect(await x.andThen(_ => err("oops"))).toStrictEqual(err("oops"));
   * expect(await y.andThen(_ => err("oops"))).toStrictEqual(err("failure"));
   * ```
   */
  andThen<U>(
    f: (x: T) => Result<U, E> | PendingResult<U, E> | Promise<Result<U, E>>,
  ): PendingResult<Awaited<U>, Awaited<E>>;

  /**
   * Inspects this {@link PendingResult}’s state, returning a promise of
   * a tuple with a success flag and either the value or error.
   *
   * This is the asynchronous version of {@link Resultant.check | check}.
   *
   * @notes
   * - Resolves to `[true, Awaited<T>]` if this is an {@link Ok}, or to
   *   `[false, CheckedError<Awaited<E>>]` if this is an {@link Err}.
   * - Never rejects, providing a safe way to await the result’s state.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.check()).toEqual([true, 42]);
   * expect(await y.check()).toEqual([false, expect.objectContaining({ expected: "failure" })]);
   * ```
   */
  check(): Promise<readonly [boolean, Awaited<T> | CheckedError<Awaited<E>>]>;

  /**
   * Combines this {@link PendingResult} with other {@link Result} or `PendingResult`
   * instances into a single `PendingResult` containing a tuple of resolved values.
   *
   * The `combine` method takes an arbitrary number of `Result` or `PendingResult`
   * instances. It resolves all inputs and returns a `PendingResult` that, when
   * resolved, contains a `Result` with a tuple of their {@link Ok} values if all
   * resolve to `Ok`. If any input resolves to {@link Err}, the result resolves to
   * that `Err`. The resulting tuple includes the resolved value of this `PendingResult`
   * as the first element, followed by the resolved values from the provided instances.
   *
   * @example
   * ```ts
   * const a = pendingOk<number, Error>(1);
   * const b = ok<Promise<string>, Error>(Promise.resolve("hi"));
   * const c = err<symbol, Error>(new Error("An error occurred"));
   * const d = pendingErr<Promise<Date>, Error>(new Error("not a date"));
   * const e = a.combine(b, c, d); // PendingResult<[number, string, symbol, Date], Error>
   * ```
   */
  combine<U extends (Result<unknown, E> | PendingResult<unknown, E>)[]>(
    ...opts: U
  ): PendingResult<[Awaited<T>, ...OkAwaitedValues<U>], E>;

  /**
   * Converts this {@link PendingResult} to a {@link PendingOption | PendingOption\<E>}
   * containing the awaited error, if present.
   *
   * Returns a {@link PendingOption} that resolves to {@link Some} with the error
   * value if this resolves to an {@link Err} with {@link ExpectedError},
   * or to {@link None} if this resolves to an {@link Ok} or {@link Err} with
   * {@link UnexpectedError}.
   *
   * This is the asynchronous version of {@link Resultant.err | err}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(1).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.err()).toStrictEqual(none());
   * expect(await y.err()).toStrictEqual(some("failure"));
   * ```
   */
  err(): PendingOption<Awaited<E>>;

  /**
   * Flattens a nested {@link PendingResult} into a single pending result,
   * resolving any inner {@link Result} or {@link PendingResult} to its final state.
   *
   * This is the asynchronous version of {@link Resultant.flatten | flatten}.
   *
   * @notes
   * - Handles cases like `PendingResult<Result<T, E>, E>` or
   *   `PendingResult<PendingResult<T, E>, E>`, resolving to
   *   `PendingResult<Awaited<T>, Awaited<E>>`.
   *
   * @example
   * ```ts
   * const x = ok(ok(6)).toPending();
   * const y = ok(err<number, string>("oops")).toPending();
   *
   * expect(await x.flatten()).toStrictEqual(ok(6));
   * expect(await y.flatten()).toStrictEqual(err("oops"));
   * ```
   */
  flatten<U, F>(
    this:
      | PendingResult<Result<U, F>, F>
      | PendingResult<PendingResult<U, F>, F>
      | PendingResult<PromiseLike<Result<U, F>>, F>,
  ): PendingResult<Awaited<U>, Awaited<F>>;

  /**
   * Calls `f` with the value if this pending result resolves to an {@link Ok},
   * then returns a new pending result with the original state.
   *
   * This is the asynchronous version of {@link Resultant.inspect | inspect}.
   *
   * @notes
   * - Returns a new {@link PendingResult} instance, not the original reference.
   * - If `f` throws or returns a `Promise` that rejects, the error is ignored,
   *   and the returned promise still resolves to the original state.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   * let sideEffect = 0;
   *
   * expect(await x.inspect(n => (sideEffect = n))).toStrictEqual(ok(2));
   * expect(await x.inspect(_ => { throw new Error() })).toStrictEqual(ok(2));
   * expect(sideEffect).toBe(2);
   * expect(await y.inspect(n => (sideEffect = n))).toStrictEqual(err("failure"));
   * expect(sideEffect).toBe(2); // Unchanged
   * ```
   */
  inspect(f: (x: T) => unknown): PendingResult<T, E>;

  /**
   * Calls `f` with the error if this pending result resolves to an {@link Err},
   * then returns a new pending result with the original state.
   *
   * This is the asynchronous version of {@link Resultant.inspectErr | inspectErr}.
   *
   * @notes
   * - Returns a new {@link PendingResult} instance, not the original reference.
   * - If `f` throws or returns a `Promise` that rejects, the error is ignored,
   *   and the returned promise still resolves to the original state.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   * let sideEffect: CheckedError<string> | null = null;
   *
   * expect(await x.inspectErr(n => (sideEffect = n))).toStrictEqual(ok(2));
   * expect(await x.inspectErr(_ => { throw new Error() })).toStrictEqual(ok(2));
   * expect(sideEffect).toBeNull();
   * expect(await y.inspectErr(n => (sideEffect = n))).toStrictEqual(err("failure"));
   * expect(await y.inspectErr(_ => { throw new Error() })).toStrictEqual(err("failure"));
   * expect(isCheckedError(sideEffect)).toBe(true);
   * ```
   */
  inspectErr(f: (x: CheckedError<E>) => unknown): PendingResult<T, E>;

  /**
   * Returns an async iterator over this pending result’s value, yielding it if
   * it resolves to {@link Ok} or nothing if it resolves to {@link Err}.
   *
   * @notes
   * - Yields exactly one item for a resolved {@link Ok}, or zero items
   *   for a resolved {@link Err}.
   * - Compatible with `for await...of` loops and async spread operators (with caution).
   * - Ignores the error value in {@link Err} cases, focusing only on the success case.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42).toPending();
   * const y = err<number, string>("failure").toPending();
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
   * Maps the resolved value with `f`, returning a {@link PendingResult} with
   * the result if {@link Ok}, or the original {@link Err} if {@link Err}.
   *
   * This is the asynchronous version of {@link Resultant.map | map}.
   *
   * @notes
   * - If `f` throws or returns a rejected promise, returns a {@link PendingResult}
   *   with an {@link Err} containing an {@link UnexpectedError}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.map(n => n * 2)).toStrictEqual(ok(4));
   * expect((await x.map(() => { throw new Error("boom") })).unwrapErr().unexpected).toBeDefined();
   * expect(await y.map(n => n * 2)).toStrictEqual(err("failure"));
   * ```
   */
  map<U>(f: (x: T) => U): PendingResult<Awaited<U>, Awaited<E>>;

  /**
   * Maps this pending result by applying a callback to its full state,
   * executing the callback for both {@link Ok} and {@link Err}, returning
   * a new {@link PendingResult}.
   *
   * Unlike {@link andThen}, which only invokes the callback for {@link Ok},
   * this method always calls `f`, passing the entire {@link Result} as its argument.
   *
   * This is the asynchronous version of {@link Resultant.mapAll | mapAll}.
   *
   * @notes
   * - If `f` throws or returns a `Promise` that rejects, the newly created
   *   {@link PendingResult} will resolve to an {@link Err} with
   *   an {@link UnexpectedError}.
   *
   * @example
   * ```ts
   * const okRes = ok<number, string>(42).toPending();
   * const errRes = err<number, string>("failure").toPending();
   *
   * const okMapped = okRes.mapAll(res => Promise.resolve(ok(res.unwrapOr(0) + 1)));
   * expect(await okMapped).toStrictEqual(ok(43));
   *
   * const errMapped = errRes.mapAll(res => Promise.resolve(ok(res.unwrapOr(0) + 1)));
   * expect(await errMapped).toStrictEqual(ok(1));
   *
   * const throwMapped = okRes.mapAll(() => { throw new Error("boom") });
   * expect((await throwMapped).unwrapErr().unexpected).toBeDefined();
   * ```
   */
  mapAll<U, F>(
    f: (
      x: Result<T, E>,
    ) => Result<U, F> | PendingResult<U, F> | Promise<Result<U, F>>,
  ): PendingResult<Awaited<U>, Awaited<F>>;

  /**
   * Transforms this pending result by applying `f` to the error if it resolves
   * to an {@link Err} with an expected error, or preserves the {@link Ok} unchanged.
   *
   * This is the asynchronous version of {@link Resultant.mapErr | mapErr}.
   *
   * @notes
   * - If `f` throws or returns a rejected promise, returns a {@link PendingResult}
   *   with an {@link Err} containing an {@link UnexpectedError}.
   * - If this resolves to an {@link Err} with an {@link UnexpectedError}, `f`
   *   is not called, and the original error is preserved.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.mapErr(e => e.length)).toStrictEqual(ok(2));
   * expect(await y.mapErr(e => e.length)).toStrictEqual(err(7));
   * expect((await y.mapErr(() => { throw new Error("boom") })).unwrapErr().unexpected).toBeDefined();
   * ```
   */
  mapErr<F>(f: (x: E) => F): PendingResult<Awaited<T>, Awaited<F>>;

  /**
   * Matches this {@link PendingResult}, returning a promise of `f` applied to
   * the value if it resolves to an {@link Ok}, or `g` applied to the error if
   * it resolves to an {@link Err}.
   *
   * This is the asynchronous version of {@link Resultant.match | match}.
   *
   * @throws
   * - Rejects {@link ResultError} if `f` or `g` throws an exception or rejects,
   *   original error will be set as {@link ResultError.reason}.
   *
   * @notes
   * - If `f` or `g` throws or returns a rejected `Promise`, the returned promise
   *   rejects with the original error. In this case the caller is responsible
   *   for handling the rejection.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.match(n => n * 2, () => 0)).toBe(4);
   * expect(await y.match(n => n * 2, e => e.expected?.length)).toBe(7);
   * ```
   */
  match<U, F = U>(
    f: (x: T) => U,
    g: (e: CheckedError<E>) => F,
  ): Promise<Awaited<U | F>>;

  /**
   * Returns this pending result if it resolves to an {@link Ok},
   * otherwise returns `x`.
   *
   * This is the asynchronous version of {@link Resultant.or | or}.
   *
   * @notes
   * - If this result resolves to an {@link Err} and `x` is a `Promise` that
   *   rejects, the resulting {@link PendingResult} resolves to an {@link Err}
   *   with an {@link UnexpectedError}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.or(ok(3))).toStrictEqual(ok(2));
   * expect(await x.or(err("another one"))).toStrictEqual(ok(2));
   * expect(await y.or(ok(3))).toStrictEqual(ok(3));
   * expect(await y.or(err("another one"))).toStrictEqual(err("failure"));
   * expect((await y.or(Promise.reject(new Error("boom")))).unwrapErr().unexpected).toBeDefined();
   * ```
   */
  or<F>(
    x: Result<T, F> | PendingResult<T, F> | Promise<Result<T, F>>,
  ): PendingResult<Awaited<T>, Awaited<F>>;

  /**
   * Returns this {@link PendingResult} if it resolves to {@link Ok}, otherwise
   * returns a {@link PendingResult} with the result of `f`.
   *
   * This is the asynchronous version of {@link Resultant.orElse | orElse}.
   *
   * @notes
   * - If `f` throws or returns a rejected promise, the resulting
   *   {@link PendingResult} resolves to an {@link Err} with
   *   an {@link UnexpectedError}.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.orElse(() => ok(3))).toStrictEqual(ok(2));
   * expect(await y.orElse(() => Promise.resolve(ok(3)))).toStrictEqual(ok(3));
   * expect((await y.orElse(() => { throw new Error("boom") })).unwrapErr().unexpected).toBeDefined();
   * expect(await y.orElse(() => err("another one"))).toStrictEqual(err("another one"));
   * ```
   */
  orElse<F>(
    f: () => Result<T, F> | PendingResult<T, F> | Promise<Result<T, F>>,
  ): PendingResult<Awaited<T>, Awaited<F>>;

  /**
   * Executes `f` with the resolved result, then returns a new {@link PendingResult}
   * unchanged.
   *
   * This is the asynchronous version of {@link Resultant.tap | tap}.
   *
   * @notes
   * - If `f` throws or rejects, the error is ignored
   * - If `f` returns a promise, the promise is not awaited before returning
   *
   * @example
   * ```ts
   * const x = pendingResult(ok<number, string>(42));
   * const y = pendingResult(err<number, string>("failure"));
   * let log = "";
   *
   * expect(await x.tap(res => (log = res.toString()))).toStrictEqual(ok(42));
   * expect(log).toBe("Ok { 42 }");
   * expect(await y.tap(res => (log = res.toString()))).toStrictEqual(err("failure"));
   * expect(log).toBe("Err { 'failure' }");
   * ```
   */
  tap(f: (x: Result<T, E>) => unknown): PendingResult<T, E>;

  /**
   * Transposes a {@link PendingResult} of an {@link Option} into
   * a {@link PendingOption} containing a {@link Result}.
   *
   * This is the asynchronous version of {@link Resultant.transpose | transpose}.
   *
   * @example
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
  transpose<U, F>(
    this: PendingResult<Option<U>, F>,
  ): PendingOption<Result<U, F>>;

  /**
   * Extracts this {@link PendingResult}’s state, returning a promise of a tuple
   * with a success flag, error, and value.
   *
   * Inspired by the {@link https://github.com/arthurfiorette/proposal-try-operator Try Operator}
   * proposal.
   *
   * This is the asynchronous version of {@link Resultant.try | try}.
   *
   * @notes
   * - Resolves to `[true, undefined, Awaited<T>]` if this is an {@link Ok}, or
   *   `[false, CheckedError<Awaited<E>>, undefined]` if this is an {@link Err}.
   * - Never rejects, offering a safe way to await the result’s state with
   *   explicit success indication.
   *
   * @example
   * ```ts
   * const x = ok<number, string>(42).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.try()).toEqual([true, undefined, 42]);
   * expect(await y.try()).toEqual([false, expect.objectContaining({ expected: "failure" }), undefined]);
   * ```
   */
  try(): Promise<
    readonly [
      boolean,
      CheckedError<Awaited<E>> | undefined,
      Awaited<T> | undefined,
    ]
  >;
}
