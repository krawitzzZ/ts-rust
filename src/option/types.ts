import { Some, None, PendingOption } from "./index";

export type Option<T> = Some<T> | None<T>;

export type FlattenedPendingOption<T> =
  T extends Option<infer R>
    ? PendingOption<Awaited<R>>
    : T extends PendingOption<infer R>
      ? PendingOption<Awaited<R>>
      : PendingOption<T>;

export type MaybePendingOption<T> = Option<T> | PendingOption<T>;

export enum OptionError {
  NoneValueAccess = "NoneValueAccess",
  ExpectNone = "ExpectNone",
  UnwrapNone = "UnwrapNone",
}
