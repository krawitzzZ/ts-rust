import { Option, Some, None } from "../option";
import { Err, Ok, Result } from "../result";

export function isOption(x: unknown): x is Option<unknown> {
  return x instanceof Some || x instanceof None;
}

export function isResult(x: unknown): x is Result<unknown> {
  return x instanceof Ok || x instanceof Err;
}

export function isPromise(x: unknown): x is Promise<unknown> {
  return x instanceof Promise;
}
