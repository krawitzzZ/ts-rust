import { ok, Result } from "../result";
import { FlattenedOption } from "./types";
import { Option, None, none } from "./index";

export class Some<T> {
  #value: T;

  get value(): T {
    return this.#value;
  }

  constructor(value: T) {
    this.#value = value;
  }

  toString(): string {
    return `Some(${JSON.stringify(this.#value)})`;
  }

  isSome(): this is Some<T> {
    return true;
  }

  isSomeAnd(f: (x: T) => boolean): this is Some<T> {
    return f(this.#value);
  }

  isNone(): this is None {
    return false;
  }

  isNoneOr(f: (x: T) => boolean): boolean {
    return f(this.#value);
  }

  and<U>(x: Option<U>): Option<U> {
    return x;
  }

  andThen<U>(f: (x: T) => Option<U>): Option<U> {
    return f(this.#value);
  }

  expect(_?: string): T {
    return this.#value;
  }

  filter(f: (x: T) => boolean): Option<T> {
    return f(this.#value) ? some(this.#value) : none();
  }

  flatten(this: Option<T>): FlattenedOption<T> {
    throw new Error();
  }

  getOrInsert(_: T): T {
    return this.#value;
  }

  getOrInsertWith(_: () => T): T {
    return this.#value;
  }

  insert(x: T): T {
    return x;
  }

  inspect(f: (x: T) => unknown): Option<T> {
    try {
      f(this.#value);
    } catch {
      // do not care about the error
    }

    return some(this.#value);
  }

  map<U>(f: (x: T) => U): Option<U> {
    return some(f(this.#value));
  }

  mapOr<U>(_: U, f: (x: T) => U): U {
    return f(this.#value);
  }

  mapOrElse<U>(_: () => U, f: (x: T) => U): U {
    return f(this.#value);
  }

  okOr<E>(_: E): Result<T, E> {
    return ok(this.#value);
  }

  okOrElse<E>(_: () => E): Result<T, E> {
    return ok(this.#value);
  }

  or(_: Option<T>): Option<T> {
    return some(this.#value);
  }

  orElse(_: () => Option<T>): Option<T> {
    return some(this.#value);
  }

  unwrap(): T {
    return this.#value;
  }

  unwrapOr(_: T): T {
    return this.#value;
  }

  unwrapOrElse(_: () => T): T {
    return this.#value;
  }

  xor(y: Option<T>): Option<T> {
    return y.isNone() ? some(this.#value) : none();
  }
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export function some(value: void): Some<void>;
export function some<T>(value: T): Some<T>;
export function some<T>(value: T): Some<T> {
  return new Some(value);
}
