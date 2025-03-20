import { stringify } from "@ts-rust/shared";
import { Primitive } from "../types";

/**
 * A generic error class extending `Error` with a typed `kind` and optional `reason`.
 *
 * This class provides a structured way to represent errors with a category (`kind`) of a
 * primitive type (e.g., string, number, enum) and an optional underlying cause (`reason`).
 * The error message is automatically formatted to include both the `kind` and `reason`
 * (if provided), making it suitable for categorized error handling in libraries or
 * applications.
 *
 * @template T - The type of the error `kind`, constrained to {@link Primitive} (e.g., string, number, enum).
 *
 * ### Example
 * ```ts
 * const err1 = new AnyError("Invalid input", "ValidationError");
 * const err2 = new AnyError("File not found", 404, new Error("ENOENT"));
 *
 * expect(err1.message).toBe("[ValidationError] Invalid input.");
 * expect(err2.message).toBe("[404] File not found. Reason: ENOENT");
 * expect(err2.kind).toBe(404);
 * expect(err2.reason.message).toBe("ENOENT");
 * ```
 */
export class AnyError<T extends Primitive> extends Error {
  /**
   * The category or type of the error, represented as a primitive value.
   *
   * This readonly property identifies the error’s kind, such as a string code
   * or numeric status, and is set during construction.
   */
  readonly kind: T;

  /**
   * The underlying cause of the error, represented as an `Error` instance.
   *
   * This readonly property holds the `reason` provided during construction,
   * normalized to an `Error` object. If no `reason` is given, it defaults to
   * an error wrapping the `kind`.
   */
  readonly reason: Error;

  /**
   * Constructs a new {@link AnyError} instance with a message, kind,
   * and optional reason.
   *
   * The error’s message is formatted as `[kind] message` or `[kind] message. Reason: reason`
   * if a `reason` is provided. The `name` is set to the constructor’s name,
   * and the `reason` is normalized to an `Error` instance.
   *
   * @param message - The descriptive message for the error.
   * @param kind - The category or type of the error, a primitive value.
   * @param reason - An optional underlying cause, which can be any value (converted to `Error` if not already).
   */
  constructor(message: string, kind: T, reason?: unknown) {
    super(message);

    this.name = this.constructor.name;
    this.kind = kind;
    this.reason = mkReason(arguments.length === 3 ? reason : kind);
    this.message = mkMessage(message, kind, reason);
  }
}

const mkMessage = (msg: string, kind: unknown, reason?: unknown): string => {
  let message = `[${stringify(kind)}] ${msg}.`;

  if (reason !== undefined) {
    message += ` Reason: ${stringify(reason)}`;
  }

  return message;
};

const mkReason = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(stringify(reason));
