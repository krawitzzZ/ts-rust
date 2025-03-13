import { id } from "./fp";

/**
 * A `Promise` implementation that delays execution of the provided
 * {@link Executor} until the promise is `await`ed or one of its methods
 * ({@link LazyPromise.then | then}, {@link LazyPromise.catch | catch}, or
 * {@link LazyPromise.finally | finally}) is called.
 *
 * This class supports lazy transformations via {@link LazyPromise.pipe | pipe}
 * and error recovery via {@link LazyPromise.recover | recover}, which chain
 * operations without triggering execution, similar to {@link Promise.then | Promise.then}
 * and {@link Promise.catch | Promise.catch} but deferred. The executor runs exactly
 * once when first consumed, and the result is cached.
 *
 * ### Notes
 * - *Executor Timing*: The `executor` is invoked only when the promise is first
 *   consumed, using the values of surrounding scope variables at that time.
 * - *Garbage Collection*: If never consumed, the executor does not run, and the
 *   instance may be garbage-collected.
 * - *Error Handling*: Errors are recovered by a function set via
 *   {@link LazyPromise.pipe | pipe} or {@link LazyPromise.recover | recover}
 *   (if present) or propagate to the final `catch` handler.
 * - *Cancellation*: Not supported; the executor runs once triggered.
 *
 * ### Example
 * ```ts
 * const lp = new LazyPromise<string>((res) => setTimeout(() => res("hello"), 1000));
 * const transformed = lp.pipe((x) => x.length, () => 0).pipe((x) => x > 0);
 * // Executor hasn't run yet
 * console.log(await transformed); // true (runs executor, applies pipe chain)
 * console.log(await transformed.then((x) => !x)); // false (chains off cached result)
 * ```
 */
export class LazyPromise<T> extends Promise<T> {
  /**
   * Creates a new {@link LazyPromise | LazyPromise\<void> }.
   *
   * Overrides {@link Promise.resolve | Promise.resolve} to return a {@link LazyPromise}
   * that resolves once `await`ed, maintaining the lazy behavior of the class.
   *
   * @returns A new resolved {@link LazyPromise | LazyPromise\<void>}.
   */
  static override resolve(): LazyPromise<void>;
  /**
   * Creates a {@link LazyPromise | LazyPromise\<T>} with the provided value.
   *
   * Overrides {@link Promise.resolve | Promise.resolve} to return a lazy promise
   * that resolves once `await`ed, maintaining the lazy behavior of the class.
   *
   * @param value - The value to resolve with, which can be a `T` or a `PromiseLike<T>`.
   * @returns A {@link LazyPromise} resolved with the awaited value of type `Awaited<T>`.
   */
  static override resolve<T>(
    value: T | PromiseLike<T>,
  ): LazyPromise<Awaited<T>>;
  static override resolve<T>(value?: T): LazyPromise<Awaited<T>> {
    return new LazyPromise<Awaited<T>>((resolve) => {
      if (value === undefined) {
        // LazyPromise<void>
        resolve(undefined as Awaited<T>);
        return;
      }

      resolve(Promise.resolve(value));
    });
  }

  /**
   * Creates a rejected {@link LazyPromise} with the specified reason.
   *
   * Overrides {@link Promise.reject | Promise.reject} to return a lazy promise
   * that rejects with the provided reason, maintaining the lazy behavior of the class.
   * The generic type `T` defaults to `never`, consistent with native `Promise.reject`.
   *
   * @param reason - The reason for rejection, optional and of type `unknown`.
   * @returns A {@link LazyPromise} that rejects with the specified reason.
   */
  static override reject<T = never>(reason?: unknown): LazyPromise<T> {
    return new LazyPromise<T>((_, reject) => {
      reject(reason);
    });
  }

  /**
   * Creates a {@link LazyPromise} from a factory function that returns a
   * `Promise<T>`, delaying execution until the promise is `await`ed or one of
   * its methods ({@link LazyPromise.then | then}, {@link LazyPromise.catch | catch},
   * or {@link LazyPromise.finally | finally}) is called.
   *
   * This method encapsulates the factory pattern, allowing deferred invocation
   * of promise-creating logic (e.g., API calls or database queries). The factory
   * function is executed lazily, and any synchronous errors are caught and
   * rejected within the lazy promise.
   *
   * @param factory - A function that returns a `Promise<T>` to be resolved lazily.
   * @returns A {@link LazyPromise} resolved with the awaited value of type `Awaited<T>`.
   *
   * ### Notes
   * - *Error Handling*: Synchronous errors in the factory are caught and
   *   rejected lazily. Asynchronous errors propagate as usual.
   *
   * ### Example
   * ```ts
   * const fetchData = () => Promise.resolve("data");
   * const lp = LazyPromise.fromFactory(fetchData);
   * const piped = lp.pipe((x) => `piped: ${x}`);
   * // Factory hasn't run yet
   * expect(piped).toBeInstanceOf(LazyPromise);
   * console.log(await piped); // "piped: data"
   *
   * const failingFactory = () => {
   *   throw new Error("failed");
   * };
   * const errorLp = LazyPromise.fromFactory(failingFactory);
   * // Factory hasn't run yet
   * expect(errorLp).toBeInstanceOf(LazyPromise);
   * errorLp.catch((err) => console.log(err.message)); // "failed"
   * ```
   */
  static fromFactory<T>(factory: () => Promise<T>): LazyPromise<Awaited<T>> {
    return new LazyPromise<Awaited<T>>((resolve, reject) => {
      try {
        resolve(Promise.resolve(factory()));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Internal property that holds and caches the native `Promise` once this
   * {@link LazyPromise}’s execution is initiated.
   *
   * ## IMPORTANT
   * Only used in `#promise` getter.
   */
  #nativePromise: Promise<T> | undefined;

  /**
   * The executor function provided to the constructor, delayed until execution
   * is initiated.
   *
   * Uses `Executor<unknown>` to avoid an additional generic parameter while
   * preserving the initial type through the {@link LazyPromise.pipe | pipe} chain.
   */
  readonly #executor: Executor<unknown>;

  /**
   * The composed transformation function that maps the executor’s resolved value
   * to the final type `T`.
   *
   * This function is extended with each {@link LazyPromise.pipe | pipe} call,
   * forming a chain of transformations (e.g., `string -> number -> boolean`).
   *
   * Initially set to an identity function ({@link id}) of type `Pipe<T, T>`.
   */
  #pipe: Pipe<unknown, T>;

  /**
   * An optional recovery function that handles errors in the executor or transformation
   * chain, mapping an error reason of type `unknown` to a value of type `T` (or a
   * `PromiseLike<T>`).
   *
   * Set via {@link LazyPromise.pipe | pipe}’s optional second argument or
   * {@link LazyPromise.recover | recover}. If undefined, errors propagate as rejections.
   */
  #recover: RecoveryPipe<T> | undefined;

  /**
   * Internal getter that lazily initializes and caches the native `Promise`,
   * triggering the executor and applying the transformation chain from
   * {@link LazyPromise.pipe | pipe} and recovery from {@link LazyPromise.recover | recover}.
   *
   * The promise is materialized only once, and the result is reused, ensuring the
   * executor runs exactly once.
   */
  get #promise(): Promise<T> {
    if (!this.#nativePromise) {
      this.#nativePromise = new Promise(this.#executor)
        .then(async (value) => this.#pipe(await value))
        .catch((reason: unknown) => {
          if (this.#recover) {
            return this.#recover(reason);
          }

          throw reason;
        });
    }

    return this.#nativePromise;
  }

  /**
   * Creates a new {@link LazyPromise} that delays calling the provided
   * {@link Executor} until the promise is `await`ed or one of its methods
   * ({@link LazyPromise.then | then}, {@link LazyPromise.catch | catch}, or
   * {@link LazyPromise.finally | finally}) is called.
   *
   * @param executor - The function to execute lazily when the promise is consumed.
   */
  constructor(executor: Executor<T>) {
    super(() => {});

    this.#executor = executor;
    this.#pipe = id as Pipe<unknown, T>;
  }

  /**
   * Initiates execution of the lazy promise and chains a new promise with callbacks
   * to handle the resolved value or rejection.
   *
   * Overrides {@link Promise.then | Promise.then} to trigger the delayed executor
   * and apply the chained transformations from {@link LazyPromise.pipe | pipe} and
   * recovery from {@link LazyPromise.recover | recover}. The result is cached after
   * the first call.
   *
   * @param onfulfilled - Optional callback to transform the resolved value from `T` to `R1`.
   * @param onrejected - Optional callback to handle rejection, transforming `unknown` to `R2`.
   * @returns A native `Promise` with type `R1 | R2`.
   */
  override then<R1 = T, R2 = never>(
    onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  /**
   * Initiates execution of the lazy promise and chains a new promise with a callback
   * to handle rejection.
   *
   * Overrides {@link Promise.catch | Promise.catch} to trigger the delayed executor
   * and apply the chained transformations from {@link LazyPromise.pipe | pipe} and
   * recovery from {@link LazyPromise.recover | recover}. The result is cached after
   * the first call.
   *
   * @param onrejected - Optional callback to handle rejection, transforming `unknown` to `R`.
   * @returns A native `Promise` with type `T | R`.
   */
  override catch<R = never>(
    onrejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
  ): Promise<T | R> {
    return this.#promise.catch(onrejected);
  }

  /**
   * Initiates execution of the lazy promise and chains a new promise with a callback
   * to run after settlement.
   *
   * Overrides {@link Promise.finally | Promise.finally} to trigger the delayed executor
   * and apply the chained transformations from {@link LazyPromise.pipe | pipe} and
   * recovery from {@link LazyPromise.recover | recover}. The result is cached after
   * the first call.
   *
   * @param onfinally - Optional callback to run after settlement.
   * @returns A native `Promise` with type `T`.
   */
  override finally(onfinally?: (() => void) | null): Promise<T> {
    return this.#promise.finally(onfinally);
  }

  /**
   * Lazily applies a transformation to the resolved value, returning a new
   * {@link LazyPromise} with the transformed type, without triggering execution.
   *
   * Similar to {@link Promise.then | Promise.then}, this method chains a transformation
   * function `f` that maps `T` to `U` (or `PromiseLike<U>`), deferring execution until
   * the promise is consumed. An optional recovery function `g` can handle errors lazily.
   *
   * ### Notes
   * - *Execution*: Transformation and recovery are lazy and execute only when consumed.
   * - *Error Handling*: Errors are recovered by `g` if provided, else propagate.
   * - *Performance*: Creates a new instance, adding minor overhead.
   *
   * ### Example
   * ```ts
   * const lp = new LazyPromise<string>((res) => res("hello"));
   * const transformed = lp.pipe((x) => x.length, () => 0);
   * console.log(await transformed); // 5
   * ```
   *
   * @param f - Transformation function from `T` to `U`.
   * @param g - Optional recovery function from `unknown` to `U`.
   * @returns A new {@link LazyPromise} of type `U`.
   */
  pipe<U>(f: Pipe<T, U>, g?: RecoveryPipe<U>): LazyPromise<U> {
    const pipe: Pipe<T, U> = async (x: Awaited<T>) => f(await this.#pipe(x));
    return this.#new(pipe, g);
  }

  /**
   * Lazily attaches a recovery function to handle errors, returning a new
   * {@link LazyPromise} with type `T`, without triggering execution.
   *
   * Similar to {@link Promise.catch | Promise.catch}, this method schedules a recovery
   * function `g` to map errors to `T` (or `PromiseLike<T>`), deferring execution until
   * consumed.
   *
   * ### Notes
   * - *Execution*: Recovery is lazy and runs only on error when consumed.
   * - *Difference from `pipe`*: Preserves type `T`, only handling errors.
   *
   * ### Example
   * ```ts
   * const lp = new LazyPromise<string>((_, rej) => rej("error"));
   * const recovered = lp.recover((err) => `recovered: ${err}`);
   * console.log(await recovered); // "recovered: error"
   * ```
   *
   * @param g - Recovery function from `unknown` to `T`.
   * @returns A new {@link LazyPromise} of type `T`.
   */
  recover(g: RecoveryPipe<T>): LazyPromise<T> {
    return this.#new(this.#pipe, g);
  }

  /**
   * Creates a new {@link LazyPromise} with the provided transformation and optional
   * recovery function, reusing the original executor.
   *
   * Used by {@link LazyPromise.pipe | pipe} and {@link LazyPromise.recover | recover}
   * to build the lazy chain without triggering execution.
   *
   * ### Type Safety and Casts
   * - *Executor Cast*: `this.#executor` from `Executor<unknown>` to `Executor<U>` is safe
   *   as the `#pipe` chain adapts the type.
   * - *Pipe Cast*: `pipe` from `Pipe<T, U>` to `Pipe<unknown, U>` is safe due to the
   *   initial `Pipe<unknown, T>` typing and composition.
   */
  #new<U>(pipe: Pipe<T, U>, recover?: RecoveryPipe<U>): LazyPromise<U> {
    const lp = new LazyPromise<U>(this.#executor as Executor<U>);

    lp.#pipe = pipe as Pipe<unknown, U>;

    if (recover) {
      lp.#recover = recover;
    }

    return lp;
  }
}

/**
 * A function type that defines a transformation from one type to another,
 * used in {@link LazyPromise.pipe} to chain operations lazily.
 *
 * This type represents a pipe in a functional composition chain, taking an
 * awaited value of type `From` and transforming it into a value of type `To`
 * (or a `PromiseLike<To>`), allowing both synchronous and asynchronous
 * transformations.
 */
export type Pipe<From, To = From> = (x: Awaited<From>) => To | PromiseLike<To>;

/**
 * A function type that defines a recovery operation for handling errors in a
 * {@link LazyPromise}, mapping an error reason to a fallback value.
 *
 * Used in {@link LazyPromise.pipe | pipe} (as the optional second argument) and
 * {@link LazyPromise.recover | recover}, this type takes an error reason of type
 * `unknown` and returns a value of type `T` (or a `PromiseLike<T>`), allowing the
 * promise to resolve instead of reject. It supports both synchronous and asynchronous
 * recovery logic.
 */
export type RecoveryPipe<T> = (reason: unknown) => T | PromiseLike<T>;

type Executor<T> = ConstructorParameters<typeof Promise<T>>[0];
