import { isPromise, stringify, toPromise, cnst } from "@ts-rust/shared";
import { AnyError } from "../error";
import { Result, err, ok, isResult } from "../result";
import { Cloneable, Sync } from "../types";
import { isPrimitive } from "../types.utils";
import {
  Optional,
  Option,
  PendingOption,
  Some,
  None,
  phantom,
  SettledOption,
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

/**
 * Creates a {@link PendingOption} from an {@link Option}, a
 * {@link Promise | Promise\<Option>} or from a factory function that returns
 * either {@link Option} or {@link Promise | Promise\<Option>}.
 */
export function pendingOption<T>(
  optionOrFactory:
    | Option<T>
    | Promise<Option<T>>
    | (() => Option<T> | Promise<Option<T>>),
): PendingOption<T> {
  if (typeof optionOrFactory === "function") {
    return pendingOption(optionOrFactory());
  }

  return _PendingOption.create(optionOrFactory);
}

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
// TODO(nikita.demin): create AnyOptionError and AnyPendingOptionError
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

type MaybePromise<T> = T | Promise<T>;
type MaybePendingOption<T> = Option<T> | PendingOption<T>;

const nothing: unique symbol = Symbol("Nothing");
const isNothing = (x: unknown): x is Nothing => x === nothing;
const isSomething = <T>(x: T | Nothing): x is T => !isNothing(x);

/**
 * Internal implementation class for {@link Option}.
 *
 * Represents a value that may or may not be present.
 */
class _Option<T> implements Optional<T> {
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
    return new _Option<T>(nothing);
  }

  /**
   * A symbol-keyed property used as a type discriminant.
   *
   * This field holds either `"some"` or `"none"` to indicate whether the
   * {@link Option} is a {@link Some} or {@link None} variant. It is not
   * intended for direct access or modification by users; instead, it serves as
   * an internal mechanism to enable TypeScript's type narrowing for methods
   * like {@link isSome} and {@link isNone}. The symbol key ({@link phantom})
   * ensures this property remains private to the module, preventing external
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
   *
   * ### IMPORTANT
   * **This property shall only be used in `#value` getter and setter**
   */
  #x: T | Nothing = nothing;

  /**
   * Internal value (getter and setter) that this {@link Option} holds.
   *
   * The `getter` shall be used **wherever possible within this class** to access
   * the value (unless `this` is restricted in method's signature).
   *
   * The `setter` takes care of keeping the internal state consistent by also
   * updating the {@link phantom} property.
   *
   * ### IMPORTANT
   * {@link value} getter should only be used to access the value from the
   * outside and never within the class, unless `this` is restricted by method's
   * signature.
   */
  get #value(): T | Nothing {
    return this.#x;
  }

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
        "`Option.value` - accessed on `None`",
        OptionErrorKind.NoneValueAccessed,
      );
    }

    return this.#value;
  }

  private constructor(value: T | Nothing) {
    this.#value = value;
  }

  and<U>(x: Option<U>): Option<U>;
  and<U>(x: Promise<Option<U>>): PendingOption<Awaited<U>>;
  and<U>(x: MaybePromise<Option<U>>): Option<U> | PendingOption<Awaited<U>> {
    if (isPromise(x)) {
      return this.toPending().and(x);
    }

    return this.isNone() ? none() : x.copy();
  }

  andThen<U>(f: (x: T) => Option<U>): Option<U> {
    if (isNothing(this.#value)) {
      return none();
    }

    try {
      return f(this.#value);
    } catch {
      return none();
    }
  }

  clone<U>(this: Option<Cloneable<U>>): Option<U> {
    if (this.isNone()) {
      return none();
    }

    if (isPrimitive(this.value)) {
      return some<U>(this.value);
    }

    return some(this.value.clone());
  }

  copy(): Option<T> {
    return isSomething(this.#value) ? some(this.#value) : none();
  }

  expect(this: SettledOption<T>, msg?: string): T {
    if (this.isSome()) {
      return this.value;
    }

    throw new AnyError(
      msg ?? "`Option.expect` - called on `None`",
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

    return this.value.copy();
  }

  getOrInsert(this: SettledOption<T>, x: T): T;
  getOrInsert(x: Sync<T>): T {
    if (this.isNone()) {
      this.#value = x;
    }

    return this.value;
  }

  getOrInsertWith(this: SettledOption<T>, f: () => T): T;
  getOrInsertWith(f: () => Sync<T>): T {
    if (this.isSome()) {
      return this.value;
    }

    try {
      this.#value = f();
      return this.#value;
    } catch (e) {
      throw new AnyError(
        "`Option.getOrInsertWith` - callback `f` threw an exception",
        OptionErrorKind.PredicateException,
        e,
      );
    }
  }

  insert(this: SettledOption<T>, x: T): T;
  insert(x: T): T {
    this.#value = x;
    return this.#value;
  }

  inspect(f: (x: T) => unknown): Option<T> {
    if (isSomething(this.#value)) {
      try {
        const inspection = f(this.#value);

        if (isPromise(inspection)) {
          inspection.catch(() => void 0);
        }
      } catch {
        // do not care about the error
      }
    }

    return this.copy();
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

  map<U>(f: (x: T) => Sync<U>): Option<U> {
    if (isNothing(this.#value)) {
      return none();
    }

    try {
      return some(f(this.#value));
    } catch {
      return none();
    }
  }

  mapAll<U>(f: (x: Option<T>) => Option<U>): Option<U>;
  mapAll<U>(f: (x: Option<T>) => Promise<Option<U>>): PendingOption<U>;
  mapAll<U>(
    f: (x: Option<T>) => MaybePromise<Option<U>>,
  ): MaybePendingOption<U> {
    try {
      const mapped = f(this.copy());
      return isPromise(mapped) ? pendingOption(mapped) : mapped;
    } catch {
      return none();
    }
  }

  mapOr<U>(this: SettledOption<T>, def: Sync<U>, f: (x: T) => Sync<U>): U {
    if (this.isNone()) {
      return def;
    }

    try {
      return f(this.value);
    } catch {
      return def;
    }
  }

  mapOrElse<U>(
    this: SettledOption<T>,
    mkDef: () => Sync<U>,
    f: (x: T) => Sync<U>,
  ): U {
    const makeDefault = () => {
      try {
        return mkDef();
      } catch (e) {
        throw new AnyError(
          "`Option.mapOrElse` - callback `mkDef` threw an exception",
          OptionErrorKind.PredicateException,
          e,
        );
      }
    };

    if (this.isNone()) {
      return makeDefault();
    }

    try {
      return f(this.value);
    } catch {
      return makeDefault();
    }
  }

  match<U, F = U>(this: SettledOption<T>, f: (x: T) => U, g: () => F): U | F {
    try {
      return this.isNone() ? g() : f(this.value);
    } catch (e) {
      throw new AnyError(
        "`Option.match` - one of the predicates threw an exception",
        OptionErrorKind.PredicateException,
        e,
      );
    }
  }

  okOr<E>(y: Sync<E>): Result<T, E> {
    return isSomething(this.#value) ? ok(this.#value) : err(y);
  }

  okOrElse<E>(mkErr: () => E): Result<T, E> {
    return isSomething(this.#value) ? ok(this.#value) : err(mkErr());
  }

  or(x: Option<T>): Option<T>;
  or(x: Promise<Option<T>>): PendingOption<T>;
  or(x: MaybePromise<Option<T>>): MaybePendingOption<T> {
    if (isPromise(x)) {
      return pendingOption(async () => this.or(await x));
    }

    return isNothing(this.#value) ? x.copy() : some(this.#value);
  }

  orElse(f: () => Option<T>): Option<T> {
    try {
      return isSomething(this.#value) ? some(this.#value) : f();
    } catch {
      return none();
    }
  }

  replace(x: T): Option<T> {
    const value = this.#replaceValue(x);
    return isNothing(value) ? none() : some(value);
  }

  take(): Option<T> {
    if (this.isNone()) {
      return none();
    }

    return new _Option(this.#takeValue());
  }

  takeIf(f: (x: T) => boolean): Option<T> {
    if (isNothing(this.#value)) {
      return none();
    }

    try {
      if (f(this.#value)) {
        return this.take();
      }

      return none();
    } catch {
      return none();
    }
  }

  tap(f: (opt: Option<T>) => unknown): Option<T> {
    try {
      const r = f(this.copy());

      if (isPromise(r)) {
        r.catch(() => void 0);
      }
    } catch {
      // do not care about the error
    }

    return this.copy();
  }

  toPending(): PendingOption<Awaited<T>> {
    return pendingOption(async () => {
      const copy = this.copy();

      if (copy.isNone()) {
        return none();
      }

      return some(await copy.value);
    });
  }

  toPendingCloned(this: Option<Cloneable<T>>): PendingOption<Awaited<T>> {
    return pendingOption(async () => {
      const clone = this.clone();

      if (clone.isNone()) {
        return none();
      }

      return some(await clone.value);
    });
  }

  toString(): string {
    return this.isNone() ? "None" : `Some { ${stringify(this.#value, true)} }`;
  }

  transpose<V, E>(this: Option<Result<V, E>>): Result<Option<V>, E> {
    if (this.isNone() || !isResult(this.value)) {
      return ok(none<V>());
    }

    return this.value.isOk()
      ? ok(some(this.value.value))
      : err(this.value.error);
  }

  unwrap(): T {
    if (isSomething(this.#value)) {
      return this.#value;
    }

    throw new AnyError(
      "`Option.unwrap` - called on `None`",
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
        "`Option.unwrapOrElse` - callback `mkDef` threw an exception",
        OptionErrorKind.PredicateException,
        e,
      );
    }
  }

  xor(y: Option<T>): Option<T>;
  xor(y: Promise<Option<T>>): PendingOption<T>;
  xor(y: MaybePromise<Option<T>>): MaybePendingOption<T> {
    if (isPromise(y)) {
      return pendingOption(async () => this.xor(await y));
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
    option: Option<T> | PromiseLike<Option<T>>,
  ): PendingOption<T> {
    return new _PendingOption(option);
  }

  #promise: Promise<Option<T>>;

  private constructor(option: Option<T> | PromiseLike<Option<T>>) {
    this.#promise = toPromise(option).catch(cnst(none()));
  }

  // Implements the PromiseLike interface, allowing PendingOption to be used
  // with `await` and `then`.
  then<R1 = Option<T>, R2 = never>(
    onfulfilled?: (value: Option<T>) => R1 | PromiseLike<R1>,
    onrejected?: (reason: unknown) => R2 | PromiseLike<R2>,
  ): PromiseLike<R1 | R2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  catch<R>(
    onrejected?: (reason: unknown) => R | PromiseLike<R>,
  ): Promise<Option<T> | R> {
    return this.#promise.catch(onrejected);
  }

  and<U>(x: MaybePromise<Option<U>>): PendingOption<Awaited<U>> {
    return pendingOption(
      this.#promise.then(async (option) => {
        const r = option.and(await x);
        return r.isNone() ? none() : some(await r.value);
      }),
    );
  }

  andThen<U>(f: (x: T) => MaybePromise<Option<U>>): PendingOption<Awaited<U>> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<Awaited<U>>();
        }

        const r = await f(option.value);
        return r.isNone() ? none() : some(await r.value);
      }),
    );
  }

  filter(f: (x: T) => MaybePromise<boolean>): PendingOption<T> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<T>();
        }

        return (await f(option.value)) ? option.copy() : none<T>();
      }),
    );
  }

  flatten<U>(
    this:
      | PendingOption<Option<U>>
      | PendingOption<PendingOption<U>>
      | PendingOption<PromiseLike<Option<U>>>,
  ): PendingOption<Awaited<U>> {
    return pendingOption(async () =>
      this.then(async (option) => {
        if (option.isNone()) {
          return none();
        }

        const nested = await option.value;
        return nested.isNone() ? none() : some(await nested.value);
      }),
    );
  }

  inspect(f: (x: T) => unknown): PendingOption<T> {
    return pendingOption(this.#promise.then((option) => option.inspect(f)));
  }

  map<U>(f: (x: T) => U): PendingOption<Awaited<U>> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<Awaited<U>>();
        }

        return some(await f(option.value));
      }),
    );
  }

  mapAll<U>(f: (x: Option<T>) => MaybePromise<Option<U>>): PendingOption<U> {
    return pendingOption(this.#promise.then(f));
  }

  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<Awaited<U | F>> {
    return Promise.resolve(
      this.#promise.then((option) => {
        if (option.isNone()) {
          return g();
        }

        return f(option.value);
      }),
    );
  }

  okOr<E>(y: Sync<E>): Promise<Result<T, E>> {
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
      this.#promise.then(async (option) => option.or(await x)),
    );
  }

  orElse(f: () => MaybePromise<Option<T>>): PendingOption<T> {
    return pendingOption(
      this.#promise.then((option) => (option.isSome() ? option.copy() : f())),
    );
  }

  tap(f: (opt: Option<T>) => void | Promise<void>): PendingOption<T> {
    return pendingOption(
      this.#promise.then(async (opt) => {
        try {
          const r = f(opt.copy());

          if (isPromise(r)) {
            await r.catch(() => void 0);
          }

          return opt.copy();
        } catch {
          // do not care about the error
        }

        return opt.copy();
      }),
    );
  }

  toString(): string {
    return "PendingOption { <⏳> }";
  }

  transpose<V, E>(
    this: PendingOption<Result<V, E>>,
  ): Promise<Result<Option<V>, E>> {
    return toPromise(this.then((option) => option.transpose()));
  }

  xor(y: MaybePromise<Option<T>>): PendingOption<T> {
    return pendingOption(
      this.#promise.then(async (option) => option.xor(await y)),
    );
  }
}
