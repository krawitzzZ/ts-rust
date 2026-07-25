/**
 * Checks if a value is a `Promise`, narrowing its type to `Promise<unknown>`.
 *
 * This type guard determines whether the input is an instance of the native
 * `Promise` class, indicating it is a standard JavaScript promise.
 *
 * @example
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
 * Converts `Promise`, `PromiseLike` or an actual value into a `Promise`.
 *
 * This utility function normalizes its input by returning the input directly if it is
 * already a `Promise`, or wrapping it in a resolved `Promise` if it is not.
 * It ensures that the result is always a `Promise`, regardless of whether the
 * input is synchronous or asynchronous.
 *
 * @example
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
export const toPromise = <T>(
  x: T | Promise<T> | PromiseLike<T>,
): Promise<Awaited<T>> => Promise.resolve(x);

/**
 * Creates a deep clone of an {@link Error}, duplicating its message, nested
 * causes and reasons.
 *
 * This function constructs a new {@link Error} instance with the same message as the
 * provided error, and recursively clones any nested `reason` or `cause` if they are
 * errors. Non-error `cause` values are cloned if possible, preserving the error's
 * structure without shared references.
 */
export const cloneError = (err: Error): Error => {
  const clone = new Error(err.message);

  if (err.stack) {
    Object.defineProperty(clone, "stack", {
      value: err.stack,
      writable: true,
      configurable: true,
    });
  }

  if ("reason" in err && err.reason instanceof Error) {
    Object.defineProperty(clone, "reason", {
      value: cloneError(err.reason),
      writable: true,
      configurable: true,
    });
  }

  if ("cause" in err) {
    try {
      Object.defineProperty(clone, "cause", {
        value:
          err.cause instanceof Error
            ? cloneError(err.cause)
            : structuredClone(err.cause),
        writable: true,
        configurable: true,
      });
    } catch {
      // do not care about the error
    }
  }

  return clone;
};
