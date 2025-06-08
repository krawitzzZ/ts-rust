import { PendingResult, Result } from "./index";

/**
 * Extracts the underlying success value type `T` from a {@link Result} or {@link PendingResult}.
 *
 * The {@link OkValue} type uses conditional type inference to determine the success value type
 * `T` from either a `Result<T, E>` or a `PendingResult<T, E>`. It focuses on the `Ok` variant's
 * value type, ignoring the error type `E`. If the input type `T` is neither a `Result` nor a
 * `PendingResult`, it returns `never`.
 */
export type OkValue<T, E = unknown> =
  T extends Result<infer U, E>
    ? U
    : T extends PendingResult<infer U, E>
      ? U
      : never;

/**
 * Extracts the underlying error value type `E` from a {@link Result} or {@link PendingResult}.
 *
 * The {@link ErrValue} type uses conditional type inference to determine the error value type
 * `E` from either a `Result<T, E>` or a `PendingResult<T, E>`. It focuses on the `Err` variant's
 * error type, ignoring the success type `T`. If the input type `T` is neither a `Result` nor a
 * `PendingResult`, it returns `never`.
 */
export type ErrValue<T, V = unknown> =
  T extends Result<V, infer E>
    ? E
    : T extends PendingResult<V, infer E>
      ? E
      : never;

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

/**
 * Extracts a tuple of underlying error value types from an array of {@link Result} or
 * {@link PendingResult} instances.
 *
 * The {@link ErrValues} type maps over a tuple `T` of `Result<V, unknown>` or
 * `PendingResult<V, unknown>` types and extracts the error value type `U` for each
 * element using conditional type inference. The result is a tuple of the inferred error
 * value types corresponding to the input array's elements, ignoring the success types.
 */
export type ErrValues<T extends unknown[], V = unknown> = {
  [idx in keyof T]: T[idx] extends Result<V, infer U>
    ? U
    : T[idx] extends PendingResult<V, infer U>
      ? U
      : never;
};
