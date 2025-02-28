import {
  MaybePromise,
  isPromise,
  stringify,
  noop,
  promisify,
} from "@ts-rust/internal";
import { AnyError } from "../error";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Result, Ok, Err, err, ok, isResult } from "../result";
import {
  IOption,
  Option,
  PendingOption,
  Some,
  None,
  phantom,
} from "./interface";

/**
 * Creates a {@link Some} variant of an {@link Option} containing the given value.
 *
 * ### Example
 * ```ts
 * const x = some(42);
 * expect(x.isSome()).toBe(true);
 * expect(x.expect("Not 42")).toBe(42);
 * ```
 */
export function some<T>(value: T): Option<T> {
  return _Option.some(value);
}

/**
 * Creates a {@link None} variant of an {@link Option}, representing the absence of a value.
 *
 * ### Example
 * ```ts
 * const x = none<number>();
 * expect(x.isNone()).toBe(true);
 * expect(x.expect("x is `None`")).toThrow("x is `None`");
 * ```
 */
export function none<T>(): Option<T> {
  return _Option.none();
}

/* eslint-disable @typescript-eslint/unified-signatures */
/**
 * Creates a {@link PendingOption} from an {@link Option}.
 */
export function pendingOption<T>(option: Option<T>): PendingOption<T>;
/**
 * Creates a {@link PendingOption} by cloning an existing {@link PendingOption}.
 */
export function pendingOption<T>(option: PendingOption<T>): PendingOption<T>;
/**
 * Creates a {@link PendingOption} from a {@link PromiseLike} resolving to an {@link Option}.
 */
export function pendingOption<T>(
  option: PromiseLike<Option<T>>,
): PendingOption<T>;
export function pendingOption<T>(
  option: Option<T> | PendingOption<T> | PromiseLike<Option<T>>,
): PendingOption<T> {
  if (isPendingOption(option)) {
    return option.clone();
  }

  return _PendingOption.create(option);
}
/* eslint-enable @typescript-eslint/unified-signatures */

/**
 * Checks if a value is a {@link PendingOption}, narrowing its type to
 * `PendingOption<unknown>`.
 *
 * This type guard determines whether the input is an instance of the
 * {@link PendingOption} class, indicating it is a pending option that wraps a
 * {@link Promise} resolving to an {@link Option}.
 *
 * ### Example
 * ```ts
 * const x = pendingOption(some(42));
 * const y = pendingOption(none<number>());
 * const z = some(42); // Not a PendingOption
 *
 * expect(isPendingOption(x)).toBe(true);
 * expect(isPendingOption(y)).toBe(true);
 * expect(isPendingOption(z)).toBe(false);
 *
 * if (isPendingOption(x)) {
 *   expect(await x).toStrictEqual(some(42)); // Type narrowed to PendingOption<unknown>
 * }
 * ```
 */
export function isPendingOption(x: unknown): x is PendingOption<unknown> {
  return x instanceof _PendingOption;
}

/**
 * Checks if a value is an {@link Option}, narrowing its type to `Option<unknown>`.
 *
 * This type guard determines whether the input is an instance conforms
 * to the {@link Option} interface.
 *
 * ### Example
 * ```ts
 * const x = some(42);
 * const y = none<number>();
 * const z = "not an option";
 *
 * expect(isOption(x)).toBe(true);
 * expect(isOption(y)).toBe(true);
 * expect(isOption(z)).toBe(false);
 *
 * if (isOption(x)) {
 *   expect(x.isSome()).toBe(true); // Type narrowed to Option<unknown>
 * }
 * ```
 */
export function isOption(x: unknown): x is Option<unknown> {
  return x instanceof _Option;
}

/**
 * Enumerates error codes specific to {@link Option} operations.
 *
 * These codes are used in {@link AnyError} instances thrown by methods like
 * {@link Option.unwrap} or {@link Option.expect} when operations fail due to
 * the state of the option.
 */
export enum OptionErrorKind {
  NoneValueAccessed = "NoneValueAccessed",
  NoneExpected = "NoneExpected",
  NoneUnwrapped = "NoneUnwrapped",
  PredicateException = "PredicateException",
}

/**
 * Type that represents the absence of a value.
 *
 * This allows {@link Option | Options} to also contain values of type `null`
 * or `undefined`, e.g. `Option<null>` or `Option<undefined>`.
 */
type Nothing = typeof nothing;

type MaybePendingOption<T> = Option<T> | PendingOption<T>;

// const phantom: unique symbol = Symbol("OptionPhantom");
const nothing: unique symbol = Symbol("Nothing");
const isNothing = (x: unknown): x is Nothing => x === nothing;
const isSomething = <T>(x: T | Nothing): x is T => !isNothing(x);

/**
 * Internal implementation class for {@link Option}.
 *
 * Represents a value that may or may not be present.
 */
class _Option<T> implements IOption<T> {
  /**
   * Creates {@link Some} invariant of {@link Option} with provided value.
   */
  static some<T>(value: T): Option<T> {
    return new _Option(value);
  }

  /**
   * Creates {@link None} invariant of {@link Option}.
   */
  static none<T>(): Option<T> {
    return new _Option();
  }

  /**
   * A private symbol-keyed property used as a type discriminant.
   *
   * This field holds either `"some"` or `"none"` to indicate whether the
   * {@link Option} is a {@link Some} or {@link None} variant. It is not
   * intended for direct access or modification by users; instead, it serves as
   * an internal mechanism to enable TypeScript's type narrowing for methods
   * like {@link isSome} and {@link isNone}. The symbol key (`phantom`) ensures
   * this property remains private to the module, preventing external
   * interference while allowing the class to mutate its state (e.g., from
   * `None` to `Some`) as needed.
   */
  [phantom]: "some" | "none" = "none";

  /**
   * Private field holding the raw value of the {@link Option}.
   *
   * Stores either a value of type `T` for {@link Some} instances or the {@link Nothing}
   * symbol for {@link None} instances. This field is managed internally through the
   * private `#value` getter and setter to ensure type safety and encapsulation.
   */
  #x: T | Nothing = nothing;

  /**
   * Internal getter for the value that this Option holds.
   *
   * This getter shall be used **everywhere within this class** to access the value.
   *
   * **{@link value} getter should only be used to access the value from outside**.
   */
  get #value(): T | Nothing {
    return this.#x;
  }

  /**
   * Internal setter for the value that this Option holds.
   *
   * Takes care of keeping the internal state consistent by also updating the
   * {@link phantom} property.
   */
  set #value(value: T | Nothing) {
    this.#x = value;
    this[phantom] = isNothing(this.#x) ? "none" : "some";
  }

  /**
   * Property that is used to access the value of the {@link Option}.
   *
   * Only {@link Some} instances have a value, so accessing this property on
   * {@link None} will throw an {@link AnyError}.
   *
   * ## Throws
   * - {@link AnyError} if {@link value} is accessed on {@link None}.
   */
  get value(): T {
    if (isNothing(this.#value)) {
      throw new AnyError(
        "`value` is accessed on `None`",
        OptionErrorKind.NoneValueAccessed,
      );
    }

    return this.#value;
  }

  private constructor(value?: T) {
    // no arguments => `None` is created
    // argument provided => `Some` is created, even if it's undefined
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
    if (isNothing(this.#value)) {
      return none();
    }

    try {
      const option = f(this.#value);
      return isPromise(option) ? pendingOption(option) : option;
    } catch {
      return none();
    }
  }

  clone(): Option<T> {
    return isNothing(this.#value) ? none() : some(this.#value);
  }

  expect(msg?: string): T {
    if (isSomething(this.#value)) {
      return this.#value;
    }

    throw new AnyError(
      msg ?? "`expect` is called on `None`",
      OptionErrorKind.NoneExpected,
    );
  }

  filter(f: (x: T) => boolean): Option<T> {
    if (isNothing(this.#value)) {
      return none();
    }

    try {
      return f(this.#value) ? some(this.#value) : none();
    } catch {
      return none();
    }
  }

  flatten<U>(this: Option<Option<U>>): Option<U> {
    if (this.isNone()) {
      return none();
    }

    return this.value.clone();
  }

  getOrInsert(x: T): T {
    if (isNothing(this.#value)) {
      this.#value = x;
    }

    return this.#value;
  }

  getOrInsertWith(f: () => T): T {
    if (isNothing(this.#value)) {
      try {
        this.#value = f();
      } catch (e) {
        throw new AnyError(
          "getOrInsertWith callback threw an exception",
          OptionErrorKind.PredicateException,
          e,
        );
      }
    }

    return this.#value;
  }

  insert(x: T): T {
    this.#value = x;
    return this.#value;
  }

  inspect(f: (x: T) => unknown): Option<T> {
    if (isSomething(this.#value)) {
      try {
        f(this.#value);
      } catch {
        // do not care about the error
      }
    }

    return this.clone();
  }

  isNone(): this is None<T> {
    return isNothing(this.#value);
  }

  isNoneOr(f: (x: T) => boolean): boolean {
    if (isNothing(this.#value)) {
      return true;
    }

    try {
      return f(this.#value);
    } catch {
      return false;
    }
  }

  isSome(): this is Some<T> {
    return isSomething(this.#value);
  }

  isSomeAnd(f: (x: T) => boolean): this is Some<T> & boolean {
    if (isNothing(this.#value)) {
      return false;
    }

    try {
      return f(this.#value);
    } catch {
      return false;
    }
  }

  map<U>(f: (x: T) => U): Option<U> {
    if (isNothing(this.#value)) {
      return none();
    }

    try {
      return some(f(this.#value));
    } catch {
      return none();
    }
  }

  mapOr<U>(def: U, f: (x: T) => U): U {
    if (isNothing(this.#value)) {
      return def;
    }

    try {
      return f(this.#value);
    } catch {
      return def;
    }
  }

  mapOrElse<U>(mkDef: () => U, f: (x: T) => U): U {
    const makeDefault = () => {
      try {
        return mkDef();
      } catch (e) {
        throw new AnyError(
          "mapOrElse callback `mkDef` threw an exception",
          OptionErrorKind.PredicateException,
          e,
        );
      }
    };

    if (isNothing(this.#value)) {
      return makeDefault();
    }

    try {
      return f(this.#value);
    } catch {
      return makeDefault();
    }
  }

  match<U, F = U>(f: (x: T) => U, g: () => F): U | F {
    try {
      return isSomething(this.#value) ? f(this.#value) : g();
    } catch (e) {
      throw new AnyError(
        "one of match predicates threw an exception",
        OptionErrorKind.PredicateException,
        e,
      );
    }
  }

  okOr<E>(y: E): Result<T, E> {
    return isSomething(this.#value) ? ok(this.#value) : err(y);
  }

  okOrElse<E>(mkErr: () => E): Result<T, E> {
    return isSomething(this.#value) ? ok(this.#value) : err(mkErr());
  }

  or(x: Option<T>): Option<T>;
  or(x: Promise<Option<T>>): PendingOption<T>;
  or(x: MaybePromise<Option<T>>): MaybePendingOption<T> {
    if (isPromise(x)) {
      return this.toPendingOption().or(x);
    }

    return isSomething(this.#value) ? some(this.#value) : x;
  }

  orElse(f: () => Option<T>): Option<T> {
    try {
      return isSomething(this.#value) ? some(this.#value) : f();
    } catch {
      return none();
    }
  }

  replace(x: T): Option<T>;
  replace(x: Promise<T>): readonly [Option<T>, Promise<void>];
  replace(x: MaybePromise<T>): Option<T> | readonly [Option<T>, Promise<void>] {
    if (isPromise(x)) {
      const promise = x.then((val) => {
        this.#value = val;
      }, noop);

      return [this.clone(), promise];
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
    if (isNothing(this.#value)) {
      return none();
    }

    try {
      if (f(this.#value)) {
        const value = this.#takeValue();
        return isNothing(value) ? none() : some(value);
      }

      return none();
    } catch {
      return none();
    }
  }

  toPendingOption(): PendingOption<T> {
    return pendingOption(this.clone());
  }

  toString(): string {
    return this.isNone() ? "None" : `Some { ${stringify(this.#value, true)} }`;
  }

  transposeResult<V, E>(this: Option<Result<V, E>>): Result<Option<V>, E> {
    if (this.isNone() || !isResult(this.value)) {
      return ok(none<V>());
    }

    return this.value.isOk()
      ? ok(some(this.value.value))
      : err(this.value.error);
  }

  transposeAwaitable<V>(
    this: Option<PromiseLike<V>>,
  ): PendingOption<Awaited<V>> {
    if (this.isNone()) {
      return pendingOption(none());
    }

    return pendingOption(Promise.resolve(this.value).then(some));
  }

  unwrap(): T {
    if (isSomething(this.#value)) {
      return this.#value;
    }

    throw new AnyError(
      "`unwrap` is called on `None`",
      OptionErrorKind.NoneUnwrapped,
    );
  }

  unwrapOr(def: T): T {
    return isSomething(this.#value) ? this.#value : def;
  }

  unwrapOrElse(mkDef: () => T): T {
    try {
      return isSomething(this.#value) ? this.#value : mkDef();
    } catch (e) {
      throw new AnyError(
        "unwrapOrElse callback threw an exception",
        OptionErrorKind.PredicateException,
        e,
      );
    }
  }

  xor(y: Option<T>): Option<T>;
  xor(y: Promise<Option<T>>): PendingOption<T>;
  xor(y: MaybePromise<Option<T>>): MaybePendingOption<T> {
    if (isPromise(y)) {
      return this.toPendingOption().xor(y);
    }

    if (this.isNone() && y.isSome()) {
      return some(y.value);
    }

    if (isSomething(this.#value) && y.isNone()) {
      return some(this.#value);
    }

    return none();
  }

  /**
   * Replaces the value of the option with a new one.
   *
   * Returns the old value.
   */
  #replaceValue(newValue: T | Nothing): T | Nothing {
    const oldValue = this.#value;
    this.#value = newValue;
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

/**
 * Represents an {@link Option} in a pending state that will be resolved in the future.
 *
 * Internally, it wraps a {@link Promise} that resolves to an {@link Option} on success
 * or to its {@link None} invariant on failure. Methods mirror those of {@link Option},
 * adapted for asynchronous resolution.
 */
class _PendingOption<T> implements PendingOption<T> {
  static create<T>(
    option: Option<T> | PendingOption<T> | PromiseLike<Option<T>>,
  ): PendingOption<T> {
    return new _PendingOption(option);
  }

  #promise: Promise<Option<T>>;

  private constructor(promise: Option<T> | PromiseLike<Option<T>>) {
    this.#promise = promisify(promise).catch(() => none<T>());
  }

  // Implements the PromiseLike interface, allowing PendingOption to be used
  // with `await` and `then`.
  then<R1 = Option<T>, R2 = never>(
    onfulfilled?: (value: Option<T>) => R1 | PromiseLike<R1>,
    onrejected?: (reason: unknown) => R2 | PromiseLike<R2>,
  ): PromiseLike<R1 | R2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  and<U>(x: MaybePromise<Option<U>>): PendingOption<U> {
    return pendingOption(
      this.#promise.then((option) => {
        if (option.isNone()) {
          return none<U>();
        }

        return x;
      }),
    );
  }

  andThen<U>(f: (x: T) => MaybePromise<Option<U>>): PendingOption<U> {
    return pendingOption(
      this.#promise.then((option) => {
        if (option.isNone()) {
          return none<U>();
        }

        return f(option.value);
      }),
    );
  }

  clone(): PendingOption<T> {
    return pendingOption(this.#promise.then((x) => x.clone()));
  }

  filter(f: (x: T) => MaybePromise<boolean>): PendingOption<T> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<T>();
        }

        return (await f(option.value)) ? option.clone() : none<T>();
      }),
    );
  }

  flatten<U>(
    this:
      | PendingOption<Option<U>>
      | PendingOption<PendingOption<U>>
      | PendingOption<PromiseLike<Option<U>>>,
  ): PendingOption<U> {
    return pendingOption(
      this.then(async (option) => {
        if (option.isNone()) {
          return none<Awaited<U>>();
        }

        return (await option.value).clone();
      }),
    );
  }

  inspect(f: (x: T) => unknown): PendingOption<T> {
    return pendingOption(
      this.#promise.then((option) => {
        option.inspect(f);
        return option.clone();
      }),
    );
  }

  map<U>(f: (x: T) => MaybePromise<U>): PendingOption<U> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<U>();
        }

        return some(await f(option.value));
      }),
    );
  }

  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<U | F> {
    return this.#promise.then((option) => option.match(f, g));
  }

  okOr<E>(y: E): Promise<Result<T, E>> {
    return this.#promise.then((option) => option.okOr(y));
  }

  okOrElse<E>(mkErr: () => MaybePromise<E>): Promise<Result<T, E>> {
    return this.#promise.then(async (option) => {
      if (option.isNone()) {
        return err(await mkErr());
      }

      return ok(option.value);
    });
  }

  or(x: MaybePromise<Option<T>>): PendingOption<T> {
    return pendingOption(
      this.#promise.then((option) => (option.isSome() ? option : x)),
    );
  }

  orElse(f: () => MaybePromise<Option<T>>): PendingOption<T> {
    return pendingOption(
      this.#promise.then((option) => (option.isSome() ? option : f())),
    );
  }

  replace(x: MaybePromise<T>): PendingOption<T> {
    const oldOption = this.clone();

    this.#promise = isPromise(x) ? x.then(some) : Promise.resolve(some(x));

    return oldOption;
  }

  take(): PendingOption<T> {
    const oldOption = this.clone();
    this.#promise = Promise.resolve(none<T>());
    return oldOption;
  }

  takeIf(f: (x: T) => MaybePromise<boolean>): PendingOption<T> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<T>();
        }

        return (await f(option.value)) ? this.take() : none<T>();
      }),
    );
  }

  toString(): string {
    return "PendingOption { promise }";
  }

  transposeResult<V, E>(
    this: PendingOption<Result<V, E>>,
  ): Promise<Result<Option<V>, E>> {
    return promisify(this.then((option) => option.transposeResult()));
  }

  transposeAwaitable<V>(
    this: PendingOption<PromiseLike<V>>,
  ): PendingOption<Awaited<V>> {
    return pendingOption(
      this.then(async (option) => {
        if (option.isNone()) {
          return none<Awaited<V>>();
        }

        return some(await option.value);
      }),
    );
  }

  xor(y: MaybePromise<Option<T>>): PendingOption<T> {
    return pendingOption(
      this.#promise.then(async (option) => option.xor(await y)),
    );
  }
}
