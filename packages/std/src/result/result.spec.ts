import { ResultError, ResultErrorKind } from "./error";
import { Err, Ok } from "./interface";
import { err, ok } from "./result";

describe("Result", () => {
  const syncError = new Error("sync error");
  const errMsg = "err";
  const recoveredMsg = "recovered";
  const one = 11;
  const two = 222;
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

  describe("and", () => {
    it("returns `Err` with error value of self if self is `Err`", () => {
      const self = err<number, string>(errMsg);
      const other = ok<number, string>(one);
      const result = self.and(other);

      expect(result.isErr()).toBe(true);
      expect(result).not.toBe(self);
      expect(result).not.toBe(other);
      expect(result.unwrapErr()).toBe(errMsg);
      expect(() => result.unwrap()).toThrow(ResultError);
    });

    it("returns copy of provided `Result` if self is `Ok`", () => {
      const self = ok<number, string>(one);
      const other = ok<number, string>(two);
      const result = self.and(other);

      expect(result.isOk()).toBe(true);
      expect(result).not.toBe(self);
      expect(result).not.toBe(other);
      expect(result).toStrictEqual(other);
    });
  });

  describe("andThen", () => {
    it("does not call provided callback and returns `Err` with error value of self if self is `Err`", () => {
      const self = err(errMsg);
      const callback = jest.fn();
      const result = self.andThen(callback);

      expect(result.isErr()).toBe(true);
      expect(result).not.toBe(self);
      expect(() => result.unwrap()).toThrow(ResultError);
      expect(result.unwrapErr()).toBe(errMsg);
      expect(callback).not.toHaveBeenCalled();
    });

    it("calls provided callback and returns `Result` from its result if self is `Ok`", () => {
      const self = ok(one);
      const other = ok(two);
      const callback = jest.fn(() => other);
      const result = self.andThen(callback);

      expect(result.isOk()).toBe(true);
      expect(result).toBe(other);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(self.unwrap());
    });

    it("does not throw, returns `ResultError` if self is `Ok`, provided callback throws and `defaultError` is not provided", () => {
      const self = ok(one);
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.andThen(callback);

      expect(result).not.toBe(self);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toStrictEqual(
        new ResultError(
          "`andThen`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(self.unwrap());
    });

    it("does not throw, returns `Err` with `defaultError` if self is `Ok`, provided callback throws and `defaultError` is provided", () => {
      const self = ok(one);
      const defErr = recoveredMsg;
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.andThen(callback, defErr);

      expect(result).not.toBe(self);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(recoveredMsg);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(self.unwrap());
    });
  });
});
