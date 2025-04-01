/**
 * The `Error` module provides a base error class for handling errors in
 * a consistent way across the `@ts-rust/std` library. It exports the `AnyError`
 * class, which serves as a generic error type that can be extended or used
 * directly to represent errors in `Option` and `Result` types. Use this module
 * to create or handle custom errors in a type-safe manner within your TypeScript
 * applications.
 * @module Error
 */
export { AnyError } from "./any.error";
