import { MaybePromise } from "../types";

/**
 * Checks if a value is a {@link Promise}, narrowing its type to {@link Promise<unknown>}.
 *
 * This type guard determines whether the input is an instance of the native
 * {@link Promise} class, indicating it is a standard JavaScript promise.
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
 * Converts a {@link MaybePromise} or {@link PromiseLike} value into a {@link Promise}.
 *
 * This utility function normalizes its input by returning the input directly if it is
 * already a {@link Promise}, or wrapping it in a resolved {@link Promise} if it is not.
 * It ensures that the result is always a {@link Promise}, regardless of whether the
 * input is synchronous or asynchronous.
 *
 * ### Example
 * ```ts
 * const syncValue = 42;
 * const asyncValue = Promise.resolve("hello");
 *
 * const syncPromise = promisify(syncValue);
 * const asyncPromise = promisify(asyncValue);
 *
 * expect(syncPromise).toBeInstanceOf(Promise);
 * expect(await syncPromise).toBe(42);
 *
 * expect(asyncPromise).toBe(asyncValue); // Same Promise instance
 * expect(await asyncPromise).toBe("hello");
 * ```
 */
export const promisify = <T>(
  x: MaybePromise<T> | PromiseLike<T>,
): Promise<T> => (isPromise(x) ? x : Promise.resolve(x));

/**
 * A no-operation function that performs no action and returns nothing.
 *
 * This utility function is useful as a placeholder or default callback where an
 * operation is required but no specific behavior is needed. It takes no arguments
 * and has no side effects.
 *
 * ### Example
 * ```ts
 * const x = noop();
 * expect(x).toBeUndefined(); // No return value
 *
 * let sideEffect = 0;
 * noop(); // Does nothing
 * expect(sideEffect).toBe(0); // No side effects
 * ```
 */
export function noop(): void {}
