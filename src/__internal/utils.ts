import { Option, Some, None } from "../option";
import { AwaitableOption } from "../option/option"; // TODO(nikita.demin): change import path
import { Err, Ok, Result } from "../result";

export function isOption(x: unknown): x is Option<unknown> {
  return x instanceof Some || x instanceof None;
}

export function isResult(x: unknown): x is Result<unknown> {
  return x instanceof Ok || x instanceof Err;
}

export function hasType<T>(x: Option<unknown>, type: T): x is Option<T> {
  if (x.isNone()) {
    return true;
  }

  const isTargetOption = isOption(type);
  const isValueOption = isOption(x.value);

  if (isTargetOption && !isValueOption) {
    return false;
  }

  if (!isTargetOption && isValueOption) {
    return false;
  }

  if (isTargetOption && isValueOption) {
    return haveSameType(type, x.value);
  }

  return typeof x.value === typeof type;
}

export function haveSameType(x: Option<unknown>, y: Option<unknown>): boolean {
  if (x.isNone() && y.isNone()) {
    return true;
  }

  if (x.isNone() || y.isNone()) {
    return false;
  }

  const isXOption = isOption(x.value);
  const isYOption = isOption(y.value);

  if (!isXOption && !isYOption) {
    return typeof x.value === typeof y.value;
  }

  if (isXOption && isYOption) {
    return haveSameType(x.value, y.value);
  }

  return false;
}

export function stringify(value: unknown): string {
  if (value instanceof AwaitableOption) {
    return value.toString();
  }

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return `"${value}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "bigint") {
    return value.toString() + "n";
  }

  if (typeof value === "function") {
    return `[Function: ${value.name || "anonymous"}]`;
  }

  if (typeof value === "object") {
    const v = value as { toString?: () => string };

    if (
      typeof v.toString === "function" &&
      v.toString !== Object.prototype.toString
    ) {
      return v.toString();
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "[Circular or Unstringifiable Object]";
    }
  }

  return "[Unknown Type]";
}
