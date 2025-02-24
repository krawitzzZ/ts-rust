export type Awaitable<T> =
  T extends Promise<infer R> ? Awaitable<R> : Promise<T>;

export type MaybePromise<T> = T | Promise<T>;
