import { isOption, isResult, isPromise, stringify } from "../__internal";
import { AnyError } from "../error";
import { err, ok, Result, IsResult, OkValue } from "../result";
import { Awaitable, MaybePromise } from "../types";
import {
  FlattenedOption,
  MaybePendingOption,
  Option,
  OptionError,
  PendingOption,
  pendingOption,
} from "./index";

const _some_: unique symbol = Symbol("Some");
const _none_: unique symbol = Symbol("None");
const _nothing_: unique symbol = Symbol("Nothing");
const isNothing = (x: unknown): x is NothingT => x === _nothing_;

type SomeT = typeof _some_;
type NoneT = typeof _none_;
type NothingT = typeof _nothing_;

type IOption<T> = {
  and<U>(x: Option<U>): Option<U>;
  and<U>(x: Promise<Option<U>>): PendingOption<U>;
  andThen<U>(f: (x: T) => Option<U>): Option<U>;
  andThen<U>(f: (x: T) => Promise<Option<U>>): PendingOption<U>;
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
  or(x: Promise<Option<T>>): PendingOption<T>;
  orElse(f: () => Option<T>): Option<T>;
  replace(x: T): Option<T>;
  replace(x: Promise<T>): PendingOption<T>;
  take(): Option<T>;
  takeIf(f: (x: T) => boolean): Option<T>;
  toPendingOption(): PendingOption<T>;
  toString(): string;
  transposeResult<E>(
    this: Option<IsResult<T, E>>,
  ): Result<Option<OkValue<T, E>>, E>;
  transposeAwaitable(this: Option<Awaitable<T>>): PendingOption<Awaited<T>>;
  unwrap(): T;
  unwrapOr(def: T): T;
  unwrapOrElse(mkDef: () => T): T;
  xor(y: Option<T>): Option<T>;
  xor(y: Promise<Option<T>>): PendingOption<T>;
};

abstract class AbstractOption<T> implements IOption<T> {
  #value: T | NothingT = _nothing_;

  protected abstract readonly type: NothingT | SomeT | NoneT;

  protected get value(): T {
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

  and<U>(x: Option<U>): Option<U>;
  and<U>(x: Promise<Option<U>>): PendingOption<U>;
  and<U>(x: MaybePromise<Option<U>>): MaybePendingOption<U> {
    if (isPromise(x)) {
      return this.toPendingOption().and(x);
    }

    return this.isNone() ? none() : x;
  }

  andThen<U>(f: (x: T) => Option<U>): Option<U>;
  andThen<U>(f: (x: T) => Promise<Option<U>>): PendingOption<U>;
  andThen<U>(f: (x: T) => MaybePromise<Option<U>>): MaybePendingOption<U> {
    if (this.isNone()) {
      return none();
    }

    const option = f(this.value);
    return isPromise(option) ? pendingOption(option) : option;
  }

  clone(): Option<T> {
    return this.isNone() ? none() : some(this.value);
  }

  expect(msg?: string): T {
    if (this.isSome()) {
      return this.value;
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

    return f(this.value) ? some(this.value) : none();
  }

  flatten(): FlattenedOption<T> {
    if (this.isNone()) {
      return none() as FlattenedOption<T>;
    }

    if (isOption(this.value)) {
      return this.value.clone() as FlattenedOption<T>;
    }

    return some(this.value) as FlattenedOption<T>;
  }

  getOrInsert(x: T): T {
    if (this.isNone()) {
      this.#setValue(x);
    }

    return this.value;
  }

  getOrInsertWith(f: () => T): T {
    if (this.isNone()) {
      this.#setValue(f());
    }

    return this.value;
  }

  insert(x: T): T {
    this.#setValue(x);

    return this.value;
  }

  inspect(f: (x: T) => unknown): Option<T> {
    if (this.isSome()) {
      try {
        f(this.value);
      } catch {
        // do not care about the error
      }
    }

    return some(this.value);
  }

  isNone(): this is None<T> {
    return !this.isSome();
  }

  isNoneOr(f: (x: T) => boolean): boolean {
    return this.isNone() || f(this.value);
  }

  isSome(): this is Some<T> {
    try {
      return !isNothing(this.value);
    } catch {
      return false;
    }
  }

  isSomeAnd(f: (x: T) => boolean): this is Some<T> & boolean {
    return this.isSome() && f(this.value);
  }

  map<U>(f: (x: T) => U): Option<U> {
    if (this.isNone()) {
      return none();
    }

    return some(f(this.value));
  }

  mapOr<U>(def: U, f: (x: T) => U): U {
    if (!this.isSome()) {
      return def;
    }

    return f(this.value);
  }

  mapOrElse<U>(mkDef: () => U, f: (x: T) => U): U {
    if (!this.isSome()) {
      return mkDef();
    }

    return f(this.value);
  }

  match<U, F = U>(f: (x: T) => U, g: () => F): U | F {
    return this.isSome() ? f(this.value) : g();
  }

  okOr<E>(y: E): Result<T, E> {
    return this.isSome() ? ok(this.value) : err(y);
  }

  okOrElse<E>(mkErr: () => E): Result<T, E> {
    return this.isSome() ? ok(this.value) : err(mkErr());
  }

  or(x: Option<T>): Option<T>;
  or(x: Promise<Option<T>>): PendingOption<T>;
  or(x: MaybePromise<Option<T>>): MaybePendingOption<T> {
    if (isPromise(x)) {
      return this.toPendingOption().or(x);
    }

    return this.isSome() ? some(this.value) : x;
  }

  orElse(f: () => Option<T>): Option<T> {
    return this.isSome() ? some(this.value) : f();
  }

  replace(x: T): Option<T>;
  replace(x: Promise<T>): PendingOption<T>;
  replace(x: MaybePromise<T>): MaybePendingOption<T> {
    if (isPromise(x)) {
      return this.toPendingOption().replace(x);
    }

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

    if (f(this.value)) {
      const value = this.#takeValue();
      return isNothing(value) ? none() : some(value);
    }

    return none();
  }

  toPendingOption(): PendingOption<T> {
    return pendingOption(this.clone());
  }

  toString(): string {
    return this.isNone() ? "None" : `Some { ${stringify(this.#value)} }`;
  }

  transposeResult<E>(
    this: Option<IsResult<T, E>>,
  ): Result<Option<OkValue<T, E>>, E> {
    if (this.isNone() || !isResult(this.value)) {
      return ok(none<OkValue<T, E>>());
    }

    return this.value.isOk()
      ? ok(some(this.value.value as OkValue<T, E>))
      : err(this.value.error);
  }

  transposeAwaitable(this: Option<Awaitable<T>>): PendingOption<Awaited<T>> {
    if (this.isNone()) {
      return pendingOption(none());
    }

    if (isPromise(this.value)) {
      return pendingOption(
        this.value.then((value) => some(value as Awaited<T>)),
      );
    }

    return pendingOption(some(this.value));
  }

  unwrap(): T {
    if (this.isSome()) {
      return this.value;
    }

    throw new AnyError("`unwrap` is called on `None`", OptionError.UnwrapNone);
  }

  unwrapOr(def: T): T {
    return this.isSome() ? this.value : def;
  }

  unwrapOrElse(mkDef: () => T): T {
    return this.isSome() ? this.value : mkDef();
  }

  xor(y: Option<T>): Option<T>;
  xor(y: Promise<Option<T>>): PendingOption<T>;
  xor(y: MaybePromise<Option<T>>): MaybePendingOption<T> {
    if (isPromise(y)) {
      return this.toPendingOption().xor(y);
    }

    if (this.isNone() && y.isSome()) {
      return some(y.get());
    }

    if (this.isSome() && y.isNone()) {
      return some(this.value);
    }

    return none();
  }

  /**
   * Returns the value of the option.
   */
  #getValue(): T | NothingT {
    return this.#value;
  }

  /**
   * Sets the value of the option.
   */
  #setValue(value: T | NothingT): void {
    this.#value = value;
  }

  /**
   * Replaces the value of the option with a new one.
   *
   * Returns the old value.
   */
  #replaceValue(newValue: T | NothingT): T | NothingT {
    const oldValue = this.#getValue();
    this.#setValue(newValue);

    return oldValue;
  }

  /**
   * Takes the value of the option, leaving {@link _nothing_} in its place.
   *
   * Returns the old value.
   */
  #takeValue(): T | NothingT {
    return this.#replaceValue(_nothing_);
  }
}

export class Some<T> extends AbstractOption<T> {
  protected override readonly type: SomeT = _some_;

  get(): T {
    return this.value;
  }
}

export class None<T> extends AbstractOption<T> {
  protected override readonly type: NoneT = _none_;
}

export function some<T>(value: T): Option<T> {
  return new Some(value);
}

export function none<T>(): Option<T> {
  return new None();
}
