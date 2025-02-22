import { None, Some } from "./index";

export type Option<T> = Some<T> | None;

export type InferOptionValue<T> =
  T extends Option<infer R> ? InferOptionValue<R> : T;

export type NonNestedOption<T> = T extends Option<infer _R> ? never : Option<T>;

export type FlattenedOption<T> = T extends None
  ? T
  : T extends Some<infer R>
    ? Option<R>
    : Option<T>;
