/**
 * The `Types` module defines common utility types used throughout
 * the `@ts-rust/std` package. It exports foundational types such as `Primitive`,
 * `Cloneable`, `Clone`, `Recoverable`, and `MaybePromise`, which provide building
 * blocks for type-safe programming in TypeScript. Inspired by Rust's type system,
 * these types enable better handling of cloning, error recovery, and
 * synchronous/asynchronous value interoperability. Use this module to leverage
 * these utility types in your TypeScript applications for more robust and
 * predictable code.
 * @module Types
 */

/**
 * Defines a type `T` that is **cloneable**, capable of being duplicated either
 * implicitly as a {@link Primitive} or explicitly via a {@link Clone} implementation.
 *
 * The {@link Cloneable} type encompasses all values that can be cloned into a new,
 * independent instance. It is a union of:
 * - {@link Primitive} type: JavaScript {@link Primitive | primitives} (e.g., `number`,
 *   `string`, `boolean`) that are inherently copied by value through assignment.
 * - {@link Clone} types: Types that provide an explicit `clone()` method to create
 *   a duplicate instance of `T`.
 *
 * Inspired by Rust's distinction between `Copy` and `Clone`, this type captures:
 * - **Implicit cloning**: For {@link Primitive} types, where assignment
 *   (e.g., `let y = x`) creates a new copy due to their value semantics.
 * - **Explicit cloning**: For {@link Clone} types, where a `clone()` method must be
 *   invoked to produce a new instance.
 *
 * This type is broader than {@link Clone} alone, as it includes both implicitly
 * copyable {@link Primitive | primitives} and explicitly cloneable types. For
 * non-primitive types, the `clone()` method should return a distinct instance,
 * though the depth of the copy (shallow or deep) depends on the implementation.
 *
 *
 * ### Example
 * ```ts
 * // Primitive satisfies Cloneable<number>
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
export type Cloneable<T> = T extends Primitive
  ? T
  : T extends Clone<T>
    ? T
    : never;

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
 * as opposed to {@link Primitive} types, which are implicitly copied by value.
 * Unlike reference types that might share state, a {@link Clone.clone | clone}
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
  clone(this: T): T;
  clone(this: Clone<T>): T;
}

/**
 * Defines a type `T` that is **recoverable**, providing error handling capabilities
 * for potentially failing operations.
 *
 * The {@link Recoverable} interface ensures that any type implementing it can handle
 * errors gracefully through the `catch` method, allowing for fallback values or
 * alternative logic when operations fail. The type parameter `T` represents the
 * successful result type that would be produced in the absence of errors.
 *
 * Similar to JavaScript's Promise error handling pattern, this interface standardizes
 * error recovery across different implementation types. It allows consuming code to
 * safely handle both the successful and error paths without needing to know the
 * specific error handling mechanisms of the underlying implementation.
 *
 * The `T` type parameter represents the successful value type that will be resolved
 * if no error occurs. The `R` type parameter in the `catch` method represents the
 * type that will be produced by the error handler when an error is caught.
 *
 * ### Example
 * ```ts
 * class Result<T> implements Recoverable<T> {
 *   constructor(private value: T | Error) {}
 *
 *   catch<R>(onrejected: (reason: unknown) => R): Promise<T | R> {
 *     if (this.value instanceof Error) {
 *       return Promise.resolve(onrejected(this.value));
 *     }
 *     return Promise.resolve(this.value);
 *   }
 * }
 *
 * // Success case
 * const success = new Result<number>(42);
 * const value = await success.catch(err => -1);
 * expect(value).toBe(42); // Original value returned
 *
 * // Error case
 * const failure = new Result<number>(new Error("Failed"));
 * const fallback = await failure.catch(err => -1);
 * expect(fallback).toBe(-1); // Fallback value from error handler
 * ```
 */
export interface Recoverable<T> {
  catch<R = never>(
    onrejected?: (reason: unknown) => R | PromiseLike<R>,
  ): Promise<T | R>;
}

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
 * Represents either a value of type `T` or a `Promise` resolving to `T`.
 *
 * The {@link MaybePromise} type provides flexibility when working with both synchronous
 * and asynchronous values in a unified way. It allows functions and interfaces to
 * accept either immediate values or promises without needing separate implementations,
 * simplifying API design and improving interoperability between synchronous and
 * asynchronous code.
 *
 * The `T` type parameter represents the actual value type, whether provided directly
 * or eventually resolved from a Promise.
 */
export type MaybePromise<T> = T | Promise<T>;
