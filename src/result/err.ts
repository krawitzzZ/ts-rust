import { AnyError } from "../error";
import { none, Option, some } from "../option";
import { IResult } from "./interface";
import { Ok, Result } from "./index";

export class Err<T, E> implements IResult<T, E> {
  #error: E;

  get error(): E {
    return this.#error;
  }

  constructor(error: E) {
    this.#error = error;
  }

  toString(): string {
    return `Err(${JSON.stringify(this.#error)})`;
  }

  ok(): Option<T> {
    return none<T>();
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isOkAnd(_: (x: T) => boolean): this is Ok<T, E> {
    return false;
  }

  err(): Option<E> {
    return some(this.#error);
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  isErrAnd(f: (y: E) => boolean): this is Err<T, E> {
    return f(this.#error);
  }

  and<U>(_: Result<U, E>): Result<U, E> {
    return err(this.#error);
  }

  andThen<U>(_: (x: T) => Result<U, E>): Result<U, E> {
    return err(this.#error);
  }

  map<U>(_: (x: T) => U): Result<U, E> {
    return err(this.#error);
  }

  mapErr<F>(f: (y: E) => F): Result<T, F> {
    return err(f(this.#error));
  }

  mapOr<U>(def: U, _: (x: T) => U): U {
    return def;
  }

  mapOrElse<U>(mkDef: (y: E) => U, _: (x: T) => U): U {
    return mkDef(this.#error);
  }

  or<F>(y: Result<T, F>): Result<T, F> {
    return y;
  }

  orElse<F>(f: (y: E) => Result<T, F>): Result<T, F> {
    return f(this.error);
  }

  inspect(_: (x: T) => unknown): Result<T, E> {
    return err(this.#error);
  }

  inspectErr(f: (y: E) => unknown): Result<T, E> {
    try {
      f(this.#error);
    } catch {
      // do not care about the error
    }

    return err(this.#error);
  }

  expect(msg?: string): T {
    throw new AnyError(msg ?? "`expect` is called on `Err`", this.#error);
  }

  expectErr(_?: string): E {
    return this.#error;
  }

  unwrap(): T {
    throw new AnyError("`unwrap` is called on `Err`", this.#error);
  }

  unwrapOr(def: T): T {
    return def;
  }

  unwrapOrElse(mkDef: (y: E) => T): T {
    return mkDef(this.#error);
  }

  unwrapErr(): E {
    return this.#error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export function err<T>(error: void): Err<T, void>;
export function err<T, E>(error: E): Err<T, E>;
export function err<T, E>(error: E): Err<T, E> {
  return new Err(error);
}
