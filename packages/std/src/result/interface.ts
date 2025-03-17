import type { Cloneable, Recoverable } from "../types";
import type { ResultError } from "./error";

/**
 * Represents a successful outcome of a {@link Result}, holding a value
 * of type `T`.
 */
export type Ok<T, E> = Resultant<T, E> & { readonly value: T };

/**
 * Represents a failed outcome of a {@link Result}, holding a
 * {@link CheckedError} of type `E`.
 */
export type Err<T, E> = Resultant<T, E> & { readonly error: CheckedError<E> };

/**
 * A type representing the outcome of an operation, either a success
 * ({@link Ok}) or a failure ({@link Err}).
 *
 * Inspired by Rust’s {@link https://doc.rust-lang.org/std/result/enum.Result.html | Result},
 * this type provides a type-safe way to handle computations that may succeed
 * with a value of type `T` or fail with an error of type `E`.
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
};

/**
 * Represents an unexpected error of type {@link ResultError} within a
 * {@link CheckedError}.
 */
export type UnexpectedError<E> = EitherError<E> & {
  readonly expected: undefined;
  readonly unexpected: ResultError;
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
   * Retrieves the contained error value, either an expected error of type `E` or
   * an unexpected {@link ResultError}.
   *
   * Use this method for raw access to the error, or prefer
   * {@link ExpectedError.expected | expected} and
   * {@link UnexpectedError.unexpected | unexpected} for type-safe retrieval.
   */
  get(): E | ResultError;

  /**
   * Applies one of two functions to the contained error based on its type.
   *
   * @template T - The return type of the handler functions.
   * @param f - Function to handle an unexpected {@link ResultError}.
   * @param g - Function to handle an expected error of type `E`.
   * @returns The result of applying `f` or `g`.
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
   * Applies a function to the value if this is an {@link Ok}, or propagates
   * the error if it’s an {@link Err}.
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
   * Returns a clone of the {@link Result}.
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
   * expect(x.copy()).not.toBe(x); // Different option reference
   * expect(x.copy().unwrap()).toBe(value); // Same value reference
   * ```
   */
  copy(): Result<T, E>;

  /**
   * Retrieves the value if this is an {@link Ok}, or throws a {@link ResultError}
   * with an optional message if it’s an {@link Err}.
   *
   * Only available on {@link SettledResult}s where `T` and `E` are not `PromiseLike`.
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
  isErr(): this is Err<T, E>;

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
   * {@link Resultant.copy | copy} of this option to {@link PendingResult} factory.
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
   * {@link Resultant.clone | clone} of this option to {@link PendingResult}
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
   * expect(isPendingOption(pendingX)).toBe(true);
   * expect((await pendingX).unwrap().a).toBe(0);
   * value.a = 42;
   * expect((await pendingX).unwrap().a).toBe(0);
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
   * Retrieves the value if this is an {@link Ok}, or throws a {@link ResultError}
   * if it’s an {@link Err}.
   *
   * Only available on {@link SettledResult}s where `T` and `E` are not
   * `PromiseLike`.
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
  unwrap(this: SettledResult<T, E>): T;

  /**
   * Retrieves the error if this is an {@link Err}, or throws
   * a {@link ResultError} if it’s an {@link Ok}.
   *
   * Only available on {@link SettledResult}s where `T` and `E` are not
   * `PromiseLike`.
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
   * This is the asynchronous version of the {@link Resultant.and | and}.
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
}
