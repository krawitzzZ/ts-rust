/**
 * Ensures that type `T` is **not** a {@link PromiseLike}.
 *
 * This helper type excludes promise-like types (those with a `then` method) from
 * being assigned to `T`. If `T` is a {@link PromiseLike}, it resolves to `never`.
 * Used to enforce synchronous values.
 *
 * Resolves to `never` by default.
 */
export type Sync<T = never> = T extends PromiseLike<infer _> ? never : T;

/**
 * Ensures that type `T` **is** a {@link PromiseLike}.
 *
 * This helper type restricts `T` to promise-like types (those with a `then` method).
 * If `T` is not a {@link PromiseLike}, it resolves to `never`. Used to define
 * asynchronous values.
 *
 * Resolves to `never` by default.
 */
export type Async<T = unknown> = [T] extends [PromiseLike<infer R>]
  ? PromiseLike<Awaited<R>>
  : never;
