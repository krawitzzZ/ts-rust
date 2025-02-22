import { AnyError } from "../error";
import { err, Result } from "../result";
import { FlattenedOption } from "./types";
import { Option, Some } from "./index";

export class None {
  toString(): string {
    return "None";
  }

  isSome<T>(): this is Some<T> {
    return false;
  }

  isSomeAnd<T>(_: (x: T) => boolean): this is Some<T> {
    return false;
  }

  isNone(): this is None {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  isNoneOr<T>(_: (x: T) => boolean): boolean {
    return true;
  }

  and<U>(_: Option<U>): Option<U> {
    return none();
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  andThen<T, U>(_: (x: T) => Option<U>): Option<U> {
    return none();
  }

  expect(msg?: string): never {
    throw new AnyError(msg ?? "`expect` is called on `None`", undefined);
  }

  filter<T>(_: (x: T) => boolean): Option<T> {
    return none();
  }

  flatten<T>(this: Option<T>): FlattenedOption<T> {
    return none() as FlattenedOption<T>;
  }

  getOrInsert<T>(x: T): T {
    return x;
  }

  getOrInsertWith<T>(f: () => T): T {
    return f();
  }

  insert<T>(x: T): T {
    return x;
  }

  inspect<T>(_: (x: never) => unknown): Option<T> {
    return none();
  }

  map<U>(_: (x: never) => U): Option<U> {
    return none();
  }

  mapOr<U>(def: U, _: (x: never) => U): U {
    return def;
  }

  mapOrElse<U>(mkDef: () => U, _: (x: never) => U): U {
    return mkDef();
  }

  okOr<T, E>(y: E): Result<T, E> {
    return err(y);
  }

  okOrElse<T, E>(mkErr: () => E): Result<T, E> {
    return err(mkErr());
  }

  or<T>(x: Option<T>): Option<T> {
    return x;
  }

  orElse<T>(f: () => Option<T>): Option<T> {
    return f();
  }

  unwrap(): never {
    throw new AnyError("`unwrap` is called on `None`", undefined);
  }

  unwrapOr<T>(def: T): T {
    return def;
  }

  unwrapOrElse<T>(mkDef: () => T): T {
    return mkDef();
  }

  xor<T>(y: Option<T>): Option<T> {
    return y.isSome() ? y : none();
  }
}

export function none(value: unknown): None;
export function none(value?: unknown): None;
export function none(): None {
  return new None();
}
