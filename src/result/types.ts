import { Err } from "./err";
import { Ok } from "./ok";

export type Result<T, E = unknown> = Ok<T, E> | Err<T, E>;

// TODO(nikita.demin): implement
export type PendingResult<T, E> = Result<T, E>;

export type OkValue<T, E = unknown> = T extends Result<infer R, E> ? R : never;
export type ErrValue<T, V = unknown> = T extends Result<V, infer R> ? R : never;

export type IsResult<T, E> =
  T extends Result<infer R, E> ? Result<R, E> : never;
