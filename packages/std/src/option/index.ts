/**
 * The `Option` module provides utilities for handling optional values in
 * a type-safe manner. Inspired by Rust's `Option` type, this module offers the
 * `Option` and `PendingOption` types to represent values that may or may not
 * be present (`Some` or `None`). It includes type definitions for `Option`,
 * `PendingOption`, and related error types, as well as utility functions for
 * creating and checking `Option` instances. Use this module to avoid
 * null/undefined errors and write more explicit, safer TypeScript code.
 * @module Option
 */
export type { OptionError } from "./error";
export type {
  PendingOption,
  Optional,
  Option,
  SettledOption,
  Some,
  None,
} from "./interface";

export { OptionErrorKind, isOptionError } from "./error";
export {
  isPendingOption,
  isOption,
  pendingOption,
  pendingSome,
  pendingNone,
  some,
  none,
} from "./option";
