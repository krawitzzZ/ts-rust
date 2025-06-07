import { isPromise, stringify, toPromise, cnst } from "@ts-rust/shared";
import {
  type PendingResult,
  type Result,
  err,
  ok,
  isResult,
  pendingResult,
  ResultErrorKind,
} from "../result";
import type { Cloneable, MaybePromise } from "../types";
import { isPrimitive } from "../types.utils";
import { unexpectedError } from "../result/error";
import { OptionError, OptionErrorKind } from "./error";
import type {
  Optional,
  Option,
  PendingOption,
  Some,
  None,
  SettledOption,
} from "./interface";
import { phantom } from "./interface";
import { SomeAwaitedValues, SomeValues } from "./types";

/**
 * Creates a {@link Some} variant of an {@link Option} containing the given value.
 *
 * Wraps the provided value in a {@link Some}, indicating the presence of a value.
 *
 * @template T - The type of the value.
 * @param value - The value to wrap in {@link Some}.
 * @returns An {@link Option} containing the value as {@link Some}.
 *
 * @example
 * ```ts
 * const x = some(42);
 *
 * expect(x.isSome()).toBe(true);
 * expect(x.expect("Not 42")).toBe(42);
 * ```
 */
export function some<T>(value: T): Option<T> {
  return _Option.some(value);
}

/**
 * Creates a {@link None} variant of an {@link Option}, representing the absence
 * of a value.
 *
 * Produces an option indicating no value is present.
 *
 * @template T - The type of the absent value.
 * @returns An {@link Option} representing {@link None}.
 *
 * @example
 * ```ts
 * const x = none<number>();
 *
 * expect(x.isNone()).toBe(true);
 * expect(() => x.expect("x is `None`")).toThrow("x is `None`");
 * ```
 */
export function none<T>(): Option<T> {
  return _Option.none();
}

/**
 * Creates a {@link PendingOption | PendingOption\<T>} that resolves to
 * {@link Some} containing the awaited value.
 *
 * Takes a value or a promise and wraps its resolved result in a {@link Some},
 * ensuring the value type is `Awaited` to handle any `PromiseLike` input.
 *
 * @template T - The type of the input value or promise.
 * @param value - The value or promise to wrap in {@link Some}.
 * @returns A {@link PendingOption} resolving to {@link Some} with the awaited value.
 *
 * @example
 * ```ts
 * const x = pendingSome(42);
 * const y = pendingSome(Promise.resolve("hello"));
 *
 * expect(await x).toStrictEqual(some(42));
 * expect(await y).toStrictEqual(some("hello"));
 * ```
 */
export function pendingSome<T>(
  value: T | Promise<T>,
): PendingOption<Awaited<T>> {
  return _PendingOption.create(toPromise(value).then(some));
}

/**
 * Creates a {@link PendingOption | PendingOption\<T>} that resolves to {@link None}.
 *
 * Produces a pending option representing the absence of a value, with the type
 * resolved to `Awaited` for consistency with asynchronous operations.
 *
 * @template T - The type of the absent value.
 * @returns A {@link PendingOption} resolving to {@link None}.
 *
 * @example
 * ```ts
 * const x = pendingNone<number>();
 *
 * expect(await x).toStrictEqual(none());
 * expect((await x).isNone()).toBe(true);
 * ```
 */
export function pendingNone<T>(): PendingOption<Awaited<T>> {
  return _PendingOption.create(none());
}

/**
 * Creates a {@link PendingOption | PendingOption\<T>} from an option, promise,
 * or factory function.
 *
 * Accepts an {@link Option}, a `Promise` resolving to an {@link Option}, or
 * a function returning either, and converts it into a pending option, handling
 * asynchronous resolution as needed.
 *
 * @template T - The type of the value in the option.
 * @param optionOrFactory - The {@link Option}, promise, or factory function producing an {@link Option}.
 * @returns A {@link PendingOption} resolving to the provided or produced option.
 *
 * @example
 * ```ts
 * const x = pendingOption(some(42));
 * const y = pendingOption(() => Promise.resolve(none<string>()));
 * const z = pendingOption(async () => some("thing"));
 *
 * expect(await x).toStrictEqual(some(42));
 * expect(await y).toStrictEqual(none());
 * expect(await z).toStrictEqual(some("thing"));
 * ```
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
 * Checks if a value is an {@link Option}, narrowing its type to `Option<unknown>`.
 *
 * This type guard verifies whether the input conforms to the {@link Optional}
 * interface, indicating it is either a {@link Some} or {@link None}.
 *
 * @param x - The value to check.
 * @returns `true` if the value is an {@link Option}, narrowing to `Option<unknown>`.
 *
 * @example
 * ```ts
 * const x: unknown = some(42);
 * const y: unknown = none<number>();
 * const z: unknown = "not an option";
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
 * Checks if a value is a {@link PendingOption}, narrowing its type to
 * `PendingOption<unknown>`.
 *
 * This type guard verifies whether the input is a {@link PendingOption},
 * indicating it wraps a `Promise` resolving to an {@link Option}
 * (either {@link Some} or {@link None}).
 *
 * @param x - The value to check.
 * @returns `true` if the value is a {@link PendingOption}, narrowing to `PendingOption<unknown>`.
 *
 * @example
 * ```ts
 * const x: unknown = pendingOption(some(42));
 * const y: unknown = pendingOption(none<number>());
 * const z: unknown = some(42); // Not a PendingOption
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
   * {@link None} will throw an {@link OptionError}.
   *
   * @throws
   * - {@link OptionError} if {@link value} is accessed on {@link None}.
   */
  get value(): T {
    if (isNothing(this.#value)) {
      throw new OptionError(
        "`value`: accessed on `None`",
        OptionErrorKind.ValueAccessedOnNone,
      );
    }

    return this.#value;
  }

  private constructor(value: T | Nothing) {
    this.#value = value;
  }

  and<U>(x: Option<U>): Option<U> {
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

  combine<U extends Option<unknown>[]>(
    ...opts: U
  ): Option<[T, ...SomeValues<U>]> {
    if (this.isNone()) {
      return none();
    }

    const acc = [this.value] as unknown as [T, ...SomeValues<U>];

    for (const opt of opts) {
      if (opt.isNone()) {
        return none();
      }

      acc.push(opt.value as SomeValues<U>[number]);
    }

    return some(acc);
  }

  copy(): Option<T> {
    return isSomething(this.#value) ? some(this.#value) : none();
  }

  expect(this: SettledOption<T>, msg?: string): T {
    if (this.isSome()) {
      return this.value;
    }

    throw new OptionError(
      msg ?? "`expect`: called on `None`",
      OptionErrorKind.ExpectCalledOnNone,
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
    if (this.isNone() || !isOption(this.value)) {
      return none();
    }

    return this.value.copy();
  }

  getOrInsert(this: SettledOption<T>, x: T): T;
  getOrInsert(x: Awaited<T>): T {
    if (this.isNone()) {
      this.#value = x;
    }

    return this.value;
  }

  getOrInsertWith(this: SettledOption<T>, f: () => T): T;
  getOrInsertWith(f: () => Awaited<T>): T {
    if (this.isSome()) {
      return this.value;
    }

    try {
      this.#value = f();
      return this.#value;
    } catch (e) {
      throw new OptionError(
        "`getOrInsertWith`: callback `f` threw an exception",
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

  iter(): IterableIterator<T, T, void> {
    const value = this.#value;
    let isConsumed = false;

    return {
      next(): IteratorResult<T, T> {
        if (isConsumed || isNothing(value)) {
          // according to the specification (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#value)
          // `value` can be omitted if `done` is true
          return { done: true } as IteratorResult<T, T>;
        }

        isConsumed = true;

        return { done: false, value };
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  map<U>(f: (x: T) => Awaited<U>): Option<U> {
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
  mapAll<U>(f: (x: Option<T>) => Promise<Option<U>>): PendingSettledOpt<U>;
  mapAll<U>(
    f: (x: Option<T>) => MaybePromise<Option<U>>,
  ): Option<U> | PendingSettledOpt<U> {
    try {
      const mapped = f(this.copy());

      if (!isPromise(mapped)) {
        return mapped;
      }

      return pendingOption(settleOption(mapped));
    } catch {
      return none();
    }
  }

  mapOr<U>(
    this: SettledOption<T>,
    def: Awaited<U>,
    f: (x: T) => Awaited<U>,
  ): U {
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
    mkDef: () => Awaited<U>,
    f: (x: T) => Awaited<U>,
  ): U {
    const makeDefault = () => {
      try {
        return mkDef();
      } catch (e) {
        throw new OptionError(
          "`mapOrElse`: callback `mkDef` threw an exception",
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

  match<U, F = U>(
    this: SettledOption<T>,
    f: (x: T) => Awaited<U>,
    g: () => Awaited<F>,
  ): U | F {
    try {
      return this.isNone() ? g() : f(this.value);
    } catch (e) {
      throw new OptionError(
        "`match`: one of the predicates threw an exception",
        OptionErrorKind.PredicateException,
        e,
      );
    }
  }

  okOr<E>(y: Awaited<E>): Result<T, E> {
    return isSomething(this.#value) ? ok(this.#value) : err(y);
  }

  okOrElse<E>(mkErr: () => Awaited<E>): Result<T, E> {
    try {
      return isSomething(this.#value) ? ok(this.#value) : err(mkErr());
    } catch (e) {
      return err(
        unexpectedError<E>(
          "`Option.okOrElse`: callback `mkErr` threw an exception",
          ResultErrorKind.FromOptionException,
          e,
        ),
      );
    }
  }

  or(x: Option<T>): Option<T> {
    return isSomething(this.#value) ? some(this.#value) : x;
  }

  orElse(f: () => Option<T>): Option<T> {
    try {
      return isSomething(this.#value) ? some(this.#value) : f();
    } catch {
      return none();
    }
  }

  replace(x: T): Option<T> {
    return new _Option(this.#replaceValue(x));
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

  toPending(): PendingSettledOpt<T> {
    return pendingOption(async () => {
      const copy = this.copy();

      if (copy.isNone()) {
        return none();
      }

      return some(await copy.value);
    });
  }

  toPendingCloned(this: Option<Cloneable<T>>): PendingSettledOpt<T> {
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

  transpose<U, E>(this: Option<Result<U, E>>): Result<Option<U>, E> {
    if (this.isNone() || !isResult(this.value)) {
      return ok(none<U>());
    }

    return this.value.isOk()
      ? ok(some(this.value.value))
      : err(this.value.error);
  }

  unwrap(this: SettledOption<T>): T {
    if (this.isSome()) {
      return this.value;
    }

    throw new OptionError(
      "`unwrap`: called on `None`",
      OptionErrorKind.UnwrapCalledOnNone,
    );
  }

  unwrapOr(this: SettledOption<T>, def: Awaited<T>): T {
    return this.isNone() ? def : this.value;
  }

  unwrapOrElse(this: SettledOption<T>, mkDef: () => T): T {
    try {
      return this.isNone() ? mkDef() : this.value;
    } catch (e) {
      throw new OptionError(
        "`unwrapOrElse`: callback `mkDef` threw an exception",
        OptionErrorKind.PredicateException,
        e,
      );
    }
  }

  xor(y: Option<T>): Option<T>;
  xor(y: Promise<Option<T>>): PendingSettledOpt<T>;
  xor(y: MaybePromise<Option<T>>): Option<T> | PendingSettledOpt<T> {
    if (isPromise(y)) {
      return pendingOption(async () => settleOption(this.xor(await y)));
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
 * Internally, it wraps a `Promise` that resolves to an {@link Option} on success
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

  and<U>(x: MaybePromise<Option<U>> | PendingOption<U>): PendingSettledOpt<U> {
    return pendingOption(
      this.#promise.then(async (option) => {
        const r = option.and(await x);
        return r.isNone() ? none() : some(await r.value);
      }),
    );
  }

  andThen<U>(
    f: (x: T) => MaybePromise<Option<U>> | PendingOption<U>,
  ): PendingSettledOpt<U> {
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

  combine<U extends (Option<unknown> | PendingOption<unknown>)[]>(
    ...opts: U
  ): PendingOption<[Awaited<T>, ...SomeAwaitedValues<U>]> {
    return pendingOption(async () =>
      this.then(async (option) => {
        if (option.isNone()) {
          return none();
        }

        const acc = [await option.value] as unknown as [
          Awaited<T>,
          ...SomeAwaitedValues<U>,
        ];

        for (const opt of opts) {
          const awaitedOption = await opt;

          if (awaitedOption.isNone()) {
            return none();
          }

          const awaitedValue = await awaitedOption.value;

          acc.push(awaitedValue as SomeAwaitedValues<U>[number]);
        }

        return some(acc);
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
  ): PendingSettledOpt<U> {
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

  iter(): AsyncIterableIterator<Awaited<T>, Awaited<T>, void> {
    const promise = settleOption(this.#promise);
    let isConsumed = false;

    return {
      async next(): Promise<IteratorResult<Awaited<T>, Awaited<T>>> {
        return promise.then((self) => {
          if (isConsumed || self.isNone()) {
            // according to the specification (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#value)
            // `value` can be omitted if `done` is true
            return { done: true } as IteratorResult<Awaited<T>, Awaited<T>>;
          }

          isConsumed = true;

          return { done: false, value: self.value };
        });
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  map<U>(f: (x: T) => U): PendingSettledOpt<U> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<Awaited<U>>();
        }

        return some(await f(option.value));
      }),
    );
  }

  mapAll<U>(
    f: (x: Option<T>) => MaybePromise<Option<U>> | PendingOption<U>,
  ): PendingSettledOpt<U> {
    return pendingOption(settleOption(this.#promise.then(f)));
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

  okOr<E>(y: Awaited<E>): PendingResult<T, E> {
    return pendingResult(this.#promise.then((option) => option.okOr(y)));
  }

  okOrElse<E>(mkErr: () => MaybePromise<E>): PendingResult<T, E> {
    return pendingResult(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return err(await mkErr());
        }

        return ok(option.value);
      }),
    );
  }

  or(x: MaybePromise<Option<T>> | PendingOption<T>): PendingSettledOpt<T> {
    return pendingOption(
      settleOption(
        this.#promise.then((option) =>
          option.isSome() ? some(option.value) : x,
        ),
      ),
    );
  }

  orElse(
    f: () => MaybePromise<Option<T>> | PendingOption<T>,
  ): PendingSettledOpt<T> {
    return pendingOption(
      settleOption(
        this.#promise.then((option) =>
          option.isSome() ? some(option.value) : f(),
        ),
      ),
    );
  }

  tap(f: (opt: Option<T>) => unknown): PendingOption<T> {
    return pendingOption(this.#promise.then((opt) => opt.tap(f)));
  }

  toString(): string {
    return "PendingOption { <⏳> }";
  }

  transpose<V, E>(
    this: PendingOption<Result<V, E>>,
  ): PendingResult<Option<V>, E> {
    return pendingResult(toPromise(this.then((option) => option.transpose())));
  }

  xor(y: MaybePromise<Option<T>> | PendingOption<T>): PendingSettledOpt<T> {
    return pendingOption(
      settleOption(this.#promise.then(async (option) => option.xor(await y))),
    );
  }
}

/**
 * An asynchronous {@link PendingOption} where the contained value `T` is guaranteed to be
 * resolved (non-`PromiseLike`), ensuring the inner type is immediately available
 * once the outer promise settles.
 *
 * This type extends {@link PendingOption} with a settled `T` (i.e., `Awaited<T>`),
 * making it suitable for async operations that return fully resolved values. Use it when
 * you need an {@link Option} whose value, if present, requires no further awaiting after
 * the initial promise resolution.
 */
type PendingSettledOpt<T> = PendingOption<Awaited<T>>;

/**
 * Type that represents the absence of a value.
 *
 * This allows {@link Option | Options} to also contain values of type `null`
 * or `undefined`, e.g. `Option<null>` or `Option<undefined>`.
 */
type Nothing = typeof nothing;

const nothing: unique symbol = Symbol("Nothing");

const isNothing = (x: unknown): x is Nothing => x === nothing;

const isSomething = <T>(x: T | Nothing): x is T => !isNothing(x);

const settleOption = <T>(
  optionOrPromise: Option<T> | PromiseLike<Option<T>>,
): Promise<SettledOption<T>> =>
  toPromise(optionOrPromise).then(async (option) => {
    if (option.isNone()) {
      return none();
    }

    return some(await option.value);
  }, cnst(none()));
