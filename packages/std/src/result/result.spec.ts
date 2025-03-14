import { ResultError, ResultErrorKind } from "./error";
import { Err, Ok } from "./interface";
import { err, ok } from "./result";

describe("Result", () => {
  const errMsg = "err";
  const one = 11;
  //   const two = 222;
  //   const zero = 0;

  describe("value", () => {
    it("returns inner value if self is `Ok`", () => {
      const result = ok(one);

      expect((result as Ok<number, string>).value).toBe(one);
    });

    it("throws `ResultError` if self is `Err` (wrongly casted)", () => {
      const result = err(errMsg);

      expect(() => (result as Ok<number, string>).value).toThrow(
        new ResultError(
          "`value`: accessed on `Err`",
          ResultErrorKind.ValueAccessedOnErr,
        ),
      );
    });
  });

  describe("error", () => {
    it("returns inner error if self is `Err`", () => {
      const result = err(errMsg);

      expect((result as Err<number, string>).error).toBe(errMsg);
    });

    it("throws `ResultError` if self is `Ok` (wrongly casted)", () => {
      const result = ok(one);

      expect(() => (result as Err<number, string>).error).toThrow(
        new ResultError(
          "`error`: accessed on `Ok`",
          ResultErrorKind.ErrorAccessedOnOk,
        ),
      );
    });
  });
});
