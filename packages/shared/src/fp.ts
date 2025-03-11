/**
 * A no-operation function that performs no action and returns nothing.
 *
 * This utility function is useful as a placeholder or default callback where an
 * operation is required but no specific behavior is needed. It accepts any number
 * of arguments but ignores them entirely.
 *
 * ### Example
 * ```ts
 * const x = noop();
 * expect(x).toBeUndefined(); // No return value
 *
 * noop(1, "test", {}); // Still does nothing
 *
 * let sideEffect = 0;
 * noop(sideEffect++); // Does not modify sideEffect
 * expect(sideEffect).toBe(0);
 * ```
 */
export function noop(..._: unknown[]): void {}

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
 * original value. The returned function **accepts any number of arguments**,
 * but ignores them. This is useful for predictable behavior in higher-order
 * functions, like defaults or stubs.
 *
 * ### Example
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
