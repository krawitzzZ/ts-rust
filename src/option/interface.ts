import { Result } from "../result";
import { FlattenedOption } from "./types";
import { Option, Some, None } from "./index";

interface IOption<T> {
  isSome(): this is Some<T>;
  isSomeAnd(f: (x: T) => boolean): this is Some<T>;
  isNone(): this is None;
  isNoneOr(f: (x: T) => boolean): boolean;
  and<U>(x: Option<U>): Option<U>;
  andThen<U>(f: (x: T) => Option<U>): Option<U>;
  expect(msg?: string): T;
  filter(f: (x: T) => boolean): Option<T>;
  flatten(this: Option<T>): FlattenedOption<T>;
  getOrInsert(x: T): T;
  getOrInsertWith(f: () => T): T;
  insert(x: T): T;
  inspect(f: (x: T) => unknown): Option<T>;
  map<U>(f: (x: T) => U): Option<U>;
  mapOr<U>(def: U, f: (x: T) => U): U;
  mapOrElse<U>(mkDef: () => U, f: (x: T) => U): U;
  okOr<E>(y: E): Result<T, E>;
  okOrElse<E>(mkErr: () => E): Result<T, E>;
  or(x: Option<T>): Option<T>;
  orElse(f: () => Option<T>): Option<T>;
  unwrap(): T;
  unwrapOr(def: T): T;
  unwrapOrElse(mkDef: () => T): T;
  xor(y: Option<T>): Option<T>;
}

/**
 * Ensures that both `Some` and `None` conform to the `IOption` interface.
 *
 * Instead of explicitly defining a generic parameter in the `None` class,
 * we rely on structural typing (similar to Go's interface implementation)
 * to achieve TypeScript compatibility. This approach allows `None` to be
 * used as an `IOption<T>` without requiring a generic type argument.
 */
const _some: IOption<number> = new Some(1);
const _none: IOption<number> = new None();
