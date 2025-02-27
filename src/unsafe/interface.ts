import { IResult } from "../result";
import { Result } from "./index";

export interface IUnsafeResult<T, E> extends IResult<T, E> {
  andThen<U>(f: (x: T) => Result<U, E>): Result<U, E>;
}
