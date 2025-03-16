/**
 * Represents the left variant of an {@link Either} type, holding a value of type `T`.
 *
 * This type signifies the "left" case of a disjoint union, typically used to represent an
 * error or alternative outcome. It provides access to the value via the
 * {@link IEither.get | get} method or {@link Left.left | left} property.
 */
export type Left<T, U> = IEither<T, U> & { get(): T; readonly left: T };

/**
 * Represents the right variant of an {@link Either} type, holding a value of type `T`.
 *
 * This type signifies the "right" case of a disjoint union, typically used to represent a
 * successful or primary outcome. It provides access to the value via the
 * {@link IEither.get | get} method or {@link Right.right | right} property.
 */
export type Right<T, U> = IEither<T, U> & { get(): U; readonly right: U };

/**
 * A type representing a disjoint union of two possible outcomes: a "left" value of type `T`
 * or a "right" value of type `U`.
 *
 * Inspired by Haskell’s
 * {@link https://hackage.haskell.org/package/base/docs/Data-Either.html | Either}, this type
 * is used to model computations that may produce one of two distinct results, such as an error
 * ({@link Left}) or a success ({@link Right}). It provides a type-safe alternative to
 * exceptions or null checks, with {@link IEither.isLeft | isLeft} and
 * {@link IEither.isRight | isRight} methods for type narrowing.
 *
 * ### Example
 * ```ts
 * const error: Either<string, number> = left("failed");
 * const success: Either<string, number> = right(42);
 *
 * if (error.isLeft()) {
 *   console.log(error.left); // "failed"
 * }
 * if (success.isRight()) {
 *   console.log(success.right); // 42
 * }
 * ```
 */
export type Either<T, U> = Left<T, U> | Right<T, U>;

/**
 * Creates an {@link Either} with a "left" value of type `T`.
 *
 * Use this function to construct a {@link Left} variant, typically representing an error or
 * alternative outcome.
 *
 * ### Example
 * ```ts
 * const e = left<string, number>("error");
 * expect(e.isLeft()).toBe(true);
 * expect(e.left).toBe("error");
 * ```
 */
export function left<T, U>(value: T): Either<T, U> {
  return new _Left(value);
}

/**
 * Creates an {@link Either} with a "right" value of type `U`.
 *
 * Use this function to construct a {@link Right} variant, typically representing a successful
 * or primary outcome.
 *
 * ### Example
 * ```ts
 * const e = right<string, number>(42);
 * expect(e.isRight()).toBe(true);
 * expect(e.right).toBe(42);
 * ```
 */
export function right<T, U>(value: U): Either<T, U> {
  return new _Right(value);
}

export type IEither<T, U> = {
  /**
   * Returns `true` if this is a {@link Left} variant, narrowing the type accordingly.
   */
  isLeft(): this is Left<T, U>;
  /**
   * Returns `false` if this is a {@link Left} variant, indicating it is not a {@link Right}.
   */
  isRight(): this is Right<T, U>;
  /**
   * Applies one of two functions to the contained value, depending on whether it is a
   * "left" or "right" variant, and returns the result.
   *
   * This method provides a way to handle both possible outcomes of an {@link Either} in a
   * single operation: if the value is a "left" of type `T`, it applies `f` to produce a
   * result of type `R`; if it is a "right" of type `U`, it applies `g` to produce a result
   * of type `R`. Inspired by Haskell’s `either` function, it eliminates the need for explicit
   * type checking with {@link IEither.isLeft | isLeft} or {@link IEither.isRight | isRight}.
   *
   * ### Example
   * ```ts
   * const err: Either<string, number> = left("error");
   * const val: Either<string, number> = right(42);
   *
   * const errResult = err.either(
   *   (msg) => `Failed with: ${msg}`,
   *   (num) => `Got: ${num}`
   * ); // "Failed with: error"
   *
   * const valResult = val.either(
   *   (msg) => `Failed with: ${msg}`,
   *   (num) => `Got: ${num}`
   * ); // "Got: 42"
   * ```
   */
  either<R>(f: (x: T) => R, g: (y: U) => R): R;
};

class _Left<T, U> implements Left<T, U> {
  readonly #value: T;

  get(): T {
    return this.#value;
  }

  get left(): T {
    return this.#value;
  }

  constructor(value: T) {
    this.#value = value;
  }

  isLeft(): this is Left<T, U> {
    return true;
  }

  isRight(): this is Right<T, U> {
    return false;
  }

  either<R>(f: (x: T) => R, _g: (y: U) => R): R {
    return f(this.left);
  }
}

class _Right<T, U> implements Right<T, U> {
  readonly #value: U;

  get(): U {
    return this.#value;
  }

  get right(): U {
    return this.#value;
  }

  constructor(value: U) {
    this.#value = value;
  }

  isLeft(): this is Left<T, U> {
    return false;
  }

  isRight(): this is Right<T, U> {
    return true;
  }

  either<R>(_f: (x: T) => R, g: (y: U) => R): R {
    return g(this.right);
  }
}
