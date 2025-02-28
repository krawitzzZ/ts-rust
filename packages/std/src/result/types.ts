import { AnyError } from "../error";
import { Result, ResultErrorKind } from "./index";

// TODO(nikita.demin): implement
export type PendingResult<T, E> = Result<T, E>;

export type OkValue<R, E = unknown> = R extends Result<infer U, E> ? U : never;
export type ErrValue<R, V = unknown> = R extends Result<V, infer E> ? E : never;
export type AnyResultError = AnyError<ResultErrorKind>;
