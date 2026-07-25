/**
 * Creates a constant function that always returns the same value.
 *
 * Inspired by functional programming (e.g., Haskell's `const`), this utility
 * takes a value and returns a function that, when called, always returns that
 * original value. The returned function **accepts any number of arguments**,
 * but ignores them. This is useful for predictable behavior in higher-order
 * functions, like defaults or stubs.
 *
 * @example
 * ```ts
 * const always42 = cnst(42);
 * const alwaysHello = cnst("hello");
 *
 * expect(always42()).toBe(42);
 * expect(always42("ignored")).toBe(42); // Arguments are ignored
 * expect(always42(1, 2, 3)).toBe(42); // Still returns 42
 * expect(alwaysHello()).toBe("hello");
 *
 * const mapWithDefault = [1, 2, 3].map(cnst(0));
 * expect(mapWithDefault).toEqual([0, 0, 0]);
 * ```
 *
 * @param value - The constant value to be returned by the function.
 * @returns A function that always returns `value`, ignoring any arguments.
 */
export function cnst<T>(value: T): (..._: unknown[]) => T {
  return () => value;
}
