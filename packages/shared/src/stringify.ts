/**
 * Converts a value to a human-readable string representation.
 *
 * This utility function provides a robust way to stringify various types,
 * including primitives, objects, functions, symbols, promises, and more.
 * It ensures meaningful representations, preventing errors with circular
 * structures or unstringifiable objects.
 *
 * - `null` and `undefined` are returned as `"null"` and `"undefined"`, respectively.
 * - `string`, `number`, `boolean`, `bigint`, and `symbol` values are converted to strings.
 * - Functions return their name (or `"anonymous"` if unnamed).
 * - Promises return `"promise"`.
 * - Objects attempt `toString()`, falling back to `JSON.stringify()`.
 * - If an object cannot be stringified (e.g., circular references), it returns `"[Circular or Unstringifiable Object]"`.
 *
 * If `quoteString` is `true`, string values are wrapped in single quotes.
 *
 * ### Example
 * ```ts
 * expect(stringify(42)).toBe("42");
 * expect(stringify("hello")).toBe("hello");
 * expect(stringify("hello", true)).toBe("'hello'");
 * expect(stringify(null)).toBe("null");
 * expect(stringify(undefined)).toBe("undefined");
 * expect(stringify(Symbol("id"))).toBe("Symbol(id)");
 * expect(stringify(BigInt(1234))).toBe("1234n");
 * expect(stringify(() => {})).toBe("[Function: anonymous]");
 * expect(stringify({ a: 1 })).toBe('{"a":1}');
 * expect(stringify(Promise.resolve())).toBe("promise");
 * ```
 *
 * @param value - The value to stringify.
 * @param quoteString - Whether to wrap string values in single quotes (default to `false`).
 * @returns A string representation of the value.
 */
export function stringify(value: unknown, quoteString = false): string {
  if (value instanceof Promise) {
    return "promise";
  }

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return quoteString ? `'${value}'` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "bigint") {
    return value.toString() + "n";
  }

  if (typeof value === "function") {
    return `[Function: ${value.name || "anonymous"}]`;
  }

  if (typeof value === "object") {
    const v = value as { toString?: () => string };

    if (
      typeof v.toString === "function" &&
      v.toString !== Object.prototype.toString
    ) {
      return v.toString();
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "[Circular or Unstringifiable Object]";
    }
  }

  return "[Unknown Type]";
}
