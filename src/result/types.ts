import { Err } from "./err";
import { Ok } from "./ok";

export type Result<T, E = unknown> = Ok<T, E> | Err<T, E>;

// TODO(nikita.demin): implement
export type PendingResult<T, E> = Result<T, E>;

export type OkValue<R, E = unknown> = R extends Result<infer U, E> ? U : never;
export type ErrValue<R, V = unknown> = R extends Result<V, infer E> ? E : never;
