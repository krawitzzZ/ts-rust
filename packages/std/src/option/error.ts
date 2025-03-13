import { AnyError } from "../error";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Option } from "./interface";

/**
 * Enumerates error codes specific to {@link Option} operations.
 *
 * These codes are used in {@link OptionError} instances thrown by methods like
 * {@link Option.unwrap} or {@link Option.expect} when operations fail due to
 * the state of the option.
 */
export enum OptionErrorKind {
  NoneValueAccessed = "NoneValueAccessed",
  NoneExpected = "NoneExpected",
  NoneUnwrapped = "NoneUnwrapped",
  PredicateException = "PredicateException",
}

/**
 * An error thrown by {@link Option} methods when operations fail due to the option's state
 * or unexpected conditions.
 *
 * This class extends {@link AnyError} with error kinds specific to {@link Option} operations,
 * as defined in {@link OptionErrorKind}. It is typically thrown by methods like
 * {@link Option.unwrap | unwrap}, {@link Option.expect | expect}, or others that enforce
 * strict access or behavior on {@link Some} or {@link None} variants. Use it to handle
 * failures gracefully in a type-safe manner, inspecting the {@link OptionErrorKind} to
 * determine the cause.
 *
 * ### Example
 * ```ts
 * const opt = none<number>();
 * try {
 *   opt.unwrap();
 * } catch (e) {
 *   expect(e).toBeInstanceOf(OptionError);
 *   expect(e.kind).toBe(OptionErrorKind.NoneUnwrapped);
 *   expect(e.message).toBe("`Option.unwrap` - called on `None`");
 * }
 * ```
 */
export class OptionError extends AnyError<OptionErrorKind> {}
