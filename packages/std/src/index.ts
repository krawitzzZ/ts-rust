export type { Primitive, Clone, Cloneable, Recoverable } from "./types";
export type {
  OptionError,
  PendingOption,
  Optional,
  Option,
  SettledOption,
  Some,
  None,
} from "./option";
export type {
  ResultError,
  EitherError,
  ExpectedError,
  UnexpectedError,
  CheckedError,
  PendingResult,
  Resultant,
  Result,
  UnsafeResult,
  SettledResult,
  SettledUnsafeResult,
  UnsafeErr,
  Ok,
  Err,
} from "./result";

export { AnyError } from "./error";
export {
  OptionErrorKind,
  isOptionError,
  isPendingOption,
  isOption,
  pendingOption,
  pendingSome,
  pendingNone,
  some,
  none,
} from "./option";
export {
  ResultErrorKind,
  isCheckedError,
  isResultError,
  isPendingResult,
  isResult,
  pendingResult,
  pendingOk,
  pendingErr,
  unsafeOk,
  unsafeErr,
  ok,
  err,
} from "./result";
