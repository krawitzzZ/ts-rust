import type { Option, PendingOption } from "./index";

/**
 * Extracts a tuple of underlying value types from an array of {@link Option} or
 * {@link PendingOption} instances.
 *
 * The {@link SomeValues} type maps over a tuple `T` of `Option<unknown>` or
 * `PendingOption<unknown>` types and extracts the value type `U` for each element
 * using conditional type inference. The result is a tuple of the inferred value
 * types corresponding to the input array's elements.
 */
export type SomeValues<
  T extends readonly (Option<unknown> | PendingOption<unknown>)[],
> = {
  [idx in keyof T]: T[idx] extends Option<infer U>
    ? U
    : T[idx] extends PendingOption<infer U>
      ? U
      : never;
};

/**
 * Extracts a tuple of awaited underlying value types from an array of {@link Option} or
 * {@link PendingOption} instances.
 *
 * The {@link SomeAwaitedValues} type maps over a tuple `T` of `Option<unknown>` or
 * `PendingOption<unknown>` types and extracts the awaited value type `U` for each element
 * using conditional type inference. It applies the `Awaited` utility type to resolve
 * `Promise`-like types within each `U`, making it suitable for handling asynchronous
 * values across multiple instances. The result is a tuple of the awaited inferred value
 * types corresponding to the input array's elements.
 */
export type SomeAwaitedValues<
  T extends readonly (Option<unknown> | PendingOption<unknown>)[],
> = {
  [idx in keyof T]: T[idx] extends Option<infer U>
    ? Awaited<U>
    : T[idx] extends PendingOption<infer U>
      ? Awaited<U>
      : never;
};
