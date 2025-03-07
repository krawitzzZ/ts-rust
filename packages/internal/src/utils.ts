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
 * Converts {@link Promise}, {@link PromiseLike} or an actual value into a {@link Promise}.
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
export const promisify = <T>(x: T | Promise<T> | PromiseLike<T>): Promise<T> =>
  isPromise(x) ? x : Promise.resolve(x);

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

/**
 * The identity function, returning its input unchanged.
 *
 * A fundamental concept in functional programming, this function takes a value
 * of any type and returns it as-is. It serves as a neutral element in function
 * composition and is often used as a default or placeholder function where
 * transformation is not needed. Borrowed from languages like Haskell
 * (where it’s `id`), it’s a simple yet powerful utility for maintaining
 * referential transparency.
 *
 * ### Example
 * ```ts
 * const x = 42;
 * const y = "hello";
 * const z = { num: 1 };
 *
 * expect(id(x)).toBe(42);
 * expect(id(y)).toBe("hello");
 * expect(id(z)).toBe(z);
 *
 * const composed = id(id(42)); // Still 42
 * expect(composed).toBe(42);
 * ```
 */
export function id<T>(x: T): T {
  return x;
}

/**
 * Creates a constant function that always returns the same value.
 *
 * Inspired by functional programming (e.g., Haskell’s `const`), this utility
 * takes a value and returns a function that, when called, always returns that
 * original value, ignoring any arguments passed to it. It’s useful for creating
 * predictable, immutable behavior in higher-order functions, such as providing
 * a default value or stubbing out callbacks.
 *
 * ### Example
 * ```ts
 * const always42 = constant(42);
 * const alwaysHello = constant("hello");
 *
 * expect(always42()).toBe(42);
 * expect(always42("ignored")).toBe(42); // Arguments are ignored
 * expect(alwaysHello()).toBe("hello");
 *
 * const mapWithDefault = [1, 2, 3].map(constant(0));
 * expect(mapWithDefault).toEqual([0, 0, 0]);
 * ```
 */
export function constant<T>(value: T): () => T {
  return () => value;
}
