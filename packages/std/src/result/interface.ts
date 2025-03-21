/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Option, Some, None, PendingOption } from "../option";
import type { Cloneable, Recoverable } from "../types";
import type { ResultError } from "./error";
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
  readonly expected: E;
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
  readonly expected: undefined;
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
 * Inspired by Rust’s Result, it provides a type-safe alternative to exceptions for
 * handling success or failure outcomes.
 */
export interface Resultant<T, E> {
  /**
   * Returns `x` if this result is {@link Ok}, otherwise returns the {@link Err}
   * value of self.
   *
   * ### Example
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
   * ### Example
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
   * ### Notes
   * - Returns `[true, T]` if this is an {@link Ok}, or `[false, CheckedError<E>]`
   *   if this is an {@link Err}.
   * - Never throws, providing a safe way to access the result’s state without
   *   unwrapping.
   *
   * ### Example
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
   * Returns a deep copy of the {@link Result}.
   *
   * Only available on {@link Result}s with {@link Cloneable} value and error.
   *
   * ### Example
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
  clone<U, V>(this: Result<Cloneable<U>, Cloneable<V>>): Result<U, V>;

  /**
   * Returns a shallow copy of the {@link Result}.
   *
   * ### Example
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
   * ### Notes
   * - Extracts the error from {@link CheckedError} if it’s an {@link ExpectedError};
   *   returns {@link None} for {@link UnexpectedError}.
   *
   * ### Example
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
   * ## Throws
   * - {@link ResultError} if this result is an {@link Err}
   *
   * ### Example
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
   * ## Throws
   * - {@link ResultError} if this result is an {@link Ok}
   *
   * ### Example
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
   * ### Example
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
   * ### Notes
   * - Returns a new {@link Result} instance, not the original reference.
   * - If `f` throws or returns a `Promise` that rejects, the error is ignored.
   *
   * ### Example
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
   * Checks if this result is an {@link Err}, narrowing its type to
   * {@link Err} if true.
   *
   * ### Example
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
   * Checks if this result is an {@link Ok}, narrowing its type to
   * {@link Ok} if true.
   *
   * ### Example
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
   * Matches this result, returning `f` applied to the value if {@link Ok},
   * or `g` applied to the {@link CheckedError} if {@link Err}.
   *
   * ## Throws
   * - {@link ResultError} if `f` or `g` throws an exception, with the original
   *   error set as {@link ResultError.reason}.
   *
   * ### Notes
   * - If `f` or `g` return a `Promise` that rejects, the caller is responsible
   *   for handling the rejection.
   *
   * ### Example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.match(n => n * 2, () => 0)).toBe(4);
   * expect(() => x.match(_ => { throw new Error() }, () => 0)).toThrow(ResultError);
   * expect(y.match(n => n * 2, e => e.expected.length)).toBe(7);
   * expect(() => y.match(n => n * 2, () => { throw new Error() })).toThrow(ResultError);
   * ```
   */
  match<U, F = U>(
    this: SettledResult<T, E>,
    f: (x: T) => Awaited<U>,
    g: (e: CheckedError<E>) => Awaited<F>,
  ): U | F;

  /**
   * Converts this result to a {@link PendingResult} using a shallow
   * {@link Resultant.copy | copy} of its current state.
   *
   * ### Notes
   * - Useful for transposing a result with a `PromiseLike` value to
   *   a {@link PendingResult} with an `Awaited` value.
   *
   * ### Example
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
   * ### Notes
   * - Useful for transposing a result with a `PromiseLike` value to
   *   a {@link PendingResult} with an `Awaited` value, preserving independence
   *   from the original data.
   *
   * ### Example
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
   * ### Example
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
   * Extracts this result’s state, returning a tuple with a success flag, error,
   * and value.
   *
   * Inspired by the {@link https://github.com/arthurfiorette/proposal-try-operator Try Operator}
   * proposal.
   *
   * ### Notes
   * - Returns `[true, undefined, T]` if this is an {@link Ok}, or
   *   `[false, CheckedError<E>, undefined]` if this is an {@link Err}.
   * - Never throws, offering a safe way to inspect the result’s state with
   *   explicit success indication.
   *
   * ### Example
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
   * ## Throws
   * - {@link ResultError} if this result is an {@link Err}
   *
   * ### Example
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
   * ## Throws
   * - {@link ResultError} if this result is an {@link Ok}
   *
   * ### Example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   *
   * expect(() => x.unwrapErr()).toThrow(ResultError);
   * expect(y.unwrapErr().expected).toBe("failure");
   * ```
   */
  unwrapErr(this: SettledResult<T, E>): CheckedError<E>;
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
   * ### Example
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
    x: Result<U, E> | Promise<Result<U, E>>,
  ): PendingResult<Awaited<U>, Awaited<E>>;

  /**
   * Returns a {@link PendingResult} that resolves to {@link Err} if this result
   * resolves to {@link Err}, otherwise applies `f` to the resolved {@link Ok}
   * value and returns its result.
   *
   * This is the asynchronous version of {@link Resultant.andThen | andThen}.
   *
   * ### Example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.andThen(n => ok(n * 2))).toStrictEqual(ok(4));
   * expect(await x.andThen(_ => err("oops"))).toStrictEqual(err("oops"));
   * expect(await y.andThen(n => err("oops"))).toStrictEqual(err("failure"));
   * ```
   */
  andThen<U>(
    f: (x: T) => Result<U, E> | Promise<Result<U, E>>,
  ): PendingResult<Awaited<U>, Awaited<E>>;

  /**
   * Inspects this {@link PendingResult}’s state, returning a promise of
   * a tuple with a success flag and either the value or error.
   *
   * This is the asynchronous version of {@link Resultant.check | check}.
   *
   * ### Notes
   * - Resolves to `[true, Awaited<T>]` if this is an {@link Ok}, or to
   *   `[false, CheckedError<Awaited<E>>]` if this is an {@link Err}.
   * - Never rejects, providing a safe way to await the result’s state.
   *
   * ### Example
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
   * ### Example
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
   * ### Notes
   * - Handles cases like `PendingResult<Result<T, E>, E>` or
   *   `PendingResult<PendingResult<T, E>, E>`, resolving to
   *   `PendingResult<Awaited<T>, Awaited<E>>`.
   *
   * ### Example
   * ```ts
   * const x = ok(ok(6)).toPending();
   * const y = ok(err<number, string>("oops")).toPending();
   * const z = err<string, string>("outer").toPending();
   *
   * expect(await x.flatten()).toStrictEqual(ok(6));
   * expect(await y.flatten()).toStrictEqual(err("oops"));
   * expect(await z.flatten()).toStrictEqual(err("outer"));
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
   * ### Notes
   * - Returns a new {@link PendingResult} instance, not the original reference.
   * - If `f` throws or returns a `Promise` that rejects, the error is ignored,
   *   and the returned promise still resolves to the original state.
   *
   * ### Example
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
   * Matches this {@link PendingResult}, returning a promise of `f` applied to
   * the value if it resolves to an {@link Ok}, or `g` applied to the error if
   * it resolves to an {@link Err}.
   *
   * This is the asynchronous version of {@link Resultant.match | match}.
   *
   * ### Notes
   * - If `f` or `g` throw or return a rejected `Promise`, the returned promise
   *   rejects with the original error. In this case the caller is responsible
   *   for handling the rejection.
   *
   * ### Example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.match(n => n * 2, () => 0)).toBe(4);
   * expect(await y.match(n => n * 2, e => e.expected.length)).toBe(7);
   * ```
   */
  match<U, F = U>(
    f: (x: T) => U,
    g: (e: CheckedError<E>) => F,
  ): Promise<Awaited<U | F>>;

  /**
   * Extracts this {@link PendingResult}’s state, returning a promise of a tuple
   * with a success flag, error, and value.
   *
   * Inspired by the {@link https://github.com/arthurfiorette/proposal-try-operator Try Operator}
   * proposal.
   *
   * This is the asynchronous version of {@link Resultant.try | try}.
   *
   * ### Notes
   * - Resolves to `[true, undefined, Awaited<T>]` if this is an {@link Ok}, or
   *   `[false, CheckedError<Awaited<E>>, undefined]` if this is an {@link Err}.
   * - Never rejects, offering a safe way to await the result’s state with
   *   explicit success indication.
   *
   * ### Example
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
