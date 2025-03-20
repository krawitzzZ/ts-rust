export type { Primitive, Clone, Cloneable, Recoverable } from "./types";
export type {
  OptionErrorKind,
  OptionError,
  PendingOption,
  Optional,
  Option,
  SettledOption,
  Some,
  None,
} from "./option";
export type {
  ResultErrorKind,
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
