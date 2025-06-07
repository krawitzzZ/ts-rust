import { Result } from "./index";

// TODO(nikita.demin): also check pending result in infer
export type OkValue<R, E = unknown> = R extends Result<infer U, E> ? U : never;
export type ErrValue<R, V = unknown> = R extends Result<V, infer E> ? E : never;

export type OkValues<T extends readonly Result<unknown, unknown>[]> = {
  [idx in keyof T]: T[idx] extends Result<infer U, unknown> ? U : never;
};
export type ErrValues<T extends readonly Result<unknown, unknown>[]> = {
  [idx in keyof T]: T[idx] extends Result<unknown, infer U> ? U : never;
};
