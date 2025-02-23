import { Result } from "../result";
import { Some, None } from "./index";

export type FlattenedOption<T> =
  T extends Option<infer R> ? Option<R> : Option<T>;

export type Option<T> = Some<T> | None<T>;

export interface IOption<T> {
  and<U>(x: Option<U>): Option<U>;
  andThen<U>(f: (x: T) => Option<U>): Option<U>;
  clone(): Option<T>;
  expect(msg?: string): T;
  filter(f: (x: T) => boolean): Option<T>;
  flatten(): FlattenedOption<T>;
  getOrInsert(x: T): T;
  getOrInsertWith(f: () => T): T;
  insert(x: T): T;
  inspect(f: (x: T) => unknown): Option<T>;
  isNone(): this is None<T>;
  isNoneOr(f: (x: T) => boolean): boolean;
  isSome(): this is Some<T>;
  isSomeAnd(f: (x: T) => boolean): this is Some<T> & boolean;
  map<U>(f: (x: T) => U): Option<U>;
  mapOr<U>(def: U, f: (x: T) => U): U;
  mapOrElse<U>(mkDef: () => U, f: (x: T) => U): U;
  match<U, F = U>(f: (x: T) => U, g: () => F): U | F;
  okOr<E>(y: E): Result<T, E>;
  okOrElse<E>(mkErr: () => E): Result<T, E>;
  or(x: Option<T>): Option<T>;
  orElse(f: () => Option<T>): Option<T>;
  replace(x: T): Option<T>;
  take(): Option<T>;
  takeIf(f: (x: T) => boolean): Option<T>;
  toString(): string;
  transpose<E>(this: Option<Result<T, E>>): Result<Option<T>, E>;
  unwrap(): T;
  unwrapOr(def: T): T;
  unwrapOrElse(mkDef: () => T): T;
  xor(y: Option<T>): Option<T>;
}
