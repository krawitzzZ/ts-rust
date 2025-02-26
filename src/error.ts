import { stringify } from "./__internal";

export class AnyError<T, E extends Error = Error> extends Error {
  readonly reason: T;

  readonly originalError: E | undefined;

  constructor(message: string | undefined, reason: T, originalError?: E) {
    super(message);

    Object.setPrototypeOf(this, AnyError.prototype);

    this.name = this.constructor.name;
    this.reason = reason;
    this.originalError = originalError;
    this.message = `${message}. Reason: ${stringify(reason)}.`;

    if (originalError) {
      this.message += ` Original error: ${stringify(originalError.message)}`;
    }
  }
}
