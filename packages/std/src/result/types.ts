import { Result } from "./index";

export type OkValue<R, E = unknown> = R extends Result<infer U, E> ? U : never;
export type ErrValue<R, V = unknown> = R extends Result<V, infer E> ? E : never;
