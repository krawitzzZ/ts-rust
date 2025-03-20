export type { ResultError } from "./error";
export type {
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
  Ok,
  Err,
  UnsafeErr,
} from "./interface";

export { ResultErrorKind, isResultError, isCheckedError } from "./error";
export {
  isPendingResult,
  isResult,
  pendingResult,
  pendingOk,
  pendingErr,
  ok,
  err,
  unsafeOk,
  unsafeErr,
} from "./result";
