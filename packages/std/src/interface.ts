/**
 * Defines a type `T` that is **cloneable**, capable of being duplicated either
 * implicitly as a {@link Copy} primitive or explicitly via a {@link Clone} implementation.
 *
 * The {@link Cloneable} type encompasses all values that can be cloned into a new,
 * independent instance. It is a union of:
 * - {@link Copy} types: JavaScript {@link Primitive | primitives} (e.g., `number`,
 *   `string`, `boolean`) that are inherently copied by value through assignment.
 * - {@link Clone} types: Types that provide an explicit `clone()` method to create
 *   a duplicate instance of `T`.
 *
 * Inspired by Rust's distinction between `Copy` and `Clone`, this type captures:
 * - **Implicit cloning**: For {@link Copy} types, where assignment (e.g., `let y = x`)
 *   creates a new copy due to their value semantics.
 * - **Explicit cloning**: For {@link Clone} types, where a `clone()` method must be
 *   invoked to produce a new instance.
 *
 * This type is broader than {@link Clone} alone, as it includes both implicitly
 * copyable primitives and explicitly cloneable types. For non-{@link Copy} types,
 * the `clone()` method should return a distinct instance, though the depth of the
 * copy (shallow or deep) depends on the implementation.
 *
 *
 * ### Example
 * ```ts
 * // Primitive satisfies Cloneable<number> via Copy<number>
 * const num: Cloneable<number> = 42;
 * const numCopy = num; // Implicitly copied by value
 * console.log(numCopy === num); // true (same value)
 *
 * // Class satisfies Cloneable<MyType> via Clone<MyType>
 * class MyType implements Clone<MyType> {
 *   constructor(public value: number) {}
 *   clone(): MyType {
 *     return new MyType(this.value);
 *   }
 * }
 * const original = new MyType(42);
 * const duplicate = original.clone();
 * console.log(duplicate.value === original.value); // true (same value)
 * console.log(duplicate !== original); // true (different reference)
 * ```
 */
export type Cloneable<T> = Copy<T> | Clone<T>;

/**
 * Defines a type `T` that is **cloneable**, providing a method to create a new,
 * independent instance of itself.
 *
 * The {@link Clone} interface ensures that any type implementing it can produce
 * a duplicate of its current instance via the `clone` method. The type `T`
 * represents the specific type of the implementing instance.
 *
 * Similar to Rust's `Clone` trait, this interface is intended for types that
 * need explicit duplication logic (e.g., objects or complex structures),
 * as opposed to {@link Copy} types, which are implicitly copied by value.
 * Unlike reference types that might share state, a {@link Copy.clone | clone}
 * implementation should produce a distinct instance, though the depth of the copy
 * (shallow or deep) is left to the implementor.
 *
 * `T` is the type of the instance that implements this interface.
 * Typically, this is the class or type itself (e.g., a class `MyType` would
 * implement `Clone<MyType>`).
 *
 * ### Example
 * ```ts
 * class MyType implements Clone<MyType> {
 *   constructor(public value: number) {}
 *
 *   clone(this: MyType): MyType {
 *     return new MyType(this.value);
 *   }
 * }
 *
 * const original = new MyType(42);
 * const duplicate = original.clone();
 * expect(duplicate.value).toBe(original.value); // same value
 * expect(duplicate).not.toBe(original); // different reference
 * ```
 */
export interface Clone<T> {
  clone(): T;
}

/**
 * Ensures that type `T` is a **copyable** (value-cloneable) primitive.
 *
 * The {@link Copy} type includes all JavaScript {@link Primitive | primitives }
 * that are copied **by value** rather than by reference. This includes:
 * - `boolean`
 * - `string`
 * - `number`
 * - `bigint`
 * - `symbol`
 * - `null`
 * - `undefined`
 *
 * Unlike objects, arrays, functions, and other reference types, these values do
 * not require explicit cloning. They are inherently immutable or can be freely
 * reassigned without affecting their original instance.
 *
 * Similar to Rust's `Copy` trait, this type helps enforce that values remain
 * independently assignable without unexpected shared mutations.
 */
export type Copy<T> = T extends Primitive ? T : never;

/**
 * Represents all JavaScript **primitive** types.
 *
 * A **primitive** is any value that is **not** an object and has no methods.
 * Primitives are immutable (except for `symbol` properties) and are compared
 * **by value**, not by reference.
 *
 * The `Primitive` type includes:
 * - `boolean`
 * - `string`
 * - `number`
 * - `bigint`
 * - `symbol`
 * - `null`
 * - `undefined`
 *
 * Objects, arrays, functions, and other reference types **are not** primitives.
 * Use this type to enforce that a value belongs to one of these fundamental types.
 */
export type Primitive =
  | boolean
  | string
  | number
  | bigint
  | symbol
  | null
  | undefined;

/**
 * Ensures that type `T` is **not** a {@link PromiseLike}.
 *
 * This helper type excludes promise-like types (those with a `then` method) from
 * being assigned to `T`. If `T` is a {@link PromiseLike}, it resolves to `never`.
 * Used to enforce synchronous values.
 *
 * Resolves to `never` by default.
 */
export type Sync<T = never> = T extends PromiseLike<infer _> ? never : T;

/**
 * Ensures that type `T` **is** a {@link PromiseLike}.
 *
 * This helper type restricts `T` to promise-like types (those with a `then` method).
 * If `T` is not a {@link PromiseLike}, it resolves to `never`. Used to define
 * asynchronous values.
 *
 * Resolves to `never` by default.
 */
export type Async<T = unknown> = [T] extends [PromiseLike<infer R>]
  ? PromiseLike<Awaited<R>>
  : never;
