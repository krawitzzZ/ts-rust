import { isPromise, stringify, toPromise } from "@ts-rust/shared";
import { Cloneable, MaybePromise } from "../types";
import { isPrimitive } from "../types.utils";
import { ResultError, ResultErrorKind } from "./error";
import {
  Err,
  Resultant,
  Ok,
  Result,
  PendingResult,
  PendingSettledResult,
  SettledResult,
} from "./interface";

export function ok<E>(value: void): Result<void, E>;
export function ok<T, E>(value: T): Result<T, E>;
export function ok<T, E>(value: T): Result<T, E> {
  return _Result.ok(value);
}

export function err<T>(error: void): Result<T, void>;
export function err<T, E>(error: E): Result<T, E>;
export function err<T, E>(error: E): Result<T, E> {
  return _Result.error(error);
}

/**
 * Creates a {@link PendingResult | PendingResult\<T, E>} from a
 * {@link Result | Result\<T, E>}, a {@link Promise | Promise\<Result<T, E>>}
 * or from a factory function that returns either {@link Result | Result\<T, E>}
 * or {@link Promise | Promise\<Result<T, E>>}.
 */
export function pendingResult<T, E>(
  resultOrFactory:
    | Result<T, E>
    | Promise<Result<T, E>>
    | (() => Result<T, E> | Promise<Result<T, E>>),
): PendingResult<T, E> {
  if (typeof resultOrFactory === "function") {
    return pendingResult(resultOrFactory());
  }

  return _PendingResult.create(resultOrFactory);
}

export function isPendingResult(
  x: unknown,
): x is PendingResult<unknown, unknown> {
  return x instanceof _PendingResult;
}

export function isResult(x: unknown): x is Result<unknown, unknown> {
  return x instanceof _Result;
}

type ResultState<T, E> = { type: "ok"; value: T } | { type: "error"; error: E };

const isOk = <T, E>(x: ResultState<T, E>): x is { type: "ok"; value: T } =>
  x.type === "ok";

const isErr = <T, E>(x: ResultState<T, E>): x is { type: "error"; error: E } =>
  x.type === "error";

const settleResult = async <T, E>(
  resultOrPromise: Result<T, E> | PromiseLike<Result<T, E>>,
): Promise<SettledResult<T, E>> =>
  toPromise(resultOrPromise).then(async (r) =>
    r.isOk() ? ok(await r.value) : err(await r.error),
  );

const _settleOk = async <T, E>(
  resultOrPromise: Result<T, E> | PromiseLike<Result<T, E>>,
): Promise<Result<Awaited<T>, E>> =>
  toPromise(resultOrPromise).then(async (r) =>
    r.isOk() ? ok(await r.value) : err(r.error),
  );

const _settleErr = async <T, E>(
  resultOrPromise: Result<T, E> | PromiseLike<Result<T, E>>,
): Promise<Result<T, Awaited<E>>> =>
  toPromise(resultOrPromise).then(async (r) =>
    r.isOk() ? ok(r.value) : err(await r.error),
  );

class _Result<T, E> implements Resultant<T, E> {
  /**
   * Creates {@link Ok} invariant of {@link Result} with provided value.
   */
  static ok<T, E>(value: T): Result<T, E> {
    return new _Result({ type: "ok", value });
  }

  /**
   * Creates {@link Err} invariant of {@link Result} with provided error.
   */
  static error<T, E>(error: E): Result<T, E> {
    return new _Result({ type: "error", error });
  }

  #state: ResultState<T, E>;

  get value(): T {
    if (isErr(this.#state)) {
      throw new ResultError(
        "`Result.value` - accessed on `Err`",
        ResultErrorKind.ValueAccessedOnErr,
      );
    }

    return this.#state.value;
  }

  get error(): E {
    if (isOk(this.#state)) {
      throw new ResultError(
        "`Result.error` - accessed on `Ok`",
        ResultErrorKind.ErrorAccessedOnOk,
      );
    }

    return this.#state.error;
  }

  private constructor(state: ResultState<T, E>) {
    this.#state = state;
  }

  and<U>(x: Result<U, E>): Result<U, E>;
  and<U>(x: Promise<Result<U, E>>): PendingSettledResult<U, E>;
  and<U>(
    x: MaybePromise<Result<U, E>>,
  ): Result<U, E> | PendingSettledResult<U, E> {
    if (isPromise(x)) {
      return pendingResult(async () => (await _settleOk(this.copy())).and(x));
    }

    return isOk(this.#state) ? x.copy() : err(this.#state.error);
  }

  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E | ResultError>;
  andThen<U>(f: (x: T) => Result<U, E>, h: (e: unknown) => E): Result<U, E>;
  andThen<U>(
    f: (x: T) => Result<U, E>,
    h?: (e: unknown) => E,
  ): Result<U, E | ResultError> | Result<U, E> {
    if (isErr(this.#state)) {
      return err(this.#state.error);
    }

    try {
      return f(this.#state.value);
    } catch (e) {
      const error = h
        ? h(e)
        : new ResultError(
            "`Result.andThen` - callback `f` threw an exception",
            ResultErrorKind.PredicateException,
            e,
          );
      return err(error);
    }
  }

  andThenUnchecked<U>(f: (x: T) => Result<U, E>): Result<U, E> {
    return isOk(this.#state) ? f(this.#state.value) : err(this.#state.error);
  }

  clone<U, F>(this: Result<Cloneable<U>, Cloneable<F>>): Result<U, F> {
    if (this.isOk()) {
      return ok(isPrimitive(this.value) ? this.value : this.value.clone());
    }

    return err(isPrimitive(this.error) ? this.error : this.error.clone());
  }

  copy(): Result<T, E> {
    return isOk(this.#state) ? ok(this.#state.value) : err(this.#state.error);
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
      ResultErrorKind.ExpectCalledOnErr,
    );
  }

  toPending(): PendingSettledResult<T, E> {
    return pendingResult(settleResult(this.copy()));
  }

  toPendingCloned(
    this: Result<Cloneable<T>, Cloneable<E>>,
  ): PendingSettledResult<T, E> {
    return pendingResult(settleResult(this.clone()));
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
        ResultErrorKind.UnwrapCalledOnErr,
      );
    }

    return this.#state.value;
  }

  unwrapErr(): E {
    if (isOk(this.#state)) {
      throw new ResultError(
        "`Result.unwrapErr` - called on `Ok`",
        ResultErrorKind.UnwrapErrCalledOnOk,
      );
    }

    return this.#state.error;
  }
}

class _PendingResult<T, E> implements PendingResult<T, E> {
  static create<T, E>(
    result: Result<T, E> | PromiseLike<Result<T, E>>,
  ): PendingResult<T, E> {
    return new _PendingResult(result);
  }

  #promise: Promise<Result<T, E>>;

  private constructor(result: Result<T, E> | PromiseLike<Result<T, E>>) {
    this.#promise = toPromise(result);
  }

  // Implements the PromiseLike interface, allowing PendingResult to be used
  // with `await` and `then`.
  then<R1 = Result<T, E>, R2 = never>(
    onfulfilled?: ((value: Result<T, E>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  catch<R = never>(
    onrejected?: (reason: unknown) => R | PromiseLike<R>,
  ): Promise<Result<T, E> | R> {
    return this.#promise.catch(onrejected);
  }

  and<U>(x: MaybePromise<Result<U, E>>): PendingSettledResult<U, E> {
    return pendingResult(
      this.#promise.then(async (result) => {
        const r = result.and(await x);
        return r.isOk() ? ok(await r.value) : err(await r.error);
      }),
    );
  }
}
