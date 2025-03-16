import type { Cloneable, Recoverable } from "../types";
import type { ResultError } from "./error";

export type Ok<T, E> = Resultant<T, E> & { readonly value: T };

export type Err<T, E> = Resultant<T, E> & { readonly error: CheckedError<E> };

export type Result<T, E> = Ok<T, E> | Err<T, E>;

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
 * A type representing the error state of a {@link Result}, containing either an
 * expected error of type `E` or an unexpected {@link ResultError}.
 *
 * This type ensures exactly one error is present: either an expected error (an
 * anticipated failure of type `E`) or an unexpected error (a runtime or exceptional
 * failure). Use {@link EitherError.isExpected | isExpected} or
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
   * Checks if this is an expected error, narrowing to {@link ExpectedError}.
   */
  isExpected(): this is ExpectedError<E>;
  /**
   * Checks if this is an unexpected error, narrowing to {@link UnexpectedError}.
   */
  isUnexpected(): this is UnexpectedError<E>;
  /**
   * Applies one of two functions to the contained error based on its type.
   *
   * @template T - The return type of the handler functions.
   * @param f - Function to handle an unexpected {@link ResultError}.
   * @param g - Function to handle an expected error of type `E`.
   * @returns The result of applying `f` or `g`.
   */
  handle<T>(f: (e: ResultError) => T, g: (e: E) => T): T;
}

/**
 * Interface representing the resultant state of an operation, either a success
 * ({@link Ok | Ok\<T>}) or an error ({@link Err | Err\<E>}).
 *
 * Inspired by Rust’s Result, it provides a type-safe alternative to exceptions for
 * handling success or failure outcomes.
 */
export interface Resultant<T, E> {
  and<U>(x: Result<U, E>): Result<U, E>;
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
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  expect(this: SettledResult<T, E>, msg?: string): T;

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
  unwrap(this: SettledResult<T, E>): T;
  unwrapErr(this: SettledResult<T, E>): CheckedError<E>;
}

export interface PendingResult<T, E>
  extends PromiseLike<Result<T, E>>,
    Recoverable<Result<T, E>> {
  and<U>(
    x: Result<U, E> | Promise<Result<U, E>>,
  ): PendingResult<Awaited<U>, Awaited<E>>;
}
