/* eslint-disable @typescript-eslint/no-unused-vars */
import { Either, left, right, cloneError, stringify } from "@ts-rust/shared";
import { AnyError } from "../error";
import { Clone } from "../types";
import type {
  Resultant,
  Result,
  Ok,
  Err,
  CheckedError,
  EitherError,
  ExpectedError,
  UnexpectedError,
} from "./interface";
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Enumerates error codes specific to {@link Result} operations.
 *
 * These codes categorize failures in {@link ResultError} instances thrown by methods
 * such as {@link Resultant.unwrap | unwrap} or {@link Resultant.expect | expect}
 * when the result’s state (e.g., {@link Ok} or {@link Err}) doesn’t match the
 * operation’s expectations.
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
  Unexpected = "Unexpected",
}

/**
 * An error class for {@link Result} operations, extending {@link AnyError} with
 * specific {@link ResultErrorKind} codes.
 *
 * This class represents failures tied to {@link Result} methods, such as accessing
 * a value from an {@link Err} or an error from an {@link Ok}. It provides a structured
 * way to handle such failures by embedding a {@link ResultErrorKind} and an optional
 * `reason` for additional context.
 *
 * ### Example
 * ```ts
 * const res = err<number, string>("failure");
 * try {
 *   res.unwrap();
 * } catch (e) {
 *   if (e instanceof ResultError) {
 *     console.log(e.kind); // "UnwrapCalledOnErr"
 *     console.log(e.message); // "[UnwrapCalledOnErr] `unwrap`: called on `Err`."
 *   }
 * }
 * ```
 */
export class ResultError
  extends AnyError<ResultErrorKind>
  implements Clone<ResultError>
{
  /**
   * Creates a deep clone of this {@link ResultError}, duplicating all properties
   * and ensuring no shared references.
   *
   * This method constructs a new {@link ResultError} instance with the same `kind`
   * and a cloned `reason`. Since `kind` is a {@link Primitive}, it is copied as-is,
   * while `reason` (an `Error`) is recreated with its `message` and, if available,
   * its `stack` or `cause`. The `message` and `name` are regenerated to match the
   * original formatting, and the `stack` trace is set to the new instance’s call
   * context (though it may be copied if supported).
   *
   * @returns A new {@link ResultError} instance with deeply cloned state.
   */
  clone(this: ResultError): ResultError {
    const c = new ResultError(this.message, this.kind, cloneError(this.reason));
    c.message = this.message;
    return c;
  }
}

/**
 * Creates a {@link CheckedError} representing an expected error of type `E`.
 *
 * Use this function to construct an error for anticipated failures, such as
 * validation errors or known conditions.
 *
 * @template E - The type of the expected error.
 * @param error - The expected error value to encapsulate.
 * @returns A {@link CheckedError} containing the expected error.
 */
export function expectedError<E>(error: E): CheckedError<E> {
  return CheckedFailure.expected(error);
}

/**
 * Creates a {@link CheckedError} representing an unexpected error.
 *
 * Use this function to construct an error for unforeseen failures, such as runtime
 * exceptions or unhandled conditions, using an existing {@link ResultError}.
 *
 * @template E - The type of a potential expected error (not used here).
 * @param error - The {@link ResultError} representing the unexpected failure.
 * @returns A {@link CheckedError} containing the unexpected error.
 */
export function unexpectedError<E>(error: ResultError): CheckedError<E>;
/**
 * Creates a {@link CheckedError} representing an unexpected {@link ResultError}
 * from arguments.
 *
 * Use this overload to construct an error for unforeseen failures by specifying a
 * message, {@link ResultErrorKind}, and optional reason.
 *
 * @template E - The type of a potential expected error (not used here).
 * @param message - A description of the unexpected failure.
 * @param kind - The {@link ResultErrorKind} categorizing the failure.
 * @param reason - An optional underlying cause of the failure.
 * @returns A {@link CheckedError} containing the unexpected error.
 */
export function unexpectedError<E>(
  message: string,
  kind: ResultErrorKind,
  reason?: unknown,
): CheckedError<E>;
export function unexpectedError<E>(
  error: ResultError | string,
  kind?: ResultErrorKind,
  reason?: unknown,
): CheckedError<E> {
  if (typeof error === "string") {
    const errorKind = kind ?? ResultErrorKind.Unexpected;
    return CheckedFailure.unexpectedFromArgs(error, errorKind, reason);
  }

  return CheckedFailure.unexpected(error);
}

/**
 * Checks if a value is a {@link CheckedError}, narrowing its type if true.
 *
 * @param e - The value to check.
 * @returns `true` if the value is a {@link CheckedError}, narrowing to
 *          `CheckedError<unknown>`.
 */
export function isCheckedError(e: unknown): e is CheckedError<unknown> {
  return e instanceof CheckedFailure;
}

/**
 * Internal implementation of {@link CheckedError}.
 *
 * This class encapsulates the error state of a {@link Result}, holding either an
 * expected error of type `E` or an unexpected {@link ResultError}. It is not
 * intended for direct use; prefer the {@link expectedError} and {@link unexpectedError}
 * factory functions.
 */
class CheckedFailure<E> extends Error implements EitherError<E> {
  static expected<E>(error: E): CheckedError<E> {
    return new CheckedFailure(right(error)) as CheckedError<E>;
  }

  static unexpected<E>(error: ResultError): CheckedError<E> {
    return new CheckedFailure(left(error)) as CheckedError<E>;
  }

  static unexpectedFromArgs<E>(
    error: string,
    kind: ResultErrorKind,
    reason?: unknown,
  ): CheckedError<E> {
    return new CheckedFailure(
      left(new ResultError(error, kind, reason)),
    ) as CheckedError<E>;
  }

  readonly #error: Either<ResultError, E>;

  get expected(): E | undefined {
    return this.#error.isRight() ? this.#error.right : undefined;
  }

  get unexpected(): ResultError | undefined {
    return this.#error.isLeft() ? this.#error.left : undefined;
  }

  private constructor(error: Either<ResultError, E>) {
    super(`${error.isRight() ? "Expected" : "Unexpected"} error occurred.`);

    this.name = this.constructor.name;
    this.#error = error;
  }

  get(): E | ResultError {
    return this.#error.get();
  }

  handle<T>(f: (e: ResultError) => T, g: (e: E) => T): T {
    return this.#error.either(f, g);
  }

  isExpected(): this is ExpectedError<E> {
    return this.#error.isRight();
  }

  isUnexpected(): this is UnexpectedError<E> {
    return this.#error.isLeft();
  }

  override toString(): string {
    return this.handle(
      (re) => stringify(re, true),
      (e) => stringify(e, true),
    );
  }
}
