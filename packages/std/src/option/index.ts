export type { OptionError } from "./error";
export type {
  PendingOption,
  Optional,
  Option,
  SettledOption,
  Some,
  None,
} from "./interface";

export { OptionErrorKind, isOptionError } from "./error";
export {
  isPendingOption,
  isOption,
  pendingOption,
  pendingSome,
  pendingNone,
  some,
  none,
} from "./option";
