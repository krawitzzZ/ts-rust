import { stringify } from "../__internal";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AnyError, mkAnyError } from "../error";
import { IUnsafeResult } from "./index";

export type Result<T, E> = Ok<T, E> | Err<T, E>;

export type Ok<T, E> = IUnsafeResult<T, E> & { readonly value: T };

export type Err<T, E> = IUnsafeResult<T, E> & { readonly error: E };

export function ok<E>(value: void): Result<void, E>;
export function ok<T, E>(value: T): Result<T, E>;
export function ok<T, E>(value: T): Result<T, E> {
  return UnsafeResult.ok(value);
}

export function err<T>(error: void): Result<T, void>;
export function err<T, E>(error: E): Result<T, E>;
export function err<T, E>(error: E): Result<T, E> {
  return UnsafeResult.error(error);
}

/**
 * Checks if a value is a {@link Result | UnsafeResult}, narrowing its type
 * to `Result<unknown, unknown>`.
 *
 * This type guard determines whether the input is either {@link Ok} or {@link Err},
 * indicating it conforms to the {@link IUnsafeResult} interface.
 *
 * ### Example
 * ```ts
 * const x = ok<number, string>(42);
 * const y = err<number, string>("error");
 * const z = { value: 42 };
 *
 * expect(isResult(x)).toBe(true);
 * expect(isResult(y)).toBe(true);
 * expect(isResult(z)).toBe(false);
 *
 * if (isResult(x)) {
 *   expect(x.isOk()).toBe(true); // Type narrowed to Result<unknown, unknown>
 * }
 * ```
 */
export function isUnsafeResult(x: unknown): x is Result<unknown, unknown> {
  return x instanceof UnsafeResult;
}

/**
 * Enumerates error codes specific to {@link Result} operations.
 *
 * These codes are used in {@link AnyError} instances thrown by methods like
 * {@link Result.unwrap} or {@link Result.expect} when operations fail due to
 * the state of the result.
 */
export enum ResultError {
  OkErrorAccessed = "OkErrorAccessed", // error accessed on Ok
  ErrValueAccessed = "ErrValueAccessed", // ok accessed on Err
  ErrExpected = "ErrExpected",
  ErrUnwrapped = "ErrUnwrapped",
  PredicateException = "PredicateException",
}

type ResultState<T, E> = { type: "ok"; value: T } | { type: "error"; error: E };

const isOk = <T, E>(x: ResultState<T, E>): x is { type: "ok"; value: T } =>
  x.type === "ok";
const isErr = <T, E>(x: ResultState<T, E>): x is { type: "error"; error: E } =>
  x.type === "error";

// TODO(nikita.demin): Extract common (IResult part) into a base abstract class.
class UnsafeResult<T, E> implements IUnsafeResult<T, E> {
  /**
   * Creates {@link Ok} invariant of {@link Result | UnsafeResult} with provided value.
   */
  static ok<T, E>(value: T): Result<T, E> {
    return new UnsafeResult<T, E>({ type: "ok", value });
  }

  /**
   * Creates {@link Err} invariant of {@link Result | UnsafeResult} with provided error.
   */
  static error<T, E>(error: E): Result<T, E> {
    return new UnsafeResult<T, E>({ type: "error", error });
  }

  #state: ResultState<T, E>;

  get value(): T {
    if (isErr(this.#state)) {
      throw mkAnyError(
        "`value` is accessed on `Err`",
        ResultError.ErrValueAccessed,
      );
    }

    return this.#state.value;
  }

  get error(): E {
    if (isOk(this.#state)) {
      throw mkAnyError(
        "`error` is accessed on `Ok`",
        ResultError.OkErrorAccessed,
      );
    }

    return this.#state.error;
  }

  private constructor(state: ResultState<T, E>) {
    this.#state = state;
  }

  and<U>(x: Result<U, E>): Result<U, E> {
    return isOk(this.#state) ? x : err(this.#state.error);
  }

  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E> {
    if (isErr(this.#state)) {
      return err(this.#state.error);
    }

    return f(this.#state.value);
  }

  isOk(): this is Ok<T, E> {
    return isOk(this.#state);
  }

  isErr(): this is Err<T, E> {
    return isErr(this.#state);
  }

  expect(msg?: string): T {
    if (isOk(this.#state)) {
      return this.#state.value;
    }

    throw mkAnyError(
      msg ?? "`expect` is called on `Err`",
      ResultError.ErrExpected,
    );
  }

  toString(): string {
    return isOk(this.#state)
      ? `Ok { ${stringify(this.#state.value, true)} }`
      : `Err { ${stringify(this.#state.error, true)} }`;
  }
}
