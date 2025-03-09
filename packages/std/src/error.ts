import { stringify } from "@ts-rust/shared";

export class AnyError<T> extends Error {
  readonly kind: T;

  readonly reason: Error | undefined;

  constructor(message: string, kind: T, reason?: unknown) {
    super(message);

    Object.setPrototypeOf(this, AnyError.prototype);

    this.name = this.constructor.name;
    this.kind = kind;
    this.reason = makeReason(reason);
    this.message = `[${stringify(kind)}] ${message}. Reason: ${stringify(reason)}.`;
  }
}

function makeReason(cause?: unknown): Error | undefined {
  if (cause === undefined) {
    return cause;
  }

  return cause instanceof Error ? cause : new Error(stringify(cause));
}
