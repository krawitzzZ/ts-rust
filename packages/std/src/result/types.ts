import { PendingResult, Result } from "./index";

/**
 * Extracts a tuple of underlying success value types from an array of {@link Result} or
 * {@link PendingResult} instances.
 *
 * The {@link OkValues} type maps over a tuple `T` of `Result` or `PendingResult`
 * types and extracts the success value type `U` for each element using
 * conditional type inference. Both type parameters of {@link Result} are
 * inferred so that invariance in the error type does not collapse `U` to
 * `never`. The result is a tuple of the inferred success value types
 * corresponding to the input array's elements.
 */
export type OkValues<T extends unknown[]> = {
  [idx in keyof T]: T[idx] extends Result<infer U, infer _E>
    ? U
    : T[idx] extends PendingResult<infer U, infer _E>
      ? U
      : never;
};

/**
 * Extracts a tuple of awaited underlying success value types from an array of {@link Result} or
 * {@link PendingResult} instances.
 *
 * The {@link OkAwaitedValues} type maps over a tuple `T` of `Result` or
 * `PendingResult` types and extracts the awaited success value type `U` for
 * each element using conditional type inference. Both type parameters of
 * {@link Result} are inferred so that invariance in the error type does not
 * collapse `U` to `never`. It applies the `Awaited` utility type to resolve
 * `Promise`-like types within each `U`, making it suitable for handling
 * asynchronous success values across multiple instances. The result is a tuple
 * of the awaited inferred success value types corresponding to the input
 * array's elements.
 */
export type OkAwaitedValues<T extends unknown[]> = {
  [idx in keyof T]: T[idx] extends Result<infer U, infer _E>
    ? Awaited<U>
    : T[idx] extends PendingResult<infer U, infer _E>
      ? Awaited<U>
      : never;
};

/**
 * Extracts the success type parameter from a {@link Result}.
 */
export type InferOk<R> = R extends Result<infer T, infer _E> ? T : never;

/**
 * Extracts the error type parameter from a {@link Result}.
 */
export type InferErr<R> = R extends Result<infer _T, infer E> ? E : never;

type IsUnknown<T> = [unknown] extends [T]
  ? [T] extends [unknown]
    ? true
    : false
  : false;

/**
 * Unions two error types, treating `never` and `unknown` as unbound slots.
 *
 * Used when a generator both yields `Err`s and returns a {@link Result}, so an
 * unannotated `ok()` does not swallow concrete errors from `yield*`.
 */
export type MergeErr<A, B> = [A] extends [never]
  ? B
  : [B] extends [never]
    ? A
    : IsUnknown<A> extends true
      ? B
      : IsUnknown<B> extends true
        ? A
        : A | B;
