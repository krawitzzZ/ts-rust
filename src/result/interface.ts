import { Option } from "../option";
import { Err, Ok, Result } from "./index";

export interface IResult<T, E> {
  ok(): Option<T>;
  isOk(): this is Ok<T, E>;
  isOkAnd(f: (x: T) => boolean): this is Ok<T, E>;
  err(): Option<E>;
  isErr(): this is Err<T, E>;
  isErrAnd(f: (y: E) => boolean): this is Err<T, E>;
  and<U>(r: Result<U, E>): Result<U, E>;
  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E>;
  map<U>(f: (x: T) => U): Result<U, E>;
  mapErr<F>(f: (y: E) => F): Result<T, F>;
  mapOr<U>(def: U, f: (x: T) => U): U;
  mapOrElse<U>(mkDef: (y: E) => U, f: (x: T) => U): U;
  or<F>(y: Result<T, F>): Result<T, F>;
  orElse<F>(f: (y: E) => Result<T, F>): Result<T, F>;
  inspect(f: (x: T) => unknown): Result<T, E>;
  inspectErr(f: (y: E) => unknown): Result<T, E>;
  expect(msg?: string): T;
  expectErr(msg?: string): E;
  unwrap(): T;
  unwrapOr(def: T): T;
  unwrapOrElse(mkDef: (y: E) => T): T;
  unwrapErr(): E;
}
