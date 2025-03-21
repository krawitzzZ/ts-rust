export type { ResultError } from "./error";
export type {
  EitherError,
  ExpectedError,
  UnexpectedError,
  CheckedError,
  PendingResult,
  Resultant,
  Result,
  SettledResult,
  Ok,
  Err,
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
} from "./result";
