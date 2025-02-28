import { stringify } from "@ts-rust/internal";

export class AnyError<T> extends Error {
  readonly kind: T;

  readonly reason: Error | undefined;

  constructor(message: string, kind: T, reason?: unknown) {
    super(message);

    Object.setPrototypeOf(this, AnyError.prototype);

    this.name = this.constructor.name;
    this.kind = kind;
    this.reason = makeReason(reason);
    this.message = `${message}. Reason: ${stringify(kind)}.`;
  }
}

function makeReason(cause?: unknown): Error | undefined {
  if (arguments.length === 0) {
    return undefined;
  }

  return cause instanceof Error ? cause : new Error(stringify(cause));
}
