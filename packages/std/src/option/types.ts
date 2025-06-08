import type { Option, PendingOption } from "./index";

/**
 * Extracts the underlying value type `T` from an {@link Option} or {@link PendingOption}.
 *
 * The {@link SomeValue} type uses conditional type inference to determine the value type
 * `T` from either an `Option<T>` or a `PendingOption<T>`.
 */
export type SomeValue<T> =
  T extends Option<infer U> ? U : T extends PendingOption<infer U> ? U : never;

/**
 * Extracts the awaited underlying value type `T` from an {@link Option} or {@link PendingOption}.
 *
 * The {@link SomeAwaitedValue} type uses conditional type inference to determine the awaited
 * value type `T` from either an `Option<T>` or a `PendingOption<T>`. It applies the
 * `Awaited` utility type to resolve `Promise`-like types within `U`, making it suitable
 * for handling asynchronous values. If the input type `T` is neither an `Option` nor a
 * `PendingOption`, it returns `never`.
 */
export type SomeAwaitedValue<T> =
  T extends Option<infer U>
    ? Awaited<U>
    : T extends PendingOption<infer U>
      ? Awaited<U>
      : never;

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
