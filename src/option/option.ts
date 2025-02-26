import { isOption, isResult, isPromise, stringify, noop } from "../__internal";
import { AnyError } from "../error";
import {
  err,
  ok,
  Result,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  type Ok,
  type Err,
  /* eslint-enable @typescript-eslint/no-unused-vars */
} from "../result";
import { MaybePromise } from "../types";
import {
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
  flatten<U>(this: Option<Option<U>>): Option<U>;
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
  replace(x: Promise<T>): readonly [Option<T>, Promise<void>];
  take(): Option<T>;
  takeIf(f: (x: T) => boolean): Option<T>;
  toPendingOption(): PendingOption<T>;
  toString(): string;
  transposeResult<U, E>(this: Option<Result<U, E>>): Result<Option<U>, E>;
  transposeAwaitable<U>(
    this: Option<PromiseLike<U>>,
  ): PendingOption<Awaited<U>>;
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

  /**
   * Returns {@link None} if the option is {@link None}, otherwise returns `x`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none();
   *
   * expect(x.and(some(3)).toStrictEqual(some(3));
   * expect(x.and(none()).toStrictEqual(none());
   * expect(y.and(some(3)).toStrictEqual(none());
   * expect(y.and(none()).toStrictEqual(none());
   * ```
   */
  and<U>(x: Option<U>): Option<U>;
  /**
   * Returns {@link PendingOption} with {@link None} if the promise resolves to
   * {@link None} , otherwise returns {@link PendingOption} with `x`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none();
   *
   * expect(x.and(Promise.resolve(some(3))).toBeInstanceOf(PendingOption);
   * expect(await x.and(Promise.resolve(some(3))).toStrictEqual(some(3));
   * expect(await x.and(Promise.resolve(none())).toStrictEqual(none());
   * expect(await y.and(Promise.resolve(some(3))).toStrictEqual(none());
   * expect(await y.and(Promise.resolve(none())).toStrictEqual(none());
   * ```
   */
  and<U>(x: Promise<Option<U>>): PendingOption<U>;
  and<U>(x: MaybePromise<Option<U>>): MaybePendingOption<U> {
    if (isPromise(x)) {
      return this.toPendingOption().and(x);
    }

    return this.isNone() ? none() : x;
  }

  /**
   * Applies `f` to the contained value if {@link Some}, returning its result; otherwise,
   * returns {@link None}. Also known as flatMap.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.andThen(n => some(n * 2))).toStrictEqual(some(4));
   * expect(x.andThen(_ => none())).toStrictEqual(none());
   * expect(y.andThen(n => some(n * 2))).toStrictEqual(none());
   * ```
   */
  andThen<U>(f: (x: T) => Option<U>): Option<U>;
  /**
   * Applies `f` to the contained value if {@link Some}, returning a {@link PendingOption}
   * with its async result; otherwise, returns {@link PendingOption} with {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.andThen(n => Promise.resolve(some(n * 2)))).toBeInstanceOf(PendingOption);
   * expect(await x.andThen(n => Promise.resolve(some(n * 2)))).toStrictEqual(some(4));
   * expect(await x.andThen(_ => Promise.resolve(none()))).toStrictEqual(none());
   * expect(await y.andThen(n => Promise.resolve(some(n * 2)))).toStrictEqual(none());
   * ```
   */
  andThen<U>(f: (x: T) => Promise<Option<U>>): PendingOption<U>;
  andThen<U>(f: (x: T) => MaybePromise<Option<U>>): MaybePendingOption<U> {
    if (this.isNone()) {
      return none();
    }

    const option = f(this.value);
    return isPromise(option) ? pendingOption(option) : option;
  }

  /**
   * Returns a shallow copy of the {@link Option}.
   *
   * ### Example
   * ```ts
   * const x = some({ a: 1 });
   * const y = none<{ a: number }>();
   *
   * expect(x.clone()).toStrictEqual(some({ a: 1 }));
   * expect(x.clone()).not.toBe(x); // Different reference
   * expect(y.clone()).toStrictEqual(none());
   * ```
   */
  clone(): Option<T> {
    return this.isNone() ? none() : some(this.value);
  }

  /**
   * Returns the contained value if {@link Some}, or throws {@link AnyError}
   * with the provided message (or a default) if {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(42);
   * const y = none<number>();
   *
   * expect(x.expect("Missing value")).toBe(42);
   * expect(() => y.expect("Missing value")).toThrow("Missing value");
   * expect(() => y.expect()).toThrow(); // Default message
   * ```
   */
  expect(msg?: string): T {
    if (this.isSome()) {
      return this.value;
    }

    throw new AnyError(
      msg ?? "`expect` is called on `None`",
      OptionError.ExpectNone,
    );
  }

  /**
   * Returns the option if {@link Some} and `f` returns `true`, otherwise returns {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.filter(n => n > 0)).toStrictEqual(some(2));
   * expect(x.filter(n => n < 0)).toStrictEqual(none());
   * expect(y.filter(n => n > 0)).toStrictEqual(none());
   * ```
   */
  filter(f: (x: T) => boolean): Option<T> {
    if (this.isNone()) {
      return none();
    }

    return f(this.value) ? some(this.value) : none();
  }

  /**
   * Flattens an {@link Option} of an {@link Option} into a single {@link Option}.
   *
   * Think of it as of unwrapping a box inside a box.
   *
   * ### Example
   * ```ts
   * const x: Option<Option<Option<number>>> = some(some(some(6)));
   * const y: Option<Option<number>> = x.flatten();
   * const z = none<Option<number>>();
   *
   * expect(x.flatten()).toStrictEqual(some(some(6)));
   * expect(y.flatten()).toStrictEqual(none());
   * expect(z.flatten()).toStrictEqual(none());
   * ```
   */
  flatten<U>(this: Option<Option<U>>): Option<U> {
    if (this.isNone()) {
      return none();
    }

    if (isOption(this.value)) {
      return this.value.clone();
    }

    return some(this.value);
  }

  /**
   * Returns the contained value if {@link Some}, or inserts and returns `x`
   * if {@link None}.
   *
   * See also {@link insert} method, which updates the value even if the option
   * already contains {@link Some}.
   *
   * #### Note
   * This method mutates the option.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.getOrInsert(5)).toBe(2);
   * expect(y.getOrInsert(5)).toBe(5);
   * expect(y).toStrictEqual(some(5)); // y is mutated
   * ```
   */
  getOrInsert(x: T): T {
    if (this.isNone()) {
      this.#setValue(x);
    }

    return this.value;
  }

  /**
   * Returns the contained value if {@link Some}, or inserts and returns the
   * result of `f` if {@link None}.
   *
   * #### Note
   * This method mutates the option.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.getOrInsertWith(() => 5)).toBe(2);
   * expect(y.getOrInsertWith(() => 5)).toBe(5);
   * expect(y).toStrictEqual(some(5)); // y is mutated
   * ```
   */
  getOrInsertWith(f: () => T): T {
    if (this.isNone()) {
      this.#setValue(f());
    }

    return this.value;
  }

  /**
   * Inserts `x` into the option and returns it, overwriting any existing value.
   *
   * See also {@link getOrInsert} method, which doesn’t update the value if the
   * option already contains {@link Some}.
   *
   * #### Note
   * This method mutates the option.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.insert(5)).toBe(5);
   * expect(x).toStrictEqual(some(5));
   * expect(y.insert(5)).toBe(5);
   * expect(y).toStrictEqual(some(5));
   * ```
   */
  insert(x: T): T {
    this.#setValue(x);

    return this.value;
  }

  /**
   * Calls `f` with the contained value if {@link Some}, then returns the original option.
   *
   * ### Note
   * Returns a new {@link Option} instance with the same value as the original, rather
   * than the exact same reference. The returned option is a distinct object, preserving
   * the original value.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   * let sideEffect = 0;
   *
   * expect(x.inspect(n => (sideEffect = n))).toStrictEqual(some(2));
   * expect(sideEffect).toBe(2);
   * expect(y.inspect(n => (sideEffect = n))).toStrictEqual(none());
   * expect(sideEffect).toBe(2); // Unchanged
   * ```
   */
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

  /**
   * Returns `true` if the option is {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.isNone()).toBe(false);
   * expect(y.isNone()).toBe(true);
   * ```
   */
  isNone(): this is None<T> {
    return this.#getValue() === _nothing_;
  }

  /**
   * Returns `true` if the option is {@link None} or if `f` returns `true` for the contained value.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.isNoneOr(n => n > 0)).toBe(true);
   * expect(x.isNoneOr(n => n < 0)).toBe(false);
   * expect(y.isNoneOr(n => n > 0)).toBe(true);
   * ```
   */
  isNoneOr(f: (x: T) => boolean): boolean {
    return this.isNone() || f(this.value);
  }

  /**
   * Returns `true` if the option is {@link Some}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.isSome()).toBe(true);
   * expect(y.isSome()).toBe(false);
   * ```
   */
  isSome(): this is Some<T> {
    return !this.isNone();
  }

  /**
   * Returns `true` if the option is {@link Some} and `f` returns `true` for the contained value.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.isSomeAnd(n => n > 0)).toBe(true);
   * expect(x.isSomeAnd(n => n < 0)).toBe(false);
   * expect(y.isSomeAnd(n => n > 0)).toBe(false);
   * ```
   */
  isSomeAnd(f: (x: T) => boolean): this is Some<T> & boolean {
    return this.isSome() && f(this.value);
  }

  /**
   * Maps the contained value with `f` if {@link Some}, returning a new {@link Option}; otherwise,
   * returns {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.map(n => n * 2)).toStrictEqual(some(4));
   * expect(y.map(n => n * 2)).toStrictEqual(none());
   * ```
   */
  map<U>(f: (x: T) => U): Option<U> {
    if (this.isNone()) {
      return none();
    }

    return some(f(this.value));
  }

  /**
   * Returns `f` applied to the contained value if {@link Some}, otherwise returns `def`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.mapOr(0, n => n * 2)).toBe(4);
   * expect(y.mapOr(0, n => n * 2)).toBe(0);
   * ```
   */
  mapOr<U>(def: U, f: (x: T) => U): U {
    if (this.isNone()) {
      return def;
    }

    return f(this.value);
  }

  /**
   * Returns `f` applied to the contained value if {@link Some}, otherwise returns the result of `mkDef`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.mapOrElse(() => 0, n => n * 2)).toBe(4);
   * expect(y.mapOrElse(() => 0, n => n * 2)).toBe(0);
   * ```
   */
  mapOrElse<U>(mkDef: () => U, f: (x: T) => U): U {
    if (this.isNone()) {
      return mkDef();
    }

    return f(this.value);
  }

  /**
   * Matches the option, returning `f` applied to the value if {@link Some}, or `g` if {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.match(n => n * 2, () => 0)).toBe(4);
   * expect(y.match(n => n * 2, () => 0)).toBe(0);
   * ```
   */
  match<U, F = U>(f: (x: T) => U, g: () => F): U | F {
    return this.isSome() ? f(this.value) : g();
  }

  /**
   * Converts to a {@link Result}, using `y` as the error value if {@link None}.
   *
   * {@link Some | Some(v)} is mapped to {@link Ok | Ok(v)} and {@link None} to {@link Err | Err(y)}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.okOr("error")).toStrictEqual(ok(2));
   * expect(y.okOr("error")).toStrictEqual(err("error"));
   * ```
   */
  okOr<E>(y: E): Result<T, E> {
    return this.isSome() ? ok(this.value) : err(y);
  }

  /**
   * Converts to a {@link Result}, using the result of `mkErr` as the error value if {@link None}.
   *
   * {@link Some | Some(v)} is mapped to {@link Ok | Ok(v)} and {@link None} to {@link Err | Err(mkErr())}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.okOrElse(() => "error")).toStrictEqual(ok(2));
   * expect(y.okOrElse(() => "error")).toStrictEqual(err("error"));
   * ```
   */
  okOrElse<E>(mkErr: () => E): Result<T, E> {
    return this.isSome() ? ok(this.value) : err(mkErr());
  }

  /**
   * Returns the current option if it is {@link Some}, otherwise returns `x`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.or(some(3))).toStrictEqual(some(2));
   * expect(x.or(none())).toStrictEqual(some(2));
   * expect(y.or(some(3))).toStrictEqual(some(3));
   * expect(y.or(none())).toStrictEqual(none());
   * ```
   */
  or(x: Option<T>): Option<T>;
  /**
   * Returns a {@link PendingOption} with the current value if this option is
   * {@link Some}, otherwise with `x`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.or(Promise.resolve(some(3)))).toBeInstanceOf(PendingOption);
   * expect(await x.or(Promise.resolve(some(3)))).toStrictEqual(some(2));
   * expect(await y.or(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await y.or(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  or(x: Promise<Option<T>>): PendingOption<T>;
  or(x: MaybePromise<Option<T>>): MaybePendingOption<T> {
    if (isPromise(x)) {
      return this.toPendingOption().or(x);
    }

    return this.isSome() ? some(this.value) : x;
  }

  /**
   * Returns the current option if {@link Some}, otherwise returns the result of `f`.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.orElse(() => some(3))).toStrictEqual(some(2));
   * expect(y.orElse(() => some(3))).toStrictEqual(some(3));
   * expect(y.orElse(() => none())).toStrictEqual(none());
   * ```
   */
  orElse(f: () => Option<T>): Option<T> {
    return this.isSome() ? some(this.value) : f();
  }

  /**
   * Replaces the current value with `x` and returns the old option.
   *
   * #### Note
   * This method mutates the option.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.replace(5)).toStrictEqual(some(2));
   * expect(x).toStrictEqual(some(5));
   * expect(y.replace(5)).toStrictEqual(none());
   * expect(y).toStrictEqual(some(5)); // y is mutated
   * ```
   */
  replace(x: T): Option<T>;
  /**
   * Special case of {@link replace} for async `x`.
   *
   * Asynchronously replaces the current {@link Option} with the resolved value of `x`,
   * returning the original value and a {@link Promise} that triggers the replacement.
   *
   * Since `x` is a {@link Promise} that resolves asynchronously, this method defers the
   * update until `x` resolves. It:
   * 1. Captures the current {@link Option} (either {@link Some} or {@link None}).
   * 2. Returns a tuple where:
   *    - The first element is the original {@link Option} before any changes.
   *    - The second element is a {@link Promise} that, when awaited, mutates this
   *      {@link Option} to {@link Some} containing the resolved value of `x`.
   * 3. If `x` rejects, no mutation occurs, and the option remains unchanged.
   *
   * This is an asynchronous variant of {@link Option.replace}, designed for deferred
   * updates with pending values.
   *
   * ### Note
   * This method mutates the original {@link Option}, but the mutation is deferred until
   * the returned {@link Promise} resolves successfully. The option remains in its
   * original state until then.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * const xResult = x.replace(Promise.resolve(5));
   * const yResult = y.replace(Promise.resolve(3));
   *
   * // Check tuple structure
   * expect(xResult).toHaveLength(2);
   * expect(xResult[0]).toStrictEqual(some(2)); // Original value
   * expect(xResult[1]).toBeInstanceOf(Promise);
   * expect(x.isSome()).toBe(true); // x unchanged until promise resolves
   * await xResult[1]; // Trigger mutation
   * expect(x).toStrictEqual(some(5)); // x is now Some(5)
   *
   * expect(yResult).toHaveLength(2);
   * expect(yResult[0]).toStrictEqual(none()); // Original value
   * expect(yResult[1]).toBeInstanceOf(Promise);
   * expect(y.isNone()).toBe(true); // y unchanged until promise resolves
   * await yResult[1]; // Trigger mutation
   * expect(y).toStrictEqual(some(3)); // y is now Some(3)
   * ```
   */
  replace(x: Promise<T>): readonly [Option<T>, Promise<void>];
  replace(x: MaybePromise<T>): Option<T> | readonly [Option<T>, Promise<void>] {
    if (isPromise(x)) {
      const promise = x.then((val) => {
        this.#setValue(val);
      }, noop);

      return [this.clone(), promise];
    }

    const value = this.#replaceValue(x);

    return isNothing(value) ? none() : some(value);
  }

  /**
   * Takes the value out of the option, leaving {@link None} in its place.
   *
   * #### Note
   * This method mutates the option.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.take()).toStrictEqual(some(2));
   * expect(x).toStrictEqual(none());
   * expect(y.take()).toStrictEqual(none());
   * expect(y).toStrictEqual(none());
   * ```
   */
  take(): Option<T> {
    if (this.isNone()) {
      return none();
    }

    const value = this.#takeValue();
    return isNothing(value) ? none() : some(value);
  }

  /**
   * Takes the value if {@link Some} and `f` returns `true`, leaving {@link None} otherwise.
   *
   * #### Note
   * This method mutates the option.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.takeIf(n => n > 0)).toStrictEqual(some(2));
   * expect(x).toStrictEqual(none());
   * expect(x.takeIf(n => n < 0)).toStrictEqual(none());
   * expect(y.takeIf(n => n > 0)).toStrictEqual(none());
   * ```
   */
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

  /**
   * Converts the option to a {@link PendingOption}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.toPendingOption()).toBeInstanceOf(PendingOption);
   * expect(await x.toPendingOption()).toStrictEqual(some(2));
   * expect(await y.toPendingOption()).toStrictEqual(none());
   * ```
   */
  toPendingOption(): PendingOption<T> {
    return pendingOption(this.clone());
  }

  /**
   * Returns a string representation of the option.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.toString()).toBe("Some { 2 }");
   * expect(y.toString()).toBe("None");
   * ```
   */
  toString(): string {
    return this.isNone() ? "None" : `Some { ${stringify(this.#getValue())} }`;
  }

  /**
   * Transposes an {@link Option} of a {@link Result} into a {@link Result} of an {@link Option}.
   *
   * {@link None} will be mapped to {@link Ok}({@link None}).
   * {@link Some}({@link Ok | Ok(_)}) and {@link Some}({@link Err | Err(_)})
   * will be mapped to {@link Ok}({@link Some | Some(_)}) and {@link Err | Err(_)}.
   *
   * ### Example
   * ```ts
   * const x = some(ok(2));
   * const y = some(err("error"));
   * const z = none<Result<number, string>>();
   *
   * expect(x.transposeResult()).toStrictEqual(ok(some(2)));
   * expect(y.transposeResult()).toStrictEqual(err("error"));
   * expect(z.transposeResult()).toStrictEqual(ok(none()));
   * ```
   */
  transposeResult<V, E>(this: Option<Result<V, E>>): Result<Option<V>, E> {
    if (this.isNone() || !isResult(this.value)) {
      return ok(none<V>());
    }

    return this.value.isOk()
      ? ok(some(this.value.value))
      : err(this.value.error);
  }

  /**
   * Transposes an {@link Option} of a {@link PromiseLike} into a
   * {@link PendingOption} of {@link Awaited}.
   *
   * ### Example
   * ```ts
   * const x: Option<Promise<Promise<string | number>>> = getOption();
   * const y: PendingOption<string | number> = x.transposeAwaitable();
   *
   * const a: Option<Promise<PendingOption<number>>> = getOption();
   * const b: PendingOption<Option<number>> = a.transposeAwaitable();
   * ```
   */
  transposeAwaitable<V>(
    this: Option<PromiseLike<V>>,
  ): PendingOption<Awaited<V>> {
    if (this.isNone()) {
      return pendingOption(none());
    }

    return pendingOption(Promise.resolve(this.value).then(some));
  }

  /**
   * Returns the contained value if {@link Some}, or throws {@link AnyError} if {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrap()).toBe(2);
   * expect(() => y.unwrap()).toThrow("`unwrap` is called on `None`");
   * ```
   */
  unwrap(): T {
    if (this.isSome()) {
      return this.value;
    }

    throw new AnyError("`unwrap` is called on `None`", OptionError.UnwrapNone);
  }

  /**
   * Returns the contained value if {@link Some}, or `def` if {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrapOr(0)).toBe(2);
   * expect(y.unwrapOr(0)).toBe(0);
   * ```
   */
  unwrapOr(def: T): T {
    return this.isSome() ? this.value : def;
  }

  /**
   * Returns the contained value if {@link Some}, or the result of `mkDef` if {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.unwrapOrElse(() => 0)).toBe(2);
   * expect(y.unwrapOrElse(() => 0)).toBe(0);
   * ```
   */
  unwrapOrElse(mkDef: () => T): T {
    return this.isSome() ? this.value : mkDef();
  }

  /**
   * Returns {@link Some} if exactly one of `this` or `y` is {@link Some}, otherwise returns {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.xor(some(3))).toStrictEqual(none());
   * expect(x.xor(none())).toStrictEqual(some(2));
   * expect(y.xor(some(3))).toStrictEqual(some(3));
   * expect(y.xor(none())).toStrictEqual(none());
   * ```
   */
  xor(y: Option<T>): Option<T>;
  /**
   * Returns a {@link PendingOption} with {@link Some} if exactly one of `this` or `y` is
   * {@link Some}, otherwise with {@link None}.
   *
   * ### Example
   * ```ts
   * const x = some(2);
   * const y = none<number>();
   *
   * expect(x.xor(Promise.resolve(some(3)))).toBeInstanceOf(PendingOption);
   * expect(await x.xor(Promise.resolve(some(3)))).toStrictEqual(none());
   * expect(await x.xor(Promise.resolve(none()))).toStrictEqual(some(2));
   * expect(await y.xor(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * ```
   */
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
