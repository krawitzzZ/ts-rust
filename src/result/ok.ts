import { AnyError } from "../error";
import { none, Option, some } from "../option";
import { IResult } from "./interface";
import { Err, Result } from "./index";

export class Ok<T, E> implements IResult<T, E> {
  #value: T;

  get value(): T {
    return this.#value;
  }

  constructor(value: T) {
    this.#value = value;
  }

  toString(): string {
    return `Ok(${JSON.stringify(this.#value)})`;
  }

  ok(): Option<T> {
    return some(this.#value);
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isOkAnd(f: (x: T) => boolean): this is Ok<T, E> {
    return f(this.#value);
  }

  err(): Option<E> {
    return none<E>();
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  isErrAnd(_: (y: E) => boolean): this is Err<T, E> {
    return false;
  }

  and<U>(r: Result<U, E>): Result<U, E> {
    return r;
  }

  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E> {
    return f(this.#value);
  }

  map<U>(f: (x: T) => U): Result<U, E> {
    return ok(f(this.#value));
  }

  mapErr<F>(_: (y: E) => F): Result<T, F> {
    return ok(this.#value);
  }

  mapOr<U>(_: U, f: (x: T) => U): U {
    return f(this.#value);
  }

  mapOrElse<U>(_: (y: E) => U, f: (x: T) => U): U {
    return f(this.#value);
  }

  or<F>(_: Result<T, F>): Result<T, F> {
    return ok(this.#value);
  }

  orElse<F>(_: (y: E) => Result<T, F>): Result<T, F> {
    return ok(this.#value);
  }

  inspect(f: (x: T) => unknown): Result<T, E> {
    try {
      f(this.#value);
    } catch {
      // do not care about the error
    }

    return ok(this.#value);
  }

  inspectErr(_: (x: E) => unknown): Result<T, E> {
    return ok(this.#value);
  }

  expect(_?: string): T {
    return this.#value;
  }

  expectErr(msg?: string): E {
    throw new AnyError(msg ?? "`expectErr` is called on `Ok`", this.#value);
  }

  unwrap(): T {
    return this.#value;
  }

  unwrapOr(_: T): T {
    return this.#value;
  }

  unwrapOrElse(_: (y: E) => T): T {
    return this.#value;
  }

  unwrapErr(): E {
    throw new AnyError("`unwrapErr` is called on `Ok`", this.#value);
  }
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export function ok<E>(value: void): Ok<void, E>;
export function ok<T, E>(value: T): Ok<T, E>;
export function ok<T, E>(value: T): Ok<T, E> {
  return new Ok(value);
}
