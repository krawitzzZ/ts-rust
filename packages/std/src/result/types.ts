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
