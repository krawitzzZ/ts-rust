/**
 * The `Result` module provides utilities for handling operations that can
 * succeed or fail in a type-safe manner. Inspired by Rust's `Result` type, this
 * module offers the `Result` and `PendingResult` types to manage success (`Ok`)
 * and failure (`Err`) cases explicitly. It includes type definitions for `Result`,
 * `PendingResult`, and related error types, as well as utility functions for
 * creating and checking `Result` instances. Use this module to write more
 * predictable and robust TypeScript code by enforcing explicit error handling.
 * @module Result
 */
export type { ResultError } from "./error";
export type {
  EitherError,
  ExpectedError,
  UnexpectedError,
  CheckedError,
  PendingResult,
  Resultant,
  Result,
  SettledResult,
  Ok,
  Err,
} from "./interface";

export { ResultErrorKind, isResultError, isCheckedError } from "./error";
export {
  isPendingResult,
  isResult,
  pendingResult,
  pendingOk,
  pendingErr,
  ok,
  err,
  run,
  runAsync,
  runResult,
  runPendingResult,
} from "./result";
