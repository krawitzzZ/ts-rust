import { stringify } from "./internal";

export class AnyError<T> extends Error {
  readonly kind: T;

  readonly cause: Error | undefined;

  constructor(message: string, kind: T, cause?: unknown) {
    super(message);

    Object.setPrototypeOf(this, AnyError.prototype);

    this.name = this.constructor.name;
    this.kind = kind;
    this.cause = makeCause(cause);
    this.message = `${message}. Reason: ${stringify(kind)}.`;
  }
}

function makeCause(cause?: unknown): Error | undefined {
  if (arguments.length === 0) {
    return undefined;
  }

  return cause instanceof Error ? cause : new Error(stringify(cause));
}
