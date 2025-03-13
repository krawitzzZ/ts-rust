import { AnyError } from "../error";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Resultant, Result, Ok, Err } from "./interface";

/**
 * Enumerates error codes specific to {@link Result} operations.
 *
 * These codes are used in {@link AnyError} instances thrown by methods like
 * {@link Resultant.unwrap | unwrap} or {@link Resultant.expect | expect} when
 * operations fail due to the state of the result.
 */
export enum ResultErrorKind {
  ErrorAccessedOnOk = "ErrorAccessedOnOk",
  ValueAccessedOnErr = "ValueAccessedOnErr",
  ExpectCalledOnErr = "ExpectCalledOnErr",
  UnwrapCalledOnErr = "UnwrapCalledOnErr",
  UnwrapErrCalledOnOk = "UnwrapErrCalledOnOk",
  ResultRejection = "ResultRejection",
  PredicateException = "PredicateException",
  FromOptionException = "FromOptionException",
}

/**
 * An error thrown by {@link Result} methods when operations fail due to the
 * result's state or unexpected conditions.
 *
 * This class extends {@link AnyError} with error kinds specific to {@link Result}
 * operations, as defined in {@link ResultErrorKind}. It is typically thrown by
 * methods like {@link Resultant.unwrap | unwrap}, {@link Resultant.unwrapErr | unwrapErr},
 * or {@link Resultant.expect | expect} when attempting to access values or errors
 * inconsistent with the result’s {@link Ok} or {@link Err} state. Use it to handle
 * failures in a type-safe manner, inspecting the {@link ResultErrorKind} to
 * determine the cause of the error.
 *
 * ### Example
 * ```ts
 * const res = err<number, string>("failure");
 * try {
 *   res.unwrap();
 * } catch (e) {
 *   expect(e).toBeInstanceOf(ResultError);
 *   expect(e.kind).toBe(ResultErrorKind.UnwrapCalledOnErr);
 *   expect(e.message).toBe("`unwrap`: called on `Err`");
 * }
 * ```
 */
export class ResultError extends AnyError<ResultErrorKind> {}
