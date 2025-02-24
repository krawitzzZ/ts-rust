import { IsResult, OkValue, Result } from "../result";
import { isPromise } from "../__internal";
import { Awaitable, MaybePromise } from "../types";
import { FlattenedPendingOption } from "./types";
import { none, Option, some } from "./index";

const _pendingOption_: unique symbol = Symbol("PendingOption");
type PendingOptionT = typeof _pendingOption_;

type IPendingOption<T> = {
  and<U>(x: MaybePromise<Option<U>>): PendingOption<U>;
  andThen<U>(f: (x: T) => MaybePromise<Option<U>>): PendingOption<U>;
  clone(): PendingOption<T>;
  filter(f: (x: T) => MaybePromise<boolean>): PendingOption<T>;
  flatten(): FlattenedPendingOption<T>;
  inspect(f: (x: T) => unknown): PendingOption<T>;
  map<U>(f: (x: T) => MaybePromise<U>): PendingOption<U>;
  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<U | F>;
  // TODO(nikita.demin): will be PendingResult
  okOr<E>(y: E): Promise<Result<T, E>>;
  // TODO(nikita.demin): will be PendingResult
  okOrElse<E>(mkErr: () => MaybePromise<E>): Promise<Result<T, E>>;
  or(x: MaybePromise<Option<T>>): PendingOption<T>;
  orElse(f: () => MaybePromise<Option<T>>): PendingOption<T>;
  replace(x: MaybePromise<T>): PendingOption<T>;
  take(): PendingOption<T>;
  takeIf(f: (x: T) => MaybePromise<boolean>): PendingOption<T>;
  toString(): string;
  // TODO(nikita.demin): will be PendingResult
  transposeResult<E>(
    this: PendingOption<IsResult<T, E>>,
  ): Promise<Result<PendingOption<OkValue<T, E>>, E>>;
  transposeAwaitable(
    this: PendingOption<Awaitable<T>>,
  ): PendingOption<Awaited<T>>;
  xor(y: MaybePromise<Option<T>>): PendingOption<T>;
};

export class PendingOption<T>
  implements IPendingOption<T>, PromiseLike<Option<T>>
{
  #promise: Promise<Option<T>>;

  protected readonly type: PendingOptionT = _pendingOption_;

  constructor(promise: Promise<Option<T>>) {
    this.#promise = promise;
  }

  then<R1 = Option<T>, R2 = never>(
    onfulfilled?: (value: Option<T>) => R1 | PromiseLike<R1>,
    onrejected?: (reason: unknown) => R2 | PromiseLike<R2>,
  ): PromiseLike<R1 | R2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  and<U>(x: MaybePromise<Option<U>>): PendingOption<U> {
    throw new Error("Method not implemented.");
  }

  andThen<U>(f: (x: T) => MaybePromise<Option<U>>): PendingOption<U> {
    throw new Error("Method not implemented.");
  }

  clone(): PendingOption<T> {
    return pendingOption(this.#promise.then((x) => x.clone()));
  }

  filter(f: (x: T) => MaybePromise<boolean>): PendingOption<T> {
    throw new Error("Method not implemented.");
  }

  flatten(): FlattenedPendingOption<T> {
    throw new Error("Method not implemented.");
  }

  inspect(f: (x: T) => unknown): PendingOption<T> {
    return pendingOption(
      this.#promise.then((option) => {
        option.inspect(f);
        return option.clone();
      }),
    );
  }

  map<U>(f: (x: T) => MaybePromise<U>): PendingOption<U> {
    throw new Error("Method not implemented.");
  }

  match<U, F = U>(f: (x: T) => U, g: () => F): Promise<U | F> {
    return this.#promise.then((option) => option.match(f, g));
  }

  okOr<E>(y: E): Promise<Result<T, E>> {
    throw new Error("Method not implemented.");
  }

  okOrElse<E>(mkErr: () => MaybePromise<E>): Promise<Result<T, E>> {
    throw new Error("Method not implemented.");
  }

  or(x: MaybePromise<Option<T>>): PendingOption<T> {
    throw new Error("Method not implemented.");
  }

  orElse(f: () => MaybePromise<Option<T>>): PendingOption<T> {
    throw new Error("Method not implemented.");
  }

  replace(x: MaybePromise<T>): PendingOption<T> {
    throw new Error("Method not implemented.");
  }

  take(): PendingOption<T> {
    throw new Error("Method not implemented.");
  }

  takeIf(f: (x: T) => MaybePromise<boolean>): PendingOption<T> {
    throw new Error("Method not implemented.");
  }

  toString(): string {
    return "PendingOption { promise }";
  }

  transposeResult<E>(
    this: PendingOption<IsResult<T, E>>,
  ): Promise<Result<PendingOption<OkValue<T, E>>, E>> {
    throw new Error("Method not implemented.");
  }

  transposeAwaitable(
    this: PendingOption<Awaitable<T>>,
  ): PendingOption<Awaited<T>> {
    return pendingOption(
      this.#promise.then(async (option) => {
        await Promise.resolve();
        if (option.isNone()) {
          return none<Awaited<T>>();
        }

        const value = await option.get();
        return some(value as Awaited<T>);
      }),
    );
  }

  xor(y: MaybePromise<Option<T>>): PendingOption<T> {
    throw new Error("Method not implemented.");
  }
}

export function pendingOption<T>(
  valueOrPromise: MaybePromise<Option<T>>,
): PendingOption<T> {
  const promise = isPromise(valueOrPromise)
    ? valueOrPromise
    : Promise.resolve(valueOrPromise);

  return new PendingOption(promise);
}
