import { Option, PendingOption } from "./index";

export type FlattenedPendingOption<T> =
  T extends Option<infer R>
    ? PendingOption<Awaited<R>>
    : T extends PendingOption<infer R>
      ? PendingOption<Awaited<R>>
      : PendingOption<T>;

export type MaybePendingOption<T> = Option<T> | PendingOption<T>;
