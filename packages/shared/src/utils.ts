import { LazyPromise } from "./lazyPromise";

/**
 * Checks if a value is a `Promise`, narrowing its type to `Promise<unknown>`.
 *
 * This type guard determines whether the input is an instance of the native
 * `Promise` class, indicating it is a standard JavaScript promise.
 *
 * ### Example
 * ```ts
 * const x = Promise.resolve(42);
 * const y = new Promise((resolve) => resolve("hello"));
 * const z = { then: () => {} }; // Promise-like but not a Promise
 *
 * expect(isPromise(x)).toBe(true);
 * expect(isPromise(y)).toBe(true);
 * expect(isPromise(z)).toBe(false);
 *
 * if (isPromise(x)) {
 *   expect(await x).toBe(42); // Type narrowed to Promise<unknown>
 * }
 * ```
 */
export function isPromise(x: unknown): x is Promise<unknown> {
  return x instanceof Promise;
}

/**
 * Checks if a value is a {@link LazyPromise}, narrowing its type to
 * {@link LazyPromise<unknown>}.
 *
 * This type guard determines whether the input is an instance of the
 * {@link LazyPromise} class.
 *
 * ### Example
 * ```ts
 * const x = LazyPromise.resolve(42);
 * const y = new Promise((resolve) => resolve("hello"));
 * const z = { then: () => {} }; // Promise-like but not a Promise
 *
 * expect(isLazyPromise(x)).toBe(true);
 * expect(isLazyPromise(y)).toBe(false);
 * expect(isLazyPromise(z)).toBe(false);
 *
 * if (isLazyPromise(x)) {
 *   expect(await x).toBe(42); // Type narrowed to LazyPromise<unknown>
 * }
 * ```
 */
export function isLazyPromise(x: unknown): x is LazyPromise<unknown> {
  return x instanceof LazyPromise;
}

/**
 * Converts `Promise`, `PromiseLike` or an actual value into a `Promise`.
 *
 * This utility function normalizes its input by returning the input directly if it is
 * already a `Promise`, or wrapping it in a resolved `Promise` if it is not.
 * It ensures that the result is always a `Promise`, regardless of whether the
 * input is synchronous or asynchronous.
 *
 * ### Example
 * ```ts
 * const syncValue = 42;
 * const asyncValue = Promise.resolve("hello");
 *
 * const syncPromise = toPromise(syncValue);
 * const asyncPromise = toPromise(asyncValue);
 *
 * expect(syncPromise).toBeInstanceOf(Promise);
 * expect(await syncPromise).toBe(42);
 *
 * expect(asyncPromise).toBe(asyncValue); // Same Promise instance
 * expect(await asyncPromise).toBe("hello");
 * ```
 */
export const toPromise = <T>(x: T | Promise<T> | PromiseLike<T>): Promise<T> =>
  isPromise(x) ? x : Promise.resolve(x);

/**
 * Converts a value, `Promise`, or `PromiseLike` into a {@link LazyPromise}.
 *
 * This utility function normalizes its input by returning the input directly if it is
 * already a {@link LazyPromise}, or wrapping it in a lazily evaluated {@link LazyPromise}
 * if it is not. Unlike {@link Promise.resolve | Promise.resolve}, this does **not**
 * immediately execute the promise executor, deferring evaluation until explicitly
 * `await`ed or `.then()` is called.
 *
 * This ensures that the result is always a {@link LazyPromise}, regardless of whether the
 * input is synchronous or asynchronous.
 *
 * ### Example
 * ```ts
 * const syncValue = 42;
 * const asyncValue = Promise.resolve("hello");
 *
 * const lazySync = toLazyPromise(syncValue);
 * const lazyAsync = toLazyPromise(asyncValue);
 *
 * expect(lazySync).toBeInstanceOf(LazyPromise);
 * expect(await lazySync).toBe(42);
 *
 * expect(lazyAsync).toBeInstanceOf(LazyPromise);
 * expect(await lazyAsync).toBe("hello");
 * ```
 *
 * Unlike `Promise.resolve`, the `LazyPromise` will not start executing until awaited:
 * ```ts
 * const lazy = toLazyPromise(new Promise((res) => setTimeout(() => res("done"), 1000)));
 *
 * // No execution yet
 * setTimeout(async () => {
 *   console.log(await lazy); // Logs "done" after 1s (execution starts here)
 * }, 2000);
 * ```
 */
export const toLazyPromise = <T>(
  x: T | LazyPromise<T> | Promise<T> | PromiseLike<T>,
): LazyPromise<T> => (isLazyPromise(x) ? x : LazyPromise.resolve(x));
