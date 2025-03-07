import { id } from "./utils";

// TODO(nikita.demin): write tests

/**
 * A {@link Promise} implementation that delays execution of the provided
 * {@link Executor} until the promise is `await`ed or one of its methods
 * ({@link LazyPromise.then | then}, {@link LazyPromise.catch | catch}, or
 * {@link LazyPromise.finally | finally}) is called.
 *
 * This class supports lazy transformations via the {@link LazyPromise.pipe | pipe}
 * method, which chains operations without triggering execution, similar to
 * {@link Promise.then | Promise.then} but deferred. This makes it ideal for
 * scenarios where you want to compose asynchronous operations without starting
 * them immediately.
 *
 * ### Notes
 * - *Garbage Collection*: If a {@link LazyPromise} is never awaited or used
 *   (e.g., no calls to `then`, `catch`, or `finally`), the executor will not run,
 *   and the instance may be garbage-collected, allowing the script to terminate.
 * - *Error Handling*: Errors in the executor or piped functions propagate to
 *   the final `catch` handler.
 * - *Cancellation*: This implementation does not support cancellation. The
 *   executor will run once triggered and cannot be stopped.
 *
 * ### Example
 * ```ts
 * const lp = new LazyPromise<string>((res) => {
 *   setTimeout(() => res("lazy done"), 1000);
 * });
 * const transformed = lp.pipe((x) => x.length).pipe((x) => x > 0);
 * // Executor hasn't run yet
 * setTimeout(async () => {
 *   const result = await transformed; // Triggers executor
 *   console.log(result); // true
 * }, 2000);
 * ```
 */
export class LazyPromise<T> extends Promise<T> {
  /**
   * Creates a new resolved {@link LazyPromise | LazyPromise\<void> }.
   *
   * Overrides {@link Promise.resolve | Promise.resolve} to return a {@link LazyPromise}
   * that resolves once `await`ed, maintaining the lazy behavior of the class.
   *
   * @returns A new resolved {@link LazyPromise | LazyPromise\<void>}.
   */
  static override resolve(): LazyPromise<void>;
  /**
   * Creates a resolved {@link LazyPromise | LazyPromise\<T>} with the provided
   * value.
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
   * Internal property that holds the native {@link Promise} once this
   * {@link LazyPromise}’s execution is initiated.
   */
  #initializedPromise: Promise<T> | undefined;

  /**
   * The executor function provided to the constructor, delayed until execution
   * is initiated.
   *
   * Uses `Executor<unknown>` to avoid an additional generic parameter while
   * preserving the initial type through the {@link LazyPromise.pipe | pipe} chain.
   */
  #executor: Executor<unknown>;

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
   * Internal getter that lazily initializes and returns the native {@link Promise},
   * triggering the executor and applying the transformation chain from
   * {@link LazyPromise.pipe | pipe}.
   */
  get #promise(): Promise<T> {
    if (this.#initializedPromise) {
      return this.#initializedPromise;
    }

    this.#initializedPromise = new Promise(this.#executor).then(async (x) =>
      this.#pipe(await x),
    );

    return this.#initializedPromise;
  }

  /**
   * Creates a new {@link LazyPromise} that delays calling the provided
   * {@link Executor} until the promise is `await`ed or one of its methods
   * ({@link LazyPromise.then | then}, {@link LazyPromise.catch | catch}, or
   * {@link LazyPromise.finally | finally}) is called.
   */
  constructor(executor: Executor<T>) {
    super(() => {});

    this.#executor = executor;
    this.#pipe = id as Pipe<unknown, T>;
  }

  /**
   * Initiates execution of the lazy promise and registers a callback to handle
   * the resolved value or rejection.
   *
   * Overrides {@link Promise.then | Promise.then} to trigger the delayed executor
   * and apply the chained transformations from {@link LazyPromise.pipe | pipe}.
   */
  override then<R1 = T, R2 = never>(
    onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  /**
   * Initiates execution of the lazy promise and registers a callback to handle
   * rejection.
   *
   * Overrides {@link Promise.catch | Promise.catch} to trigger the delayed executor
   * and apply the chained transformations from {@link LazyPromise.pipe | pipe}.
   */
  override catch<R = never>(
    onrejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
  ): Promise<T | R> {
    return this.#promise.catch(onrejected);
  }

  /**
   * Initiates execution of the lazy promise and registers a callback to run after
   * the promise settles (resolves or rejects).
   *
   * Overrides {@link Promise.finally | Promise.finally} to trigger the delayed
   * executor and apply the chained transformations from {@link LazyPromise.pipe | pipe}.
   */
  override finally(onfinally?: (() => void) | null): Promise<T> {
    return this.#promise.finally(onfinally);
  }

  /**
   * Lazily applies a transformation to the resolved value, returning a new
   * {@link LazyPromise} with the transformed type, without triggering execution.
   *
   * Similar to {@link Promise.then | Promise.then}, this method chains a function
   * that transforms the resolved value from type `T` to `U` (or a `PromiseLike<U>`),
   * but defers execution until the promise is `await`ed or one of its methods
   * ({@link LazyPromise.then | then}, {@link LazyPromise.catch | catch}, or
   * {@link LazyPromise.finally | finally}) is called. The transformations are
   * applied in the order they are piped.
   *
   * ### Notes
   * - *Error Handling*: If the pipe function throws or rejects, the error
   *   propagates to the final `catch` handler.
   * - *Performance*: Long chains of pipes create new {@link LazyPromise}
   *   instances, which may add overhead, though execution only occurs once and
   *   remains lazy.
   *
   * ### Example
   * ```ts
   * const lp = new LazyPromise<string>((res) => res("hello"));
   * const transformed = lp.pipe((x) => x.length).pipe((x) => x > 0);
   * // Type: LazyPromise<boolean>
   * console.log(await transformed); // true
   * ```
   */
  pipe<U>(f: Pipe<T, U>): LazyPromise<U> {
    const pipe: Pipe<T, U> = async (x: Awaited<T>) => f(await this.#pipe(x));
    const lp = new LazyPromise<U>(this.#executor as Executor<U>);

    lp.#pipe = pipe as Pipe<unknown, U>;

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

type Executor<T> = ConstructorParameters<typeof Promise<T>>[0];
