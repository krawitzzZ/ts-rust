import { stringify } from "@ts-rust/shared";
import { Primitive } from "../types";

export class AnyError<T extends Primitive> extends Error {
  readonly kind: T;

  readonly reason: Error;

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
