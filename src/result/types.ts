import { Err } from "./err";
import { Ok } from "./ok";

export type Result<T, E = unknown> = Ok<T, E> | Err<T, E>;

export type OkValue<T, E> = T extends Result<infer R, E> ? R : never;

export type IsResult<T, E> =
  T extends Result<infer R, E> ? Result<R, E> : never;
