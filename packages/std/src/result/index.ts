export {
  ResultErrorKind,
  ResultError,
  expected,
  unexpected,
  isCheckedError,
} from "./error";
export {
  EitherError,
  CheckedError,
  ExpectedError,
  UnexpectedError,
  PendingResult,
  Resultant,
  Result,
  SettledResult,
  Ok,
  Err,
} from "./interface";
export { pendingResult, ok, err, isResult, isPendingResult } from "./result";
