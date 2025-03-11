import { AnyError } from "../error";

/**
 * Enumerates error codes specific to {@link Result} operations.
 *
 * These codes are used in {@link AnyError} instances thrown by methods like
 * {@link Result.unwrap} or {@link Result.expect} when operations fail due to
 * the state of the result.
 */
export enum ResultErrorKind {
  OkErrorAccessed = "OkErrorAccessed", // error accessed on Ok
  ErrValueAccessed = "ErrValueAccessed", // ok accessed on Err
  ErrExpected = "ErrExpected",
  ErrUnwrappedAsOk = "ErrUnwrappedAsOk",
  OkUnwrappedAsErr = "OkUnwrappedAsErr",
  PredicateException = "PredicateException",
}

export class ResultError extends AnyError<ResultErrorKind> {}
