import { stringify } from "@ts-rust/shared";
import { Clone, Primitive } from "../types";

export class AnyError<T extends Primitive>
  extends Error
  implements Clone<AnyError<T>>
{
  readonly kind: T;

  readonly reason: Error;

  constructor(message: string, kind: T, reason?: unknown) {
    super(message);

    this.name = this.constructor.name;
    this.kind = kind;
    this.reason = mkReason(arguments.length === 3 ? reason : kind);
    this.message = `[${stringify(kind)}] ${message}. Reason: ${stringify(reason)}`;
  }
  /**
   * Creates a deep clone of this {@link AnyError}, duplicating all properties and ensuring
   * no shared references.
   *
   * This method constructs a new {@link AnyError} instance with the same `kind` and a cloned
   * `reason`. Since `kind` is a {@link Primitive}, it is copied as-is, while `reason` (an
   * `Error`) is recreated with its `message` and, if available, its `stack` or `cause`.
   * The `message` and `name` are regenerated to match the original formatting, and the `stack`
   * trace is set to the new instance’s call context (though it may be copied if supported).
   *
   * @returns A new {@link AnyError} instance with deeply cloned state.
   *
   * ### Example
   * ```ts
   * const original = new AnyError("Test error", "TestKind", new Error("Nested"));
   * const cloned = original.clone();
   * console.log(cloned.message); // "[TestKind] Test error. Reason: [Error: Nested]"
   * console.log(cloned !== original); // true
   * console.log(cloned.reason !== original.reason); // true
   * ```
   */
  clone(this: AnyError<T>): AnyError<T> {
    return new AnyError(this.message, this.kind, cloneError(this.reason));
  }
}

const mkReason = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(stringify(reason));

const cloneError = (err: Error): Error => {
  const clone = new Error(err.message);

  if (err.stack) {
    Object.defineProperty(clone, "stack", {
      value: err.stack,
      writable: true,
      configurable: true,
    });
  }

  if ("reason" in err && err.reason instanceof Error) {
    Object.defineProperty(clone, "cause", {
      value: cloneError(err.reason),
      writable: true,
      configurable: true,
    });
  }

  if ("cause" in err) {
    try {
      Object.defineProperty(clone, "cause", {
        value:
          err.cause instanceof Error
            ? cloneError(err.cause)
            : structuredClone(err.cause),
        writable: true,
        configurable: true,
      });
    } catch {
      // do not care about the error
    }
  }

  return clone;
};
