/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Option, Some, None, PendingOption } from "../option";
import type { Cloneable, Recoverable } from "../types";
import type { ResultError } from "./error";
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Represents a successful outcome of a {@link Result} or {@link UnsafeResult},
 * holding a value of type `T`.
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
 * Represents an unchecked failed outcome of an {@link UnsafeResult}, holding
 * a raw error of type `E`.
 *
 * Unlike {@link Err}, this type does not wrap the error in {@link CheckedError},
 * leaving runtime or unexpected errors unhandled, making it less safe but simpler
 * for cases where such distinction is unnecessary.
 */
export type UnsafeErr<T, E> = Resultant<T, E> & { readonly error: E };

/**
 * A type representing the outcome of an operation, either a success
 * ({@link Ok}) or an unchecked failure ({@link UnsafeErr}).
 *
 * Similar to {@link Result}, but uses a raw error type `E` without wrapping it
 * in {@link CheckedError}, omitting runtime error handling for simplicity at
 * the cost of safety.
 */
export type UnsafeResult<T, E> = Ok<T, E> | UnsafeErr<T, E>;

/**
 * A {@link Result} type where both the value (`T`) and error (`E`) types have
 * been resolved from potential `PromiseLike` types to their awaited forms.
 */
export type SettledResult<T, E> =
  | Ok<Awaited<T>, Awaited<E>>
  | Err<Awaited<T>, Awaited<E>>;

/**
 * An {@link UnsafeResult} type where both the value (`T`) and error (`E`)
 * types have been resolved from potential `PromiseLike` types to their
 * awaited forms.
 */
export type SettledUnsafeResult<T, E> =
  | Ok<Awaited<T>, Awaited<E>>
  | UnsafeErr<Awaited<T>, Awaited<E>>;

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
   * Applies `f` to the value if this is an {@link Ok} and returns its result,
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
   * Returns a **deep clone** of the {@link Result}.
   *
   * Only available on {@link Result}s with {@link Cloneable} value and error.
   *
   * ### Example
   * ```ts
   * const x = ok(1);
   * const y = ok({ a: 1, clone: () => ({ a: 1 }) });
   *
   * expect(x.clone()).toStrictEqual(ok(1));
   * expect(x.clone()).not.toBe(x); // Different reference
   * expect(x.clone().unwrap()).toBe(1);
   * expect(y.clone()).toStrictEqual(ok({ a: 1 }));
   * ```
   */
  clone<U, V>(this: Result<Cloneable<U>, Cloneable<V>>): Result<U, V>;

  /**
   * Returns a **shallow** copy of the {@link Result}.
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
   * - The error is extracted from the {@link CheckedError} if it’s an {@link ExpectedError};
   *   If it's an {@link UnexpectedError}, {@link None} is returned.
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
   * Retrieves the value if this is an {@link Ok}, or throws a {@link ResultError}
   * with an optional message if it’s an {@link Err}.
   *
   * ## Throws
   * - {@link ResultError} if this is {@link Err}
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
   * Checks if this is an {@link Err}, narrowing the type accordingly.
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
  isErr(this: Result<T, E>): this is Err<T, E>;
  /**
   * Checks if this is an {@link UnsafeErr}, narrowing the type accordingly.
   *
   * ### Example
   * ```ts
   * const x = unsafeOk<number, string>(2);
   * const y = unsafeErr<number, string>("failure");
   *
   * expect(x.isErr()).toBe(false);
   * expect(y.isErr()).toBe(true);
   * ```
   */
  isErr(this: UnsafeResult<T, E>): this is UnsafeErr<T, E>;

  /**
   * Checks if this is an {@link Ok}, narrowing the type accordingly.
   *
   * ### Example
   * ```ts
   * const x = ok<number, string>(2);
   * const y = err<number, string>("failure");
   *
   * expect(x.isOk()).toBe(true);
   * expect(y.isOk()).toBe(fasle);
   * ```
   */
  isOk(): this is Ok<T, E>;

  /**
   * Maps this result to a {@link PendingResult} by supplying a shallow
   * {@link Resultant.copy | copy} of this result to {@link PendingResult} factory.
   *
   * Useful for transposing a result with `PromiseLike` value to a
   * {@link PendingResult} with `Awaited` value.
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
   * Maps this result to a {@link PendingResult} by supplying a
   * {@link Resultant.clone | clone} of this result to {@link PendingResult}
   * factory.
   *
   * Useful for transposing a result with `PromiseLike` value to a
   * {@link PendingResult} with `Awaited` value.
   *
   * ### Example
   * ```ts
   * const value = { a: 0, clone: () => ({ a: 0 })};
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
   * Returns a string representation of the {@link Result}.
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
   * Converts this {@link Result} to an {@link UnsafeResult}, stripping
   * {@link CheckedError} to expose the raw error type `E`.
   *
   * If this is an {@link Ok}, the value is preserved. If it’s an expected
   * {@link Err}, the {@link CheckedError} is unwrapped to its expected error
   * (`E`), throwing if the error is unexpected {@link ResultError}.
   *
   * ## Throws
   * - {@link ResultError} if this is an {@link Err} with an unexpected error
   *   (see {@link UnexpectedError})
   *
   * ### Example
   * ```ts
   * const x = ok<number, string>(42);
   * const y = err<number, string>("failure");
   * const z = err(unexpected("Crash", ResultErrorKind.Unexpected));
   *
   * expect(x.toUnsafe()).toStrictEqual(ok(42));
   * expect(y.toUnsafe()).toStrictEqual(unsafeErr("failure"));
   * expect(() => z.toUnsafe()).toThrow(ResultError);
   * ```
   */
  toUnsafe(): UnsafeResult<T, E>;

  /**
   * Retrieves the value if this is an {@link Ok}, or throws a {@link ResultError}
   * if it’s an {@link Err}.
   *
   * ## Throws
   * - {@link ResultError} if this is {@link Err}
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
  unwrap(this: SettledResult<T, E> | SettledUnsafeResult<T, E>): T;

  /**
   * Retrieves the error if this is an {@link Err}, or throws
   * a {@link ResultError} if it’s an {@link Ok}.
   *
   * ## Throws
   * - {@link ResultError} if this is {@link Ok}
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
  /**
   * Retrieves the error if this is an {@link Err}, or throws
   * a {@link ResultError} if it’s an {@link Ok}.
   *
   * ## Throws
   * - {@link ResultError} if this is {@link Ok}
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
  unwrapErr(this: SettledUnsafeResult<T, E>): E;
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
   * Returns a {@link PendingResult} with {@link Err} if this result resolves to
   * {@link Err}, otherwise returns a {@link PendingResult} with `x`.
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
   * Returns a {@link PendingResult} with {@link Err} if this result resolves to
   * {@link Err}, otherwise applies `f` to the resolved {@link Ok} value and
   * returns its result.
   *
   * This is the asynchronous version of {@link Resultant.andThen | andThen}.
   *
   * ### Example
   * ```ts
   * const x = ok<number, string>(2).toPending();
   * const y = err<number, string>("failure").toPending();
   *
   * expect(await x.andThen((n) => ok(n * 2))).toStrictEqual(ok(4));
   * expect(await x.andThen((_) => err("oops"))).toStrictEqual(err("oops"));
   * expect(await y.andThen((n) => err("oops"))).toStrictEqual(err("failure"));
   * ```
   */
  andThen<U>(
    f: (x: T) => Result<U, E> | Promise<Result<U, E>>,
  ): PendingResult<Awaited<U>, Awaited<E>>;

  /**
   * Converts this {@link PendingResult} to a {@link PendingOption | PendingOption\<E>}
   * containing the awaited error, if present.
   *
   * Returns a {@link PendingOption} that resolves to {@link Some} with the error
   * value if this resolves to an {@link Err},
   * or to {@link None} if this resolves to an {@link Ok}.
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
}
