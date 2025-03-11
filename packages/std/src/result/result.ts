import { stringify } from "@ts-rust/shared";
import { ResultError, ResultErrorKind } from "./error";
import { Err, ISafeResult, Ok, Result } from "./interface";

export function ok<E>(value: void): Result<void, E>;
export function ok<T, E>(value: T): Result<T, E>;
export function ok<T, E>(value: T): Result<T, E> {
  return SafeResult.ok(value);
}

export function err<T>(error: void): Result<T, void>;
export function err<T, E>(error: E): Result<T, E>;
export function err<T, E>(error: E): Result<T, E> {
  return SafeResult.error(error);
}

export function isResult(x: unknown): x is Result<unknown, unknown> {
  return x instanceof SafeResult;
}

type ResultState<T, E> = { type: "ok"; value: T } | { type: "error"; error: E };

const isOk = <T, E>(x: ResultState<T, E>): x is { type: "ok"; value: T } =>
  x.type === "ok";
const isErr = <T, E>(x: ResultState<T, E>): x is { type: "error"; error: E } =>
  x.type === "error";

// TODO(nikita.demin): Extract common (IResult part) into a base abstract class.
class SafeResult<T, E> implements ISafeResult<T, E> {
  /**
   * Creates {@link Ok} invariant of {@link Result} with provided value.
   */
  static ok<T, E>(value: T): Result<T, E> {
    return new SafeResult({ type: "ok", value });
  }

  /**
   * Creates {@link Err} invariant of {@link Result} with provided error.
   */
  static error<T, E>(error: E): Result<T, E> {
    return new SafeResult({ type: "error", error });
  }

  #state: ResultState<T, E>;

  get value(): T {
    if (isErr(this.#state)) {
      throw new ResultError(
        "`Result.value` - accessed on `Err`",
        ResultErrorKind.ErrValueAccessed,
      );
    }

    return this.#state.value;
  }

  get error(): E {
    if (isOk(this.#state)) {
      throw new ResultError(
        "`Result.error` - accessed on `Ok`",
        ResultErrorKind.OkErrorAccessed,
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

  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E | ResultError> {
    if (isErr(this.#state)) {
      return err(this.#state.error);
    }

    try {
      return f(this.#state.value);
    } catch (e) {
      return err(
        new ResultError(
          "`Result.andThen` - callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          e,
        ),
      );
    }
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

    throw new ResultError(
      msg ?? "`Result.expect` - called on `Err`",
      ResultErrorKind.ErrExpected,
    );
  }

  toString(): string {
    return isOk(this.#state)
      ? `Ok { ${stringify(this.#state.value, true)} }`
      : `Err { ${stringify(this.#state.error, true)} }`;
  }

  unwrap(): T {
    if (isErr(this.#state)) {
      throw new ResultError(
        "`Result.unwrap` - called on `Err`",
        ResultErrorKind.ErrUnwrappedAsOk,
      );
    }

    return this.#state.value;
  }

  unwrapErr(): E {
    if (isOk(this.#state)) {
      throw new ResultError(
        "`Result.unwrapErr` - called on `Ok`",
        ResultErrorKind.OkUnwrappedAsErr,
      );
    }

    return this.#state.error;
  }
}
