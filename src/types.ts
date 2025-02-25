export type Awaitable<T> =
  T extends PromiseLike<infer R> ? Promise<R> : Promise<T>;

export type MaybePromise<T> = T | Promise<T>;
