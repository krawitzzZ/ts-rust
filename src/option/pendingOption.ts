// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Result, Ok, Err, err, ok } from "../result";
import { isPromise, promisify } from "../internal";
import { MaybePromise } from "../types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Option, type Some, type None, some, none, isOption } from "./index";

export type { PendingOption };

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
  if (option instanceof PendingOption) {
    return option.clone();
  }

  return PendingOption.create(option);
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
  return x instanceof PendingOption;
}

/**
 * Interface defining the asynchronous implementation of an {@link Option}.
 *
 * Extends the synchronous {@link Option} functionality to handle pending states,
 * wrapping a {@link Promise} that resolves to an {@link Option}. Methods mirror
 * those of {@link Option}, adapted to return either a {@link PendingOption} or a
 * {@link Promise} for asynchronous operations.
 */
export type IPendingOption<T> = {
  and<U>(x: MaybePromise<Option<U>>): PendingOption<U>;
  andThen<U>(f: (x: T) => MaybePromise<Option<U>>): PendingOption<U>;
  clone(): PendingOption<T>;
  filter(f: (x: T) => MaybePromise<boolean>): PendingOption<T>;
  flatten<U>(
    this:
      | PendingOption<Option<U>>
      | PendingOption<PendingOption<U>>
      | PendingOption<PromiseLike<Option<U>>>,
  ): PendingOption<U>;
  inspect(f: (x: T) => unknown): PendingOption<T>;
  map<U>(f: (x: T) => MaybePromise<U>): PendingOption<U>;
  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<U | F>;
  okOr<E>(y: E): Promise<Result<T, E>>;
  okOrElse<E>(mkErr: () => MaybePromise<E>): Promise<Result<T, E>>;
  or(x: MaybePromise<Option<T>>): PendingOption<T>;
  orElse(f: () => MaybePromise<Option<T>>): PendingOption<T>;
  replace(x: MaybePromise<T>): PendingOption<T>;
  take(): PendingOption<T>;
  takeIf(f: (x: T) => MaybePromise<boolean>): PendingOption<T>;
  toString(): string;
  transposeSafeResult<U, E>(
    this: IPendingOption<Result<U, E>>,
  ): Promise<Result<Option<U>, E>>;
  transposeAwaitable<U>(
    this: PendingOption<PromiseLike<U>>,
  ): PendingOption<Awaited<U>>;
  xor(y: MaybePromise<Option<T>>): PendingOption<T>;
};

/**
 * Represents an {@link Option} in a pending state that will be resolved in the future.
 *
 * Internally, it wraps a {@link Promise} that resolves to an {@link Option} on success
 * or to its {@link None} invariant on failure. Methods mirror those of {@link Option},
 * adapted for asynchronous resolution.
 */
// TODO(nikita.demin): test that .catch in constructor is enough for every method
// to return none<T>() in case of errors thrown by predicate/callbacks
class PendingOption<T> implements IPendingOption<T>, PromiseLike<Option<T>> {
  static create<T>(
    option: Option<T> | PendingOption<T> | PromiseLike<Option<T>>,
  ): PendingOption<T> {
    return new PendingOption(option);
  }

  #promise: Promise<Option<T>>;

  private constructor(promise: Option<T> | PromiseLike<Option<T>>) {
    this.#promise = promisify(promise)
      .then((v) => (isOption(v) ? v : none<T>()))
      .catch(() => none<T>());
  }

  // Implements the PromiseLike interface, allowing PendingOption to be used
  // with `await` and `then`.
  then<R1 = Option<T>, R2 = never>(
    onfulfilled?: (value: Option<T>) => R1 | PromiseLike<R1>,
    onrejected?: (reason: unknown) => R2 | PromiseLike<R2>,
  ): PromiseLike<R1 | R2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  /**
   * Returns a {@link PendingOption} with {@link None} if this option resolves to
   * {@link None}, otherwise returns a {@link PendingOption} with `x`.
   *
   * Accepts both synchronous and asynchronous `x`.
   *
   * Similar to the {@link Option.and}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.and(some(3))).toStrictEqual(some(3));
   * expect(await x.and(Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await x.and(none())).toStrictEqual(none());
   * expect(await x.and(Promise.resolve(none()))).toStrictEqual(none());
   * expect(await y.and(some(3))).toStrictEqual(none());
   * expect(await y.and(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  and<U>(x: MaybePromise<Option<U>>): PendingOption<U> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<U>();
        }

        return x;
      }),
    );
  }

  /**
   * Returns a {@link PendingOption} with {@link None} if this {@link Option} resolves
   * to {@link None}, otherwise applies `f` to the resolved value and returns the result.
   *
   * The function `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.andThen}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.andThen(n => some(n * 2))).toStrictEqual(some(4));
   * expect(await x.andThen(n => Promise.resolve(some(n * 2)))).toStrictEqual(some(4));
   * expect(await x.andThen(_ => none())).toStrictEqual(none());
   * expect(await y.andThen(n => some(n * 2))).toStrictEqual(none());
   * ```
   */
  andThen<U>(f: (x: T) => MaybePromise<Option<U>>): PendingOption<U> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<U>();
        }

        return f(option.value);
      }),
    );
  }

  /**
   * Creates a shallow copy of this {@link PendingOption}.
   *
   * Similar to {@link Option.clone}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.clone()).toStrictEqual(some(2));
   * expect(x.clone()).not.toBe(x); // Different instance
   * expect(await y.clone()).toStrictEqual(none());
   * ```
   */
  clone(): PendingOption<T> {
    return pendingOption(this.#promise.then((x) => x.clone()));
  }

  /**
   * Returns {@link PendingOption} with {@link None} if this option resolves to {@link None},
   * otherwise calls `f` with the resolved value and returns a {@link PendingOption} with
   * the original value if `f` resolves to `true`, or {@link None} otherwise.
   *
   * The predicate `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.filter}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.filter(n => n > 0)).toStrictEqual(some(2));
   * expect(await x.filter(n => Promise.resolve(n < 0))).toStrictEqual(none());
   * expect(await y.filter(n => true)).toStrictEqual(none());
   * ```
   */
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

  /**
   * Flattens a {@link PendingOption} of a {@link PendingOption} or {@link Option},
   * resolving nested pending states.
   *
   * Similar to {@link Option.flatten}.
   *
   * ### Example
   * ```ts
   * const option1: PendingOption<Option<number>> = getPendingOption();
   * option1.flatten(); // PendingOption<number>
   *
   * const option2: PendingOption<PendingOption<number>> = getPendingOption();
   * option2.flatten(); // PendingOption<number>
   *
   * const option3: PendingOption<PendingOption<PendingOption<number>>> = getPendingOption();
   * option3.flatten(); // PendingOption<Option<number>>
   * ```
   */
  flatten<U>(
    this:
      | PendingOption<Option<U>>
      | PendingOption<PendingOption<U>>
      | PendingOption<PromiseLike<Option<U>>>,
  ): PendingOption<U> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<Awaited<U>>();
        }

        const inner = await option.value;
        return isOption(inner) ? inner : none<Awaited<U>>();
      }),
    );
  }

  /**
   * Calls `f` with the resolved value if this option is {@link Some}, then returns this
   * {@link PendingOption} unchanged. Useful for side effects.
   *
   * Similar to {@link Option.inspect}.
   *
   * ### Note
   * Returns a new {@link PendingOption} instance with the same value as the original,
   * rather than the exact same reference. The returned option is a distinct object,
   * preserving the original value.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   * let sideEffect = 0;
   *
   * expect(await x.inspect(n => (sideEffect = n))).toStrictEqual(some(2));
   * expect(sideEffect).toBe(2);
   * expect(await y.inspect(n => (sideEffect = n))).toStrictEqual(none());
   * expect(sideEffect).toBe(2); // Unchanged
   * ```
   */
  inspect(f: (x: T) => unknown): PendingOption<T> {
    return pendingOption(
      this.#promise.then((option) => {
        option.inspect(f);
        return option.clone();
      }),
    );
  }

  /**
   * Maps the resolved value with `f`, returning a {@link PendingOption} with the result
   * if this option is {@link Some}, or {@link None} otherwise.
   *
   * The function `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.map}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.map(n => n * 2)).toStrictEqual(some(4));
   * expect(await x.map(n => Promise.resolve(n * 2))).toStrictEqual(some(4));
   * expect(await y.map(n => n * 2)).toStrictEqual(none());
   * ```
   */
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

  /**
   * Matches the resolved option, returning `f` applied to the value if {@link Some},
   * or `g` if {@link None}. Returns a {@link Promise} with the result.
   *
   * Similar to {@link Option.match}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.match(n => n * 2, () => 0)).toBe(4);
   * expect(await y.match(n => n * 2, () => 0)).toBe(0);
   * ```
   */
  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<U | F> {
    return this.#promise.then((option) => option.match(f, g));
  }

  /**
   * Converts to a {@link Promise} of a {@link Result}, using `y` as the error value if
   * this {@link PendingOption} resolves to {@link None}.
   *
   * Similar to {@link Option.okOr}, check it for more details.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.okOr("error")).toStrictEqual(ok(2));
   * expect(await y.okOr("error")).toStrictEqual(err("error"));
   * ```
   */
  okOr<E>(y: E): Promise<Result<T, E>> {
    return this.#promise.then((option) => option.okOr(y));
  }

  /**
   * Converts to a {@link Promise} of a {@link Result}, using the result of `mkErr` as
   * the error value if this {@link PendingOption} resolves to {@link None}.
   *
   * `mkErr` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.okOrElse}, check it for more details.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.okOrElse(() => "error")).toStrictEqual(ok(2));
   * expect(await y.okOrElse(() => Promise.resolve("error"))).toStrictEqual(err("error"));
   * ```
   */
  okOrElse<E>(mkErr: () => MaybePromise<E>): Promise<Result<T, E>> {
    return this.#promise.then(async (option) => {
      if (option.isNone()) {
        return err(await mkErr());
      }

      return ok(option.value);
    });
  }

  /**
   * Returns this {@link PendingOption} if it resolves to {@link Some}, otherwise
   * returns a {@link PendingOption} with `x`.
   *
   * Accepts both synchronous and asynchronous `x`.
   *
   * Similar to {@link Option.or}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.or(some(3))).toStrictEqual(some(2));
   * expect(await x.or(Promise.resolve(none()))).toStrictEqual(some(2));
   * expect(await y.or(some(3))).toStrictEqual(some(3));
   * expect(await y.or(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  or(x: MaybePromise<Option<T>>): PendingOption<T> {
    return pendingOption(
      this.#promise.then((option) => (option.isSome() ? option : x)),
    );
  }

  /**
   * Returns this {@link PendingOption} if it resolves to {@link Some}, otherwise
   * returns a {@link PendingOption} with the result of `f`.
   *
   * The function `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.orElse}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.orElse(() => some(3))).toStrictEqual(some(2));
   * expect(await y.orElse(() => Promise.resolve(some(3)))).toStrictEqual(some(3));
   * expect(await y.orElse(() => none())).toStrictEqual(none());
   * ```
   */
  orElse(f: () => MaybePromise<Option<T>>): PendingOption<T> {
    return pendingOption(
      this.#promise.then((option) => (option.isSome() ? option : f())),
    );
  }

  /**
   * Replaces the underlying {@link Option} with `x`, returning a {@link PendingOption}
   * with the original {@link Option}.
   *
   * Accepts both synchronous and asynchronous `x`.
   *
   * Similar to {@link Option.replace}.
   *
   * ### Note
   * This method mutates the {@link PendingOption}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * const xReplaced = x.replace(5);
   * const yReplaced = x.replace(2);
   *
   * expect(await xReplaced).toStrictEqual(some(2));
   * expect(await x).toStrictEqual(some(5));
   * expect(await yReplaced).toStrictEqual(none());
   * expect(await y).toStrictEqual(some(2));
   * ```
   */
  replace(x: MaybePromise<T>): PendingOption<T> {
    const oldOption = this.clone();

    this.#promise = isPromise(x) ? x.then(some) : Promise.resolve(some(x));

    return oldOption;
  }

  /**
   * Takes the resolved value out of this {@link PendingOption}, leaving it as
   * {@link PendingOption} with {@link None}.
   *
   * Similar to {@link Option.take}.
   *
   * ### Note
   * This method mutates the {@link PendingOption}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * const xTaken = x.take();
   * const yTaken = y.take();
   *
   * expect(await xTaken).toStrictEqual(some(2));
   * expect(await x).toStrictEqual(none());
   * expect(await yTaken).toStrictEqual(none());
   * expect(await y).toStrictEqual(none());
   * ```
   */
  take(): PendingOption<T> {
    const oldOption = this.clone();
    this.#promise = Promise.resolve(none<T>());
    return oldOption;
  }

  /**
   * Takes the resolved value _only_ if this option is {@link Some} and `f`
   * resolves to `true`, leaving it as {@link PendingOption} with {@link None}.
   * If this option is {@link None} or `f` resolves to `false`, this {@link PendingOption}
   * remains unchanged.
   *
   * The predicate `f` may return synchronously or asynchronously.
   *
   * Similar to {@link Option.takeIf}.
   *
   * ### Note
   * This method mutates the {@link PendingOption}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   * const z = pendingOption(some(0));
   *
   * const xTaken = x.takeIf(n => n > 0);
   * const yTaken = x.takeIf(n => Promise.resolve(n < 0));
   * const zTaken = z.takeIf(n => n > 0);
   *
   * expect(await xTaken).toStrictEqual(some(2));
   * expect(await x).toStrictEqual(none());
   * expect(await yTaken).toStrictEqual(none());
   * expect(await y.takeIf(n => true)).toStrictEqual(none());
   * expect(await x).toStrictEqual(none());
   * expect(await zTaken).toStrictEqual(none());
   * expect(await z).toStrictEqual(some(0));
   * ```
   */
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

  /**
   * Returns a string representation of this {@link PendingOption}'s current state.
   *
   * Similar to {@link Option.toString}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(x.toString()).toBe("PendingOption { promise }"); // Before resolution
   * expect(await x.then(opt => opt.toString())).toBe("Some { 2 }");
   * expect(await y.then(opt => opt.toString())).toBe("None");
   * ```
   */
  toString(): string {
    return "PendingOption { promise }";
  }

  /**
   * Transposes a {@link PendingOption} of a {@link Result} into a {@link Promise} of a
   * {@link Result} containing a {@link PendingOption}. Resolves to {@link Ok}({@link None})
   * if this option is {@link None}, or propagates the error if the result is {@link Err}.
   *
   * Similar to {@link Option.transposeSafeResult}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(ok(2)));
   * const y = pendingOption(some(err("error")));
   * const z = pendingOption(none<Result<number, string>>());
   *
   * expect(await x.transposeSafeResult()).toStrictEqual(ok(some(2)));
   * expect(await y.transposeSafeResult()).toStrictEqual(err("error"));
   * expect(await z.transposeSafeResult()).toStrictEqual(ok(none()));
   * ```
   */
  transposeSafeResult<V, E>(
    this: PendingOption<Result<V, E>>,
  ): Promise<Result<Option<V>, E>> {
    return this.#promise.then((option) => option.transposeSafeResult());
  }

  /**
   * Transposes a {@link PendingOption} of an {@link PromiseLike} into a {@link PendingOption}
   * with the fully awaited value.
   *
   * Similar to {@link Option.transposeAwaitable}.
   *
   * ### Example
   * ```ts
   * const x: PendingOption<Promise<Promise<number>>> = getPendingOption();
   * const y: PendingOption<number> = x.transposeAwaitable();
   *
   * const a: PendingOption<Promise<Promise<PendingOption<number>>>> = getPendingOption();
   * const b: PendingOption<Option<number>> = a.transposeAwaitable();
   * ```
   */
  transposeAwaitable<V>(
    this: PendingOption<PromiseLike<V>>,
  ): PendingOption<Awaited<V>> {
    return pendingOption(
      this.#promise.then(async (option) => {
        if (option.isNone()) {
          return none<Awaited<V>>();
        }

        return some(await option.value);
      }),
    );
  }

  /**
   * Returns a {@link PendingOption} with {@link Some} if exactly one of this option or
   * `y` resolves to {@link Some}, otherwise returns a {@link PendingOption} with
   * {@link None}.
   *
   * Accepts both synchronous and asynchronous `y`.
   *
   * Similar to {@link Option.xor}.
   *
   * ### Example
   * ```ts
   * const x = pendingOption(some(2));
   * const y = pendingOption(none<number>());
   *
   * expect(await x.xor(some(3))).toStrictEqual(none());
   * expect(await x.xor(Promise.resolve(none()))).toStrictEqual(some(2));
   * expect(await y.xor(some(3))).toStrictEqual(some(3));
   * expect(await y.xor(Promise.resolve(none()))).toStrictEqual(none());
   * ```
   */
  xor(y: MaybePromise<Option<T>>): PendingOption<T> {
    return pendingOption(
      this.#promise.then(async (option) => option.xor(await y)),
    );
  }
}
