export class AnyError<T> extends Error {
  #reason: T;

  get reason(): T {
    return this.#reason;
  }

  constructor(message: string | undefined, reason: T) {
    super(message);

    Object.setPrototypeOf(this, AnyError.prototype);

    this.#reason = reason;
    this.name = this.constructor.name;
  }

  override toString(): string {
    return `${super.toString()}. Reason: ${JSON.stringify(this.#reason)}`;
  }
}
