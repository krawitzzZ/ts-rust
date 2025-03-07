import { Primitive } from "./interface";

/**
 * Checks if a value is a {@link Primitive}, narrowing its type accordingly.
 *
 * This type guard determines whether the input is a **primitive** value,
 * meaning it is one of the fundamental, immutable JavaScript types:
 * - `boolean`
 * - `string`
 * - `number`
 * - `bigint`
 * - `symbol`
 * - `null`
 * - `undefined`
 *
 * Unlike objects, arrays, or functions, primitives are **copied by value** and
 * do not have reference-based mutations.
 *
 * ### Example
 * ```ts
 * expect(isPrimitive(42)).toBe(true);
 * expect(isPrimitive("hello")).toBe(true);
 * expect(isPrimitive(null)).toBe(true);
 * expect(isPrimitive({})).toBe(false);
 * expect(isPrimitive([])).toBe(false);
 *
 * function processValue(x: unknown) {
 *   if (isPrimitive(x)) {
 *     // x is now narrowed to Primitive
 *   }
 * }
 * ```
 */
export function isPrimitive(x: unknown): x is Primitive {
  return (
    x === null ||
    x === undefined ||
    typeof x === "boolean" ||
    typeof x === "string" ||
    typeof x === "number" ||
    typeof x === "bigint" ||
    typeof x === "symbol"
  );
}
