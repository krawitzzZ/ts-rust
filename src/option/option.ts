import { isOption, isResult, stringify } from "../__internal";
import { AnyError } from "../error";
import { err, ok, Result } from "../result";
import { FlattenedOption, IOption, Option } from "./interface";

const nothing: unique symbol = Symbol("None");
const isNothing = (x: unknown): x is Nothing => x === nothing;
type Nothing = typeof nothing;

export abstract class AwaitableOption<T> implements IOption<T> {
  #value: T | Nothing = nothing;

  protected abstract promise: Promise<Option<T>>;

  protected get innerValue(): T {
    if (isNothing(this.#value)) {
      throw new AnyError(
        "`value` is accessed on `None`",
        OptionError.NoneValueAccess,
      );
    }

    return this.#value;
  }

  constructor(value?: T) {
    if (arguments.length > 0) {
      this.#value = value as T;
    }
  }

  and<U>(x: Option<U>): Option<U> {
    return this.isNone() ? none() : x;
  }

  andThen<U>(f: (x: T) => Option<U>): Option<U> {
    return this.isNone() ? none() : f(this.innerValue);
  }

  clone(): Option<T> {
    return this.isNone() ? none() : some(this.innerValue);
  }

  expect(msg?: string): T {
    if (this.isSome()) {
      return this.innerValue;
    }

    throw new AnyError(
      msg ?? "`expect` is called on `None`",
      OptionError.ExpectNone,
    );
  }

  filter(f: (x: T) => boolean): Option<T> {
    if (this.isNone()) {
      return none();
    }

    return f(this.innerValue) ? some(this.innerValue) : none();
  }

  flatten(): FlattenedOption<T> {
    if (this.isNone()) {
      return none() as FlattenedOption<T>;
    }

    if (isOption(this.innerValue)) {
      return this.innerValue.clone() as FlattenedOption<T>;
    }

    return some(this.innerValue) as FlattenedOption<T>;
  }

  getOrInsert(x: T): T {
    if (this.isNone()) {
      this.#setValue(x);
    }

    return this.innerValue;
  }

  getOrInsertWith(f: () => T): T {
    if (this.isNone()) {
      this.#setValue(f());
    }

    return this.innerValue;
  }

  insert(x: T): T {
    this.#setValue(x);

    return this.innerValue;
  }

  inspect(f: (x: T) => unknown): Option<T> {
    if (this.isSome()) {
      try {
        f(this.innerValue);
      } catch {
        // do not care about the error
      }
    }

    return some(this.innerValue);
  }

  isNone(): this is None<T> {
    return !this.isSome();
  }

  isNoneOr(f: (x: T) => boolean): boolean {
    return this.isNone() || f(this.innerValue);
  }

  isSome(): this is Some<T> {
    try {
      return !isNothing(this.innerValue);
    } catch {
      return false;
    }
  }

  isSomething(): this is Some<T> {
    try {
      return !isNothing(this.innerValue);
    } catch {
      return false;
    }
  }

  isSomeAnd(f: (x: T) => boolean): this is Some<T> & boolean {
    return this.isSome() && f(this.innerValue);
  }

  map<U>(f: (x: T) => U): Option<U> {
    if (this.isNone()) {
      return none();
    }

    return some(f(this.innerValue));
  }

  mapOr<U>(def: U, f: (x: T) => U): U {
    if (this.isNone()) {
      return def;
    }

    return f(this.innerValue);
  }

  mapOrElse<U>(mkDef: () => U, f: (x: T) => U): U {
    if (this.isNone()) {
      return mkDef();
    }

    return f(this.innerValue);
  }

  match<U, F = U>(f: (x: T) => U, g: () => F): U | F {
    return this.isSome() ? f(this.innerValue) : g();
  }

  okOr<E>(y: E): Result<T, E> {
    return this.isSome() ? ok(this.innerValue) : err(y);
  }

  okOrElse<E>(mkErr: () => E): Result<T, E> {
    return this.isSome() ? ok(this.innerValue) : err(mkErr());
  }

  or(x: Option<T>): Option<T> {
    return this.isSome() ? some(this.innerValue) : x;
  }

  orElse(f: () => Option<T>): Option<T> {
    return this.isSome() ? some(this.innerValue) : f();
  }

  replace(x: T): Option<T> {
    const value = this.#replaceValue(x);

    return isNothing(value) ? none() : some(value);
  }

  take(): Option<T> {
    if (this.isNone()) {
      return none();
    }

    const value = this.#takeValue();
    return isNothing(value) ? none() : some(value);
  }

  takeIf(f: (x: T) => boolean): Option<T> {
    if (this.isNone()) {
      return none();
    }

    if (f(this.innerValue)) {
      const value = this.#takeValue();
      return isNothing(value) ? none() : some(value);
    }

    return none();
  }

  toString(): string {
    return this.isNone() ? "None" : `Some { ${stringify(this.#value)} }`;
  }

  // TODO(nikita.demin): test if types are correct
  transpose<E>(this: Some<Result<T, E>>): Result<Option<T>, E> {
    if (this.isNone()) {
      return ok(none<T>());
    }

    if (!isResult(this.innerValue)) {
      return ok(none<T>());
    }

    return this.innerValue.isOk()
      ? ok(some(this.innerValue.value))
      : err(this.innerValue.error);
  }

  unwrap(): T {
    if (this.isSome()) {
      return this.innerValue;
    }

    throw new AnyError("`unwrap` is called on `None`", OptionError.UnwrapNone);
  }

  unwrapOr(def: T): T {
    return this.isSome() ? this.innerValue : def;
  }

  unwrapOrElse(mkDef: () => T): T {
    return this.isSome() ? this.innerValue : mkDef();
  }

  xor(y: Option<T>): Option<T> {
    if (this.isNone() && y.isSome()) {
      return some(y.value);
    }

    if (y.isNone() && this.isSome()) {
      return some(this.innerValue);
    }

    return none();
  }

  /**
   * Returns the value of the option.
   */
  #getValue(): T | Nothing {
    return this.#value;
  }

  /**
   * Sets the value of the option.
   */
  #setValue(value: T | Nothing): void {
    this.#value = value;
  }

  /**
   * Replaces the value of the option with a new one.
   *
   * Returns the old value.
   */
  #replaceValue(newValue: T | Nothing): T | Nothing {
    const oldValue = this.#getValue();
    this.#setValue(newValue);

    return oldValue;
  }

  /**
   * Takes the value of the option, leaving {@link nothing} in its place.
   *
   * Returns the old value.
   */
  #takeValue(): T | Nothing {
    return this.#replaceValue(nothing);
  }
}

export class Some<T> extends AwaitableOption<T> {
  protected override promise: Promise<Option<T>> = Promise.resolve(this);

  get value(): T {
    return this.innerValue;
  }
}

export class None<T> extends AwaitableOption<T> {
  protected override promise: Promise<Option<T>> = Promise.resolve(this);
}

export function some<T>(value: T): Option<T> {
  return new Some(value);
}

export function none<T>(): Option<T> {
  return new None();
}

export enum OptionError {
  NoneValueAccess = "NoneValueAccess",
  ExpectNone = "ExpectNone",
  UnwrapNone = "UnwrapNone",
}
