import { Sync } from "../types";
import type { ResultError } from "./error";

export type Ok<T, E> = ISafeResult<T, E> & { readonly value: T };

export type Err<T, E> = ISafeResult<T, E> & { readonly error: E };

export type Result<T, E> = Ok<T, E> | Err<T, E>;

export type SettledResult<T, E> = Ok<Sync<T>, Sync<E>> | Err<Sync<T>, Sync<E>>;

/**
 * Interface representing the resultant state of an operation, either a success
 * ({@link Ok | Ok\<T>}) or an error ({@link Err | Err\<E>}).
 *
 * Inspired by Rust’s Result, it provides a type-safe alternative to exceptions for
 * handling success or failure outcomes.
 */
export interface Resultant<T, E> {
  and<U>(x: Result<U, E>): Result<U, E>;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  expect(this: SettledResult<T, E>, msg?: string): T;
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
  unwrap(): T;
  unwrapErr(): E;
}

export interface ISafeResult<T, E> extends Resultant<T, E> {
  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E | ResultError>;
}

export interface IUnsafeResult<T, E> extends Resultant<T, E> {
  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E>;
}
