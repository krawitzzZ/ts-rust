/**
 * Represents the left variant of an {@link Either} type, holding a value of type `T`.
 *
 * This type signifies the "left" case of a disjoint union, typically used to represent an
 * error or alternative outcome. It provides access to the value via the {@link Left.get | get}
 * or {@link Left.left | left} properties.
 */
export type Left<T> = {
  /**
   * Retrieves the contained value of type `T`.
   */
  readonly get: T;
  /**
   * Alias for {@link Left.get | get}, emphasizing the "left" nature of the value.
   */
  readonly left: T;
  /**
   * Returns `true` if this is a {@link Left} variant, narrowing the type accordingly.
   */
  isLeft(): this is { left: T };
  /**
   * Returns `false` if this is a {@link Left} variant, indicating it is not a {@link Right}.
   */
  isRight(): this is { right: T };
};

/**
 * Represents the right variant of an {@link Either} type, holding a value of type `T`.
 *
 * This type signifies the "right" case of a disjoint union, typically used to represent a
 * successful or primary outcome. It provides access to the value via the {@link Right.get | get}
 * or {@link Right.right | right} properties.
 */
export type Right<T> = {
  /**
   * Retrieves the contained value of type `T`.
   */
  readonly get: T;
  /**
   * Alias for {@link Right.get | get}, emphasizing the "right" nature of the value.
   */
  readonly right: T;
  /**
   * Returns `false` if this is a {@link Right} variant, indicating it is not a {@link Left}.
   */
  isLeft(): this is { left: T };
  /**
   * Returns `true` if this is a {@link Right} variant, narrowing the type accordingly.
   */
  isRight(): this is { right: T };
};

/**
 * A type representing a disjoint union of two possible outcomes: a "left" value of type `T`
 * or a "right" value of type `U`.
 *
 * Inspired by Haskell’s
 * {@link https://hackage.haskell.org/package/base/docs/Data-Either.html | Either}, this type
 * is used to model computations that may produce one of two distinct results, such as an error
 * ({@link Left}) or a success ({@link Right}). It provides a type-safe alternative to
 * exceptions or null checks, with {@link Left.isLeft | isLeft} and {@link Right.isRight | isRight}
 * methods for type narrowing.
 *
 * @template T - The type of the "left" value, often used for errors or alternatives.
 * @template U - The type of the "right" value, often used for successful outcomes.
 *
 * @example
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
export type Either<T, U> = Left<T> | Right<U>;

/**
 * Creates an {@link Either} with a "left" value of type `T`.
 *
 * Use this function to construct a {@link Left} variant, typically representing an error or
 * alternative outcome.
 *
 * @template T - The type of the "left" value.
 * @template U - The type of the potential "right" value (not used here).
 * @param value - The value to wrap in a {@link Left}.
 * @returns An {@link Either} containing a {@link Left} with the provided value.
 *
 * @example
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
 * @template T - The type of the potential "left" value (not used here).
 * @template U - The type of the "right" value.
 * @param value - The value to wrap in a {@link Right}.
 * @returns An {@link Either} containing a {@link Right} with the provided value.
 *
 * @example
 * ```ts
 * const e = right<string, number>(42);
 * expect(e.isRight()).toBe(true);
 * expect(e.right).toBe(42);
 * ```
 */
export function right<T, U>(value: U): Either<T, U> {
  return new _Right(value);
}

class _Left<T> implements Left<T> {
  readonly #value: T;

  get get(): T {
    return this.#value;
  }

  get left(): T {
    return this.#value;
  }

  constructor(value: T) {
    this.#value = value;
  }

  isLeft(): this is { left: T } {
    return true;
  }

  isRight(): this is { right: T } {
    return false;
  }
}

class _Right<T> implements Right<T> {
  readonly #value: T;

  get get(): T {
    return this.#value;
  }

  get right(): T {
    return this.#value;
  }

  constructor(value: T) {
    this.#value = value;
  }

  isLeft(): this is { left: T } {
    return false;
  }

  isRight(): this is { right: T } {
    return true;
  }
}
