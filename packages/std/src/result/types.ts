import { PendingResult, Result } from "./index";

/**
 * Extracts a tuple of underlying success value types from an array of {@link Result} or
 * {@link PendingResult} instances.
 *
 * The {@link OkValues} type maps over a tuple `T` of `Result<unknown, E>` or
 * `PendingResult<unknown, E>` types and extracts the success value type `U` for each
 * element using conditional type inference. The result is a tuple of the inferred success
 * value types corresponding to the input array's elements, ignoring the error types.
 */
export type OkValues<T extends unknown[], E = unknown> = {
  [idx in keyof T]: T[idx] extends Result<infer U, E>
    ? U
    : T[idx] extends PendingResult<infer U, E>
      ? U
      : never;
};

/**
 * Extracts a tuple of awaited underlying success value types from an array of {@link Result} or
 * {@link PendingResult} instances.
 *
 * The {@link OkAwaitedValues} type maps over a tuple `T` of `Result<unknown, E>` or
 * `PendingResult<unknown, E>` types and extracts the awaited success value type `U` for each
 * element using conditional type inference. It applies the `Awaited` utility type to resolve
 * `Promise`-like types within each `U`, making it suitable for handling asynchronous success values
 * across multiple instances. The result is a tuple of the awaited inferred success value types
 * corresponding to the input array's elements, ignoring the error types.
 */
export type OkAwaitedValues<T extends unknown[], E = unknown> = {
  [idx in keyof T]: T[idx] extends Result<infer U, E>
    ? Awaited<U>
    : T[idx] extends PendingResult<infer U, E>
      ? Awaited<U>
      : never;
};
