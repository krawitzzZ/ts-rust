import { AnyResultError } from "./types";
import { Err, Ok, Result } from "./index";

export interface IResult<T, E> {
  and<U>(x: Result<U, E>): Result<U, E>;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;
  expect(msg?: string): T;
  /**
   * Returns a string representation of the `Result`.
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

export interface ISafeResult<T, E> extends IResult<T, E> {
  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E | AnyResultError>;
}
