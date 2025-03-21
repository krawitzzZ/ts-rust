/* eslint-disable @typescript-eslint/no-unused-vars */
import { isPromise, stringify, toPromise } from "@ts-rust/shared";
import type { Cloneable, MaybePromise } from "../types";
import {
  type PendingOption,
  type Option,
  none,
  pendingOption,
  pendingSome,
  some,
} from "../option";
import { isPrimitive } from "../types.utils";
import {
  ResultError,
  ResultErrorKind,
  isCheckedError,
  expectedError,
  unexpectedError,
} from "./error";
import type {
  ExpectedError,
  CheckedError,
  PendingResult,
  SettledResult,
  Resultant,
  Result,
  Err,
  Ok,
} from "./interface";
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Creates an {@link Ok} variant of a {@link Result} with a `void` value.
 *
 * Wraps `undefined` in an {@link Ok}, indicating a successful outcome with
 * no value (`void`) for a checked {@link Result}.
 *
 * @template E - The type of the potential error.
 * @param value - The `void` value (typically omitted or `undefined`).
 * @returns A {@link Result} containing `undefined` as {@link Ok}.
 *
 * ### Example
 * ```ts
 * const x = ok<string>();
 *
 * expect(x.isOk()).toBe(true);
 * expect(x.unwrap()).toBeUndefined();
 * ```
 */
export function ok<E>(value: void): Result<void, E>;
/**
 * Creates an {@link Ok} variant of a {@link Result} containing the given value.
 *
 * Wraps the provided value in an {@link Ok}, indicating a successful outcome
 * for a checked {@link Result}.
 *
 * @template T - The type of the value.
 * @template E - The type of the potential error.
 * @param value - The value to wrap in {@link Ok}.
 * @returns A {@link Result} containing the value as {@link Ok}.
 *
 * ### Example
 * ```ts
 * const x = ok<number, string>(42);
 *
 * expect(x.isOk()).toBe(true);
 * expect(x.unwrap()).toBe(42);
 * ```
 */
export function ok<T, E>(value: T): Result<T, E>;
export function ok<T, E>(value: T): Result<T, E> {
  return _Result.ok(value);
}

/**
 * Creates an {@link Err} variant of a {@link Result} with a `void` error.
 *
 * Wraps `undefined` in a {@link CheckedError} within an {@link Err},
 * indicating a failed outcome with no error value for a checked {@link Result}.
 *
 * @template T - The type of the potential value.
 * @param error - The `void` error (typically omitted or `undefined`).
 * @returns A {@link Result} containing `undefined` as {@link Err}.
 *
 * ### Example
 * ```ts
 * const x = err<number>();
 *
 * expect(x.isErr()).toBe(true);
 * expect(x.unwrapErr().expected).toBeUndefined();
 * expect(x.unwrapErr().unexpected).toBeUndefined();
 * ```
 */
export function err<T>(error: void): Result<T, void>;
/**
 * Creates an {@link Err} variant of a {@link Result} containing the given error.
 *
 * Wraps the provided error in a {@link CheckedError} within an {@link Err},
 * indicating a failed outcome for a checked {@link Result}. This function accepts
 * raw errors, {@link ResultError}, or {@link CheckedError}.
 *
 * - If called with an error of type `E`, it creates an {@link ExpectedError} variant.
 * - If called with a {@link CheckedError}, it uses the error as is.
 *
 * @template T - The type of the potential value.
 * @template E - The type of the expected error.
 * @param error - The error to wrap in {@link Err}, as a raw `E`, {@link ResultError}, or {@link CheckedError}.
 * @returns A {@link Result} containing the error as {@link Err}.
 *
 * ### Example
 * ```ts
 * const oops = new ResultError("err", ResultErrorKind.Unexpected);
 * const x = err<number, string>("failure");
 * const y = err<number, string>(oops);
 *
 * expect(x.isErr()).toBe(true);
 * expect(x.unwrapErr().expected).toBe("failure");
 * expect(y.unwrapErr().unexpected).toBe(oops);
 * ```
 */
export function err<T, E>(error: E | CheckedError<E>): Result<T, E>;
export function err<T, E>(error: E | CheckedError<E>): Result<T, E> {
  return _Result.error(error);
}

/**
 * Creates a {@link PendingResult | PendingResult\<T, E>} that resolves to
 * {@link Ok} containing the awaited value.
 *
 * Takes a value or promise and wraps its resolved result in an {@link Ok},
 * ensuring the value type is `Awaited` to handle any `PromiseLike` input.
 *
 * @template T - The type of the input value or promise.
 * @template E - The type of the potential error.
 * @param value - The value or promise to wrap in {@link Ok}.
 * @returns A {@link PendingResult} resolving to {@link Ok} with the awaited value.
 *
 * ### Example
 * ```ts
 * const x = pendingOk<number, string>(42);
 * const y = pendingOk<string, number>(Promise.resolve("hello"));
 *
 * expect(await x).toStrictEqual(ok(42));
 * expect(await y).toStrictEqual(ok("hello"));
 * ```
 */
export function pendingOk<T, E>(
  value: T | Promise<T>,
): PendingResult<Awaited<T>, Awaited<E>> {
  return _PendingResult.create(toPromise(value).then((x) => ok(x)));
}

/**
 * Creates a {@link PendingResult | PendingResult\<T, E>} that resolves to
 * {@link Err} containing the awaited error.
 *
 * Takes an error or promise and wraps its resolved result in an {@link Err},
 * ensuring the error type is `Awaited` to handle any `PromiseLike` input.
 *
 * @template T - The type of the potential value.
 * @template E - The type of the input error or promise.
 * @param error - The error or promise to wrap in {@link Err}.
 * @returns A {@link PendingResult} resolving to {@link Err} with the awaited error.
 *
 * ### Example
 * ```ts
 * const x = pendingErr<number, string>("failure");
 * const y = pendingErr<string, number>(Promise.resolve(42));
 *
 * expect(await x).toStrictEqual(err("failure"));
 * expect(await y).toStrictEqual(err(42));
 * ```
 */
export function pendingErr<T, E>(
  error: E | CheckedError<E> | Promise<E> | Promise<CheckedError<E>>,
): PendingResult<Awaited<T>, Awaited<E>> {
  return _PendingResult.create(
    settleResult(toPromise(error).then((e) => err(e))),
  );
}

/**
 * Creates a {@link PendingResult | PendingResult\<T, E>} from a result,
 * promise, or factory function.
 *
 * Accepts a {@link Result}, a `Promise` resolving to a {@link Result}, or
 * a function returning either, and converts it into a pending result, handling
 * asynchronous resolution as needed.
 *
 * @template T - The type of the value in the result.
 * @template E - The type of the expected error in the result.
 * @param resultOrFactory - The {@link Result}, promise, or factory function producing a {@link Result}.
 * @returns A {@link PendingResult} resolving to the provided or produced result.
 *
 * ### Example
 * ```ts
 * const x = pendingResult(ok<number, string>(42));
 * const y = pendingResult(() => Promise.resolve(err<string, number>(42)));
 * const z = pendingResult(async () => err<string, boolean>(true));
 *
 * expect(await x).toStrictEqual(ok(42));
 * expect(await y).toStrictEqual(err(42));
 * expect(await z).toStrictEqual(err(true));
 * ```
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

/**
 * Checks if a value is a {@link Result}, narrowing its type to
 * `Result<unknown, unknown>`.
 *
 * This type guard verifies whether the input conforms to the {@link Result}
 * interface, indicating it is either an {@link Ok} or {@link Err}.
 *
 * @param x - The value to check.
 * @returns `true` if the value is a {@link Result}, narrowing to `Result<unknown, unknown>`.
 *
 * ### Example
 * ```ts
 * const x = ok<number, string>(42);
 * const y = err<number, string>("failure");
 * const z = "not a result";
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
export function isResult(x: unknown): x is Result<unknown, unknown> {
  return x instanceof _Result;
}

/**
 * Checks if a value is a {@link PendingResult}, narrowing its type to
 * `PendingResult<unknown, unknown>`.
 *
 * This type guard verifies whether the input is a {@link PendingResult},
 * indicating it wraps a `Promise` resolving to a {@link Result}
 * (either {@link Ok} or {@link Err}).
 *
 * @param x - The value to check.
 * @returns `true` if the value is a {@link PendingResult}, narrowing to `PendingResult<unknown, unknown>`.
 *
 * ### Example
 * ```ts
 * const x = pendingResult(ok<number, string>(42));
 * const y = pendingResult(err<number, string>("failure"));
 * const z = ok(42); // Not a PendingResult
 *
 * expect(isPendingResult(x)).toBe(true);
 * expect(isPendingResult(y)).toBe(true);
 * expect(isPendingResult(z)).toBe(false);
 *
 * if (isPendingResult(x)) {
 *   // Type narrowed to PendingResult<unknown, unknown>
 *   expect(await x).toStrictEqual(ok(42));
 * }
 * ```
 */
export function isPendingResult(
  x: unknown,
): x is PendingResult<unknown, unknown> {
  return x instanceof _PendingResult;
}

/**
 * Internal implementation class for {@link Result}.
 *
 * Class that represents a result of an operation that might fail.
 */
class _Result<T, E> implements Resultant<T, E> {
  /**
   * Creates {@link Ok} invariant of {@link Result} with provided value.
   */
  static ok<T, E>(value: T): Result<T, E> {
    return new _Result<T, E>({ type: "ok", value });
  }

  /**
   * Creates {@link Err} invariant of {@link Result} with provided error.
   */
  static error<T, E>(error: E | CheckedError<E>): Result<T, E> {
    if (isCheckedError(error)) {
      return new _Result({ type: "error", error });
    }

    return new _Result({ type: "error", error: expectedError(error) });
  }

  /**
   * Private field holding the raw state of the {@link Result}.
   *
   * Stores a {@link State} object containing either a `value` of type `T` for {@link Ok}
   * instances or an `error` of type {@link CheckedError}<E> for {@link Err} instances.
   * This field is managed internally to ensure type safety and encapsulation, and should
   * only be accessed directly within the class’s methods.
   *
   * ### IMPORTANT
   * **This property shall only be used within this class’s methods and constructor.**
   */
  #state: State<T, E>;

  /**
   * Property that provides access to the value of the {@link Result}.
   *
   * Only {@link Ok} instances have a value, so accessing this property on {@link Err}
   * will throw a {@link ResultError}.
   *
   * ## Throws
   * - {@link ResultError} if `value` is accessed on {@link Err}, with
   *   {@link ResultErrorKind.ValueAccessedOnErr}.
   */
  get value(): T {
    if (isErr(this.#state)) {
      throw new ResultError(
        "`value`: accessed on `Err`",
        ResultErrorKind.ValueAccessedOnErr,
      );
    }

    return this.#state.value;
  }

  /**
   * Property that provides access to the error of the {@link Result}.
   *
   * Only {@link Err} instances have an error, so accessing this property on {@link Ok}
   * will throw a {@link ResultError}.
   *
   * ## Throws
   * - {@link ResultError} if `error` is accessed on {@link Ok}, with
   *   {@link ResultErrorKind.ErrorAccessedOnOk}.
   */
  get error(): CheckedError<E> {
    if (isOk(this.#state)) {
      throw new ResultError(
        "`error`: accessed on `Ok`",
        ResultErrorKind.ErrorAccessedOnOk,
      );
    }

    return this.#state.error;
  }

  private constructor(state: State<T, E>) {
    this.#state = state;
  }

  and<U>(x: Result<U, E>): Result<U, E> {
    return isOk(this.#state) ? x.copy() : err(this.#state.error);
  }

  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E> {
    if (isErr(this.#state)) {
      return err(this.#state.error);
    }

    try {
      return f(this.#state.value);
    } catch (e) {
      return err(
        unexpectedError<E>(
          "`andThen`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          e,
        ),
      );
    }
  }

  check(
    this: SettledResult<T, E>,
  ): this extends Ok<T, E>
    ? readonly [true, T]
    : readonly [false, CheckedError<E>];
  check(): readonly [boolean, T | CheckedError<E>] {
    return isErr(this.#state)
      ? [false, this.#state.error]
      : [true, this.#state.value];
  }

  clone<U, F>(this: Result<Cloneable<U>, Cloneable<F>>): Result<U, F> {
    if (this.isOk()) {
      return ok(isPrimitive(this.value) ? this.value : this.value.clone());
    }

    if (this.error.isExpected()) {
      return err(
        isPrimitive(this.error.expected)
          ? this.error.expected
          : this.error.expected.clone(),
      );
    }

    return err<U, F>(unexpectedError(this.error.unexpected.clone()));
  }

  copy(): Result<T, E> {
    return isOk(this.#state) ? ok(this.#state.value) : err(this.#state.error);
  }

  err(this: SettledResult<T, E>): Option<E> {
    if (this.isOk()) {
      return none();
    }

    return this.error.handle(
      () => none(),
      (e) => some<E>(e),
    );
  }

  expect(this: SettledResult<T, E>, msg?: string): T;
  expect(msg?: string): T {
    if (isOk(this.#state)) {
      return this.#state.value;
    }

    throw new ResultError(
      msg ?? "`expect`: called on `Err`",
      ResultErrorKind.ExpectCalledOnErr,
    );
  }

  expectErr(this: SettledResult<T, E>, msg?: string): CheckedError<E>;
  expectErr(msg?: string): CheckedError<E> {
    if (isErr(this.#state)) {
      return this.#state.error;
    }

    throw new ResultError(
      msg ?? "`expectErr`: called on `Ok`",
      ResultErrorKind.ExpectErrCalledOnOk,
    );
  }

  flatten<U, F>(this: Result<Result<U, F>, F>): Result<U, F> {
    if (this.isErr()) {
      return err(this.error);
    }

    if (!isResult(this.value)) {
      return err<U, F>(
        unexpectedError(
          "`flatten`: called on `Ok` with non-result value",
          ResultErrorKind.FlattenCalledOnFlatResult,
        ),
      );
    }

    return this.value.copy();
  }

  inspect(f: (x: T) => unknown): Result<T, E> {
    if (isOk(this.#state)) {
      try {
        const inspection = f(this.#state.value);

        if (isPromise(inspection)) {
          inspection.catch(() => void 0);
        }
      } catch {
        // do not care about the error
      }
    }

    return this.copy();
  }

  isErr(): this is Err<T, E> {
    return isErr(this.#state);
  }

  isOk(): this is Ok<T, E> {
    return isOk(this.#state);
  }

  match<U, F = U>(
    this: SettledResult<T, E>,
    f: (x: T) => Awaited<U>,
    g: (e: CheckedError<E>) => Awaited<F>,
  ): U | F {
    try {
      return this.isOk() ? f(this.value) : g(this.error);
    } catch (e) {
      throw new ResultError(
        "`match`: one of the predicates threw an exception",
        ResultErrorKind.PredicateException,
        e,
      );
    }
  }

  toPending(): PendingSettledRes<T, E> {
    return pendingResult(settleResult(this.copy()));
  }

  toPendingCloned(
    this: Result<Cloneable<T>, Cloneable<E>>,
  ): PendingSettledRes<T, E> {
    return pendingResult(settleResult(this.clone()));
  }

  toString(): string {
    return isOk(this.#state)
      ? `Ok { ${stringify(this.#state.value, true)} }`
      : `Err { ${stringify(this.#state.error, true)} }`;
  }

  try(
    this: SettledResult<T, E>,
  ): this extends Ok<T, E>
    ? readonly [true, undefined, T]
    : readonly [false, CheckedError<E>, undefined];
  try(): readonly [boolean, CheckedError<E> | undefined, T | undefined] {
    return isOk(this.#state)
      ? [true, undefined, this.#state.value]
      : [false, this.#state.error, undefined];
  }

  unwrap(this: SettledResult<T, E>): T;
  unwrap(): T {
    if (isErr(this.#state)) {
      throw new ResultError(
        "`unwrap`: called on `Err`",
        ResultErrorKind.UnwrapCalledOnErr,
      );
    }

    return this.#state.value;
  }

  unwrapErr(this: SettledResult<T, E>): CheckedError<E>;
  unwrapErr(): CheckedError<E> {
    if (isOk(this.#state)) {
      throw new ResultError(
        "`unwrapErr`: called on `Ok`",
        ResultErrorKind.UnwrapErrCalledOnOk,
      );
    }

    return this.#state.error;
  }
}

/**
 * Represents a {@link Result} in a pending state that will be resolved in the future.
 *
 * Internally, it wraps a `Promise` that resolves to a {@link Result} on success
 * or to its {@link Err} variant on failure. Methods mirror those of {@link Result},
 * adapted for asynchronous resolution.
 */
class _PendingResult<T, E> implements PendingResult<T, E> {
  static create<T, E>(
    result: Result<T, E> | PromiseLike<Result<T, E>>,
  ): PendingResult<T, E> {
    return new _PendingResult(result);
  }

  #promise: Promise<Result<T, E>>;

  private constructor(result: Result<T, E> | PromiseLike<Result<T, E>>) {
    this.#promise = toSafePromise(result, defaultCatchMessage);
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

  and<U>(x: MaybePromise<Result<U, E>>): PendingSettledRes<U, E> {
    return pendingResult(
      this.#promise.then((self) => {
        if (self.isErr()) {
          return settleResult(err(self.error));
        }

        return settleResult(
          toSafePromise(x, "`and`: provided result `x` rejected"),
        );
      }),
    );
  }

  andThen<U>(
    f: (x: T) => Result<U, E> | Promise<Result<U, E>>,
  ): PendingSettledRes<U, E> {
    return pendingResult(
      this.#promise.then((self) => {
        if (self.isErr()) {
          return settleResult(err(self.error));
        }

        try {
          return settleResult(
            toSafePromise(
              f(self.value),
              "`andThen`: promise returned by provided callback `f` rejected",
            ),
          );
        } catch (e) {
          return err<Awaited<U>, Awaited<E>>(
            unexpectedError(
              "`andThen`: callback `f` threw an exception",
              ResultErrorKind.PredicateException,
              e,
            ),
          );
        }
      }),
    );
  }

  check(): Promise<readonly [boolean, CheckedError<Awaited<E>> | Awaited<T>]> {
    return settleResult(this.#promise).then((self) =>
      self.isOk() ? [true, self.value] : [false, self.error],
    );
  }

  err(): PendingOption<Awaited<E>> {
    return pendingOption(
      this.#promise.then((self) => {
        if (self.isOk() || !self.error.expected) {
          return none();
        }

        return pendingSome(self.error.expected);
      }),
    );
  }

  flatten<U, F>(
    this:
      | PendingResult<Result<U, F>, F>
      | PendingResult<PendingResult<U, F>, F>
      | PendingResult<PromiseLike<Result<U, F>>, F>,
  ): PendingSettledRes<U, F> {
    const promise: PromiseLike<Result<U, F>> = this.then((outer) => {
      if (!outer.isOk()) {
        return err(outer.error);
      }

      if (!isResult(outer.value)) {
        return err<U, F>(
          unexpectedError(
            "`flatten`: called on `Ok` with non-result value",
            ResultErrorKind.FlattenCalledOnFlatResult,
          ),
        );
      }

      return outer.value.copy();
    });

    return pendingResult(settleResult(promise));
  }

  inspect(f: (x: T) => unknown): PendingResult<T, E> {
    return pendingResult(this.#promise.then((self) => self.inspect(f)));
  }

  match<U, F = U>(
    f: (x: T) => U,
    g: (e: CheckedError<E>) => F,
  ): Promise<Awaited<U> | Awaited<F>> {
    return this.#promise.then((self) =>
      toPromise(self.isOk() ? f(self.value) : g(self.error)),
    );
  }

  try(): Promise<
    readonly [
      boolean,
      CheckedError<Awaited<E>> | undefined,
      Awaited<T> | undefined,
    ]
  > {
    return settleResult(this.#promise).then((self) =>
      self.isOk()
        ? [true, undefined, self.value]
        : [false, self.error, undefined],
    );
  }
}

type State<T, E> =
  | { readonly type: "ok"; value: T }
  | { readonly type: "error"; error: CheckedError<E> };

type PendingSettledRes<T, E> = PendingResult<Awaited<T>, Awaited<E>>;

const isOk = <T, E>(x: State<T, E>): x is { readonly type: "ok"; value: T } =>
  x.type === "ok";

const isErr = <T, E>(
  x: State<T, E>,
): x is { readonly type: "error"; error: CheckedError<E> } =>
  x.type === "error";

const defaultCatchMessage = "Pending result rejected unexpectedly";

const toSafePromise = <T, E>(
  result: MaybePromise<Result<T, E>> | PromiseLike<Result<T, E>>,
  errorMessage: string,
): Promise<Result<T, E>> =>
  toPromise(result).catch(catchUnexpected<T, E>(errorMessage));

const catchUnexpected =
  <T, E>(msg: string) =>
  (e: unknown): SettledResult<T, E> =>
    err<Awaited<T>, Awaited<E>>(
      unexpectedError<Awaited<E>>(msg, ResultErrorKind.ResultRejection, e),
    );

const settleResult = <T, E>(
  resultOrPromise: MaybePromise<Result<T, E>> | PromiseLike<Result<T, E>>,
): Promise<SettledResult<T, E>> =>
  toSafePromise(resultOrPromise, defaultCatchMessage).then((r) =>
    r.isOk() ? awaitOk(r.value) : awaitErr(r.error),
  );

// const settleOk = <T, E>(
//   resultOrPromise: MaybePromise<Result<T, E>>,
// ): Promise<Result<Awaited<T>, E>> =>
//   toSafePromise(resultOrPromise, defaultCatchMessage).then((r) =>
//     r.isErr() ? err(r.error) : awaitOk(r.value),
//   );

// const settleErr = <T, E>(
//   resultOrPromise: MaybePromise<Result<T, E>>,
// ): Promise<Result<T, Awaited<E>>> =>
//   toSafePromise(resultOrPromise, defaultCatchMessage).then((r) =>
//     r.isOk() ? ok(r.value) : awaitErr(r.error),
//   );

const awaitOk = <T, E>(
  v: T,
  errMsg = "PendingResult's `Ok` value rejected unexpectedly",
): Promise<Result<Awaited<T>, E>> =>
  toPromise(v).then((x) => ok<Awaited<T>, E>(x), catchUnexpected<T, E>(errMsg));

const awaitErr = <T, E>(
  error: CheckedError<E>,
  errMsg = "PendingResult's expected `Err` rejected unexpectedly",
): MaybePromise<Result<T, Awaited<E>>> => {
  if (error.isUnexpected()) {
    return err<T, Awaited<E>>(unexpectedError(error.unexpected));
  }

  return toPromise(error.expected).then(
    (e) => err<T, Awaited<E>>(e),
    catchUnexpected<T, Awaited<E>>(errMsg),
  );
};
