import { none, Option, some } from "../option";
import { Clone } from "../types";
import { ResultError, expectedError, unexpectedError } from "./error";
import {
  isCheckedError,
  ResultErrorKind,
  err,
  isPendingResult,
  ok,
  Err,
  Ok,
  Result,
} from "./index";

describe("Result", () => {
  const syncError = new Error("sync error");
  const asyncError = new Error("async error");
  const errMsg = "err";
  const expectedErrMsg = "expected error happened";
  const unexpectedErrMsg = "unexpected error happened";
  const expectedErr = expectedError(expectedErrMsg);
  const unexpectedErr = unexpectedError<string>(
    unexpectedErrMsg,
    ResultErrorKind.Unexpected,
  );
  const one = 11;
  const two = 222;
  const zero = 0;

  class Counter implements Clone<Counter> {
    constructor(public data: { count: number }) {}
    clone(this: Clone<Counter>): Counter {
      return new Counter({ count: 0 });
    }
  }

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
    it("returns inner error if self is `Err` with `E`", () => {
      const result = err<number, string>(errMsg);
      const error = (result as Err<number, string>).error;

      expect(isCheckedError(error)).toBe(true);
    });

    it("returns inner error if self is `Err` with expected `E`", () => {
      const result = err<number, string>(expectedErr);
      const error = (result as Err<number, string>).error;

      expect(isCheckedError(error)).toBe(true);
      expect(error.unexpected).toBeUndefined();
      expect(error.expected).toBe(expectedErrMsg);
    });

    it("returns inner error if self is `Err` with unexpected error", () => {
      const result = err<number, string>(unexpectedErr);
      const error = (result as Err<number, string>).error;

      expect(isCheckedError(error)).toBe(true);
      expect(error.expected).toBeUndefined();
      expect(error.unexpected?.message).toStrictEqual(
        expect.stringContaining(unexpectedErrMsg),
      );
      expect(error.unexpected?.kind).toBe(ResultErrorKind.Unexpected);
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
      expect(result.unwrapErr()).toStrictEqual(expectedError(errMsg));
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
      expect(result.unwrapErr()).toStrictEqual(expectedError(errMsg));
      expect(() => result.unwrap()).toThrow(ResultError);
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

    it("does not throw and returns `CheckedError` with `ResultError` if self is `Ok` and provided callback throws", () => {
      const self = ok(one);
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.andThen(callback);

      expect(result).not.toBe(self);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().expected).toBeUndefined();
      expect(result.unwrapErr().unexpected).toStrictEqual(
        new ResultError(
          "`andThen`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(self.unwrap());
    });
  });

  describe("check", () => {
    it("returns `[true, T]` if self is `Ok`", () => {
      const self = ok(one);

      expect(self.check()).toStrictEqual([true, one]);
    });

    it.each([expectedErr, unexpectedErr])(
      "returns `[false, CheckedError<E>]` if self is `Err { %p }`",
      (e) => {
        const self = err(e);

        expect(self.check()).toStrictEqual([false, e]);
      },
    );
  });

  describe("clone", () => {
    it("returns `Err` with cloned `ResultError` if self is `Err` with unexpected error", () => {
      const resError = new ResultError(
        unexpectedErrMsg,
        ResultErrorKind.Unexpected,
      );
      const self = err<number, string>(unexpectedError(resError));
      const spy = jest.spyOn(resError, "clone");
      const cloned = self.clone();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(cloned.isErr()).toBe(true);
      expect(cloned).not.toBe(self);
      expect(cloned.unwrapErr()).not.toBe(self.unwrapErr());
      expect(() => cloned.unwrap()).toThrow(ResultError);

      const error = cloned.unwrapErr();

      expect(error.expected).toBeUndefined();
      expect(error.unexpected).toBeInstanceOf(ResultError);
      expect(error.unexpected?.message).toBe(resError.message);
      expect(error.unexpected?.kind).toBe(resError.kind);
    });

    it("returns `Err` with deeply cloned `E` if self is `Err` with expected error with primitive value", () => {
      const self = err<number, string>(expectedError("ulala"));
      const cloned = self.clone();

      expect(cloned.isErr()).toBe(true);
      expect(cloned).not.toBe(self);
      expect(cloned.unwrapErr()).not.toBe(self.unwrapErr());
      expect(cloned.unwrapErr()).not.toBe(self.unwrapErr());
      expect(() => cloned.unwrap()).toThrow(ResultError);

      const error = cloned.unwrapErr();

      expect(error.unexpected).toBeUndefined();
      expect(error.expected).toBe("ulala");
    });

    it("returns `Err` with deeply cloned `E` if self is `Err` with expected error", () => {
      const counter = new Counter({ count: 10 });
      const spy = jest.spyOn(counter, "clone");
      const self = err<number, Counter>(expectedError(counter));
      const cloned = self.clone();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(cloned.isErr()).toBe(true);
      expect(cloned).not.toBe(self);
      expect(cloned.unwrapErr()).not.toBe(self.unwrapErr());
      expect(cloned.unwrapErr()).not.toBe(self.unwrapErr());
      expect(() => cloned.unwrap()).toThrow(ResultError);

      const error = cloned.unwrapErr();

      expect(error.unexpected).toBeUndefined();
      expect(error.expected).toBeInstanceOf(Counter);

      counter.data.count = 100;

      expect(self.unwrapErr().expected?.data.count).toBe(100);
      expect(error.expected).toStrictEqual(counter.clone());
      expect(error.expected?.data.count).toBe(0);
    });

    it("returns `Ok` with the same value", () => {
      const counter = new Counter({ count: 10 });
      const spy = jest.spyOn(counter, "clone");
      const self = ok<Counter, string>(counter);
      const cloned = self.clone();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(cloned.isOk()).toBe(true);
      expect(cloned).not.toBe(self);
      expect(cloned.unwrap()).not.toBe(self.unwrap());
      expect(cloned.unwrap()).toBeInstanceOf(Counter);
      expect(cloned.unwrap()).toStrictEqual(counter.clone());
    });

    it.each([null, undefined, 0, 1, "string", Symbol("symbol"), true, false])(
      "creates a deep copy if the result holds a primitive '%p'",
      (v) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- for testing
        const self = ok<any, string>(v);
        const cloned = self.clone();

        expect(cloned.isOk()).toBe(true);
        expect(cloned).not.toBe(self);
        expect(cloned.unwrap()).toBe(v);
      },
    );
  });

  describe("combine", () => {
    it("returns `Err` if self is `Err`", () => {
      const self = err<number, string>(errMsg);
      const other = ok<number, string>(one);
      const result = self.combine(other);

      expect(result.isErr()).toBe(true);
    });

    it("returns `Err` if self is `Ok` and provided result is `Err`", () => {
      const self = ok<number, string>(one);
      const other = err<string, string>(errMsg);
      const result = self.combine(other);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().expected).toBe(errMsg);
    });

    it("returns `Err` if self is `Ok` and one of the provided results is `Err`", () => {
      const self = ok<number, string>(one);
      const other1 = ok<number, string>(two);
      const other2 = err<string, string>(errMsg);
      const result = self.combine(other1, other2);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().expected).toBe(errMsg);
    });

    it("returns `Ok` with combined values if self is `Ok` and provided results are `Ok`", () => {
      const promiseTwo = Promise.resolve(two);
      const self = ok<number, string>(one);
      const other1 = ok<Promise<number>, string>(promiseTwo);
      const other2 = ok<number, string>(zero);
      const result = self.combine(other1, other2);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toStrictEqual([one, promiseTwo, zero]);
    });
  });

  describe("copy", () => {
    it("returns a new `Result` with the same value, but different reference if self is `Ok`", () => {
      const value = { number: one };
      const self = ok(value);
      const result = self.copy();

      expect(result).not.toBe(self); // Different reference
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(value); // Same value reference
    });

    it("returns a new `Result` with the same error value, but different reference if self is `Err`", () => {
      const self = err(expectedErr);
      const result = self.copy();

      expect(result).not.toBe(self); // Different reference
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(expectedErr); // Same err reference
    });
  });

  describe("err", () => {
    it("returns `None` if self is `Ok`", () => {
      const self = ok(one);
      const result = self.err();

      expect(result.isNone()).toBe(true);
    });

    it("returns `None` if self is unexpected `Err`", () => {
      const self = err(unexpectedErr);
      const result = self.err();

      expect(result.isNone()).toBe(true);
    });

    it("returns `Some` if self is expected `Err`", () => {
      const self = err(expectedErr);
      const result = self.err();

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(expectedErr.expected);
    });
  });

  describe("expect", () => {
    it("returns inner `Ok` value if self is `Ok`", () => {
      const self = ok(one);
      const result = self.expect("error");

      expect(result).toBe(one);
    });

    it.each(["oi oi oi", undefined])(
      "throws `ResultError` if self is `Err`",
      (msg) => {
        const self = err(expectedErr);

        expect(() => self.expect(msg)).toThrow(
          new ResultError(
            msg ?? "`expect`: called on `Err`",
            ResultErrorKind.ExpectCalledOnErr,
          ),
        );
      },
    );
  });

  describe("expectErr", () => {
    it("returns inner `Err` value if self is `Err`", () => {
      const self = err(errMsg);
      const result = self.expectErr("error");

      expect(isCheckedError(result)).toBe(true);
      expect(result.expected).toBe(errMsg);
    });

    it.each(["oi oi oi", undefined])(
      "throws `ResultError` if self is `Ok`",
      (msg) => {
        const self = ok(one);

        expect(() => self.expectErr(msg)).toThrow(
          new ResultError(
            msg ?? "`expectErr`: called on `Ok`",
            ResultErrorKind.ExpectErrCalledOnOk,
          ),
        );
      },
    );
  });

  describe("flatten", () => {
    it("returns `Err` if self is `Err`", () => {
      const self: Result<Result<number, string>, string> = err(errMsg);
      const result = self.flatten();

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().expected).toBe(errMsg);
    });

    it.each([expectedErr, unexpectedErr])(
      "returns `Err` if self is `Err { %p }`",
      (e) => {
        const self: Result<Result<number, string>, string> = err(e);
        const result = self.flatten();

        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe(e);
      },
    );

    it("returns unexpected `Err` if self is `Ok`, but value is not a `Result`", () => {
      // @ts-expect-error -- for testing
      const self: Result<Result<number, string>, string> = ok(one);
      const result = self.flatten();

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().expected).toBeUndefined();
      expect(result.unwrapErr().unexpected).toStrictEqual(
        new ResultError(
          "`flatten`: called on `Ok` with non-result value",
          ResultErrorKind.FlattenCalledOnFlatResult,
        ),
      );
    });

    it("returns inner `Result` if self is `Result<Result<T, E>, E>`", () => {
      const self = ok(ok(one));
      const result = self.flatten();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(one);
    });
  });

  describe("inspect", () => {
    it("calls provided callback if self is `Ok`", () => {
      const self = ok(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn();
      const result = self.inspect(callback);

      expect(result).not.toBe(self);
      expect(result.unwrap()).toBe(self.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("calls provided callback and does not await for the result if self is `Ok` and provided callback returns a promise", async () => {
      jest.useFakeTimers();
      let sideEffect = 0;
      const timeout = 1000;
      const self = ok(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn(async () => {
        setTimeout(() => {
          sideEffect = 1;
        }, timeout);
      });
      const result = self.inspect(callback);

      expect(result).not.toBe(self);
      expect(result.unwrap()).toBe(self.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(sideEffect).toBe(0);

      jest.advanceTimersByTime(timeout);
      expect(result).not.toBe(self);
      expect(result.unwrap()).toBe(self.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(sideEffect).toBe(1);

      jest.useRealTimers();
    });

    it.each([expectedErr, unexpectedErr])(
      "does not call provided callback if self is `Err { %p }`",
      (e) => {
        const self = err(e);
        const spy = jest.spyOn(self, "copy");
        const callback = jest.fn();
        const result = self.inspect(callback);

        expect(result).not.toBe(self);
        expect(result.unwrapErr()).toBe(self.unwrapErr());
        expect(callback).not.toHaveBeenCalled();
        expect(spy).toHaveBeenCalledTimes(1);
      },
    );

    it("does not throw if provided callback throws", () => {
      const self = ok(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.inspect(callback);

      expect(result).not.toBe(self);
      expect(result.unwrap()).toBe(self.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not throw if provided callback returns a promise that rejects", () => {
      const self = ok(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn(() => Promise.reject(asyncError));
      const result = self.inspect(callback);

      expect(result).not.toBe(self);
      expect(result.unwrap()).toBe(self.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("inspectErr", () => {
    it.each([expectedErr, unexpectedErr])(
      "calls provided callback if self is `Err { %p }`",
      (e) => {
        const self = err(e);
        const spy = jest.spyOn(self, "copy");
        const callback = jest.fn();
        const result = self.inspectErr(callback);

        expect(result).not.toBe(self);
        expect(result.unwrapErr()).toBe(self.unwrapErr());
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(e);
        expect(spy).toHaveBeenCalledTimes(1);
      },
    );

    it("does not call provided callback if self is `Ok`", () => {
      const self = ok(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn();
      const result = self.inspectErr(callback);

      expect(result).not.toBe(self);
      expect(result.unwrap()).toBe(self.unwrap());
      expect(callback).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it.each([expectedErr, unexpectedErr])(
      "calls provided callback and does not await for the result if self is `Err` and provided callback returns a promise",
      async (e) => {
        jest.useFakeTimers();
        let sideEffect = 0;
        const timeout = 1000;
        const self = err(e);
        const spy = jest.spyOn(self, "copy");
        const callback = jest.fn(async () => {
          setTimeout(() => {
            sideEffect = 1;
          }, timeout);
        });
        const result = self.inspectErr(callback);

        expect(result).not.toBe(self);
        expect(result.unwrapErr()).toBe(self.unwrapErr());
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(e);
        expect(sideEffect).toBe(0);

        jest.advanceTimersByTime(timeout);
        expect(result).not.toBe(self);
        expect(result.unwrapErr()).toBe(self.unwrapErr());
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(e);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(sideEffect).toBe(1);

        jest.useRealTimers();
      },
    );

    it("does not throw if provided callback throws", () => {
      const self = err(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.inspectErr(callback);

      expect(result).not.toBe(self);
      expect(result.unwrapErr()).toBe(self.unwrapErr());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedError(one));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not throw if provided callback returns a promise that rejects", () => {
      const self = err(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn(() => Promise.reject(asyncError));
      const result = self.inspectErr(callback);

      expect(result).not.toBe(self);
      expect(result.unwrapErr()).toBe(self.unwrapErr());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedError(one));
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("isErr", () => {
    it.each([
      [true, err<number, string>("err")],
      [false, ok<number, string>(one)],
    ])("returns '%p' if self is %s", (exp, result) => {
      expect(result.isErr()).toBe(exp);
    });
  });

  describe("isErrAnd", () => {
    it("returns `false` if provided callback returns `true`, but self is `Ok`", () => {
      expect(ok(one).isErrAnd(() => true)).toBe(false);
    });

    it("returns `false` if provided callback returns `false` and self is `Err`", () => {
      expect(err(expectedErr).isErrAnd(() => false)).toBe(false);
    });

    it("returns `true` if provided callback returns `true` and self is `Err`", () => {
      expect(err(expectedErr).isErrAnd(() => true)).toBe(true);
    });

    it("returns `false` if provided callback throws and self is `Err`", () => {
      expect(
        err(expectedErr).isErrAnd(() => {
          throw syncError;
        }),
      ).toBe(false);
    });
  });

  describe("isOk", () => {
    it.each([
      [false, err()],
      [true, ok(one)],
    ])("returns '%p' if self is '%s'", (exp, result) => {
      expect(result.isOk()).toBe(exp);
    });
  });

  describe("isOkAnd", () => {
    it("returns `false` if provided callback returns `true`, but self is `Err`", () => {
      expect(err(expectedErr).isOkAnd(() => true)).toBe(false);
    });

    it("returns `false` if provided callback returns `false` and self is `Ok`", () => {
      expect(ok(one).isOkAnd(() => false)).toBe(false);
    });

    it("returns `true` if provided callback returns `true` and self is `Ok`", () => {
      expect(ok(one).isOkAnd(() => true)).toBe(true);
    });

    it("returns `false` if provided callback throws and self is `Ok`", () => {
      expect(
        ok(one).isOkAnd(() => {
          throw syncError;
        }),
      ).toBe(false);
    });
  });

  describe("iter", () => {
    it("returns an iterator that yields nothing if self is `Err`", () => {
      const self = err(expectedErr);
      const iter = self.iter();

      expect(iter.next()).toStrictEqual({ done: true });
      expect(iter.next()).toStrictEqual({ done: true });
    });

    it.each([one, true, { a: 2 }])(
      "returns an iterator that yields '%s' only once if self is `Ok`",
      (v) => {
        const self = ok(v);
        const iter = self.iter();

        expect(iter.next()).toStrictEqual({ done: false, value: v });
        expect(iter.next()).toStrictEqual({ done: true });
        expect(iter.next()).toStrictEqual({ done: true });
      },
    );

    it.each([ok<number, string>(one), err<number, string>(expectedErr)])(
      "works with spread operator",
      (res) => {
        const iter = res.iter();

        expect([...iter]).toStrictEqual(res.isOk() ? [res.unwrap()] : []);
        expect(iter.next()).toStrictEqual({ done: true });
      },
    );

    it.each([ok<number, string>(one), err<number, string>(expectedErr)])(
      "works with for .. of loop",
      (res) => {
        const iter = res.iter();

        for (const x of iter) {
          expect(x).toBe(one);
        }

        expect.assertions(res.isOk() ? 1 : 0);
      },
    );
  });

  describe("map", () => {
    it.each([expectedErr, unexpectedErr])(
      "does not call provided callback and returns self if self is `Err`",
      (e) => {
        const self = err(e);
        const callback = jest.fn();
        const result = self.map(callback);

        expect(callback).not.toHaveBeenCalled();
        expect(result.unwrapErr()).toStrictEqual(e);
      },
    );

    it("calls provided callback with inner value and returns new `Result` with result", () => {
      const self = ok(one);
      const callback = jest.fn(() => two);
      const result = self.map(callback);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(two);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `Err` with unexpected error if provided callback throws", () => {
      const self = ok(one);
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.map(callback);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`map`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
    });
  });

  describe("mapAll", () => {
    it.each([
      err<number, string>(expectedErr),
      err<number, string>(unexpectedErr),
      ok(one),
    ])(
      "calls provided synchronous callback with self and returns mapped `Result`",
      (res) => {
        const mapped = ok(two);
        const fn = () => mapped;
        const callback = jest.fn(fn);
        const result = res.mapAll(callback);

        expect(result).not.toBe(res);
        expect(result).toBe(mapped);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(res);
      },
    );

    it.each([
      err<number, string>(expectedErr),
      err<number, string>(unexpectedErr),
      ok(one),
    ])(
      "calls provided asynchronous callback with self and returns `PendingResult` with awaited mapped result",
      async (res) => {
        const mapped = ok(two);
        const fn = () => Promise.resolve(mapped);
        const callback = jest.fn(fn);
        const result = res.mapAll(callback);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited).not.toBe(mapped);
        expect(awaited).toStrictEqual(mapped);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(res);
      },
    );

    it("returns unexpected `Err` if provided synchronous callback throws", () => {
      const self = ok(one);
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.mapAll(callback);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`mapAll`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(self);
    });

    it("returns unexpected `Err` if provided asynchronous callback rejects", async () => {
      const self = ok(one);
      const callback = jest.fn(() => Promise.reject(asyncError));
      const result = self.mapAll(callback);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "Pending result rejected unexpectedly",
          ResultErrorKind.ResultRejection,
          asyncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(self);
    });
  });

  describe("mapErr", () => {
    it("does not call provided callback and returns self if self is unexpected `Err`", () => {
      const self = err(unexpectedErr);
      const callback = jest.fn();
      const result = self.mapErr(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(result.unwrapErr()).toStrictEqual(unexpectedErr);
    });

    it("does not call provided callback and returns self if self is `Ok`", () => {
      const self = ok(one);
      const callback = jest.fn();
      const result = self.mapErr(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(result.unwrap()).toBe(one);
    });

    it("calls provided callback with inner expected error and returns new `Result` with result", () => {
      const self = err(expectedErr);
      const callback = jest.fn(() => two);
      const result = self.mapErr(callback);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().expected).toBe(two);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedErrMsg);
    });

    it("returns `Err` with unexpected error if provided callback throws", () => {
      const self = err(expectedErr);
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.mapErr(callback);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`mapErr`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
    });
  });

  describe("mapOr", () => {
    it.each([expectedErr, unexpectedErr])(
      "does not call provided callback and returns provided default if self is `Err { %p }`",
      (e) => {
        const self = err(e);
        const callback = jest.fn();
        const result = self.mapOr(two, callback);

        expect(result).toBe(two);
        expect(callback).not.toHaveBeenCalled();
      },
    );

    it("calls provided callback with inner value and returns the result if self is `Ok`", () => {
      const self = ok(one);
      const fn = () => two;
      const callback = jest.fn(fn);
      const result = self.mapOr(zero, callback);

      expect(result).toBe(two);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("does not throw and returns provided default if self is `Ok` and provided callback throws", () => {
      const self = ok(one);
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.mapOr(two, callback);

      expect(result).toBe(two);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("mapOrElse", () => {
    it.each([expectedErr, unexpectedErr])(
      "calls provided `mkDef` callback and returns its result if self is `Err`",
      (e) => {
        const self = err(e);
        const map = jest.fn(() => zero);
        const mkDef = jest.fn(() => two);
        const result = self.mapOrElse(mkDef, map);

        expect(result).toBe(two);
        expect(map).not.toHaveBeenCalled();
        expect(mkDef).toHaveBeenCalledTimes(1);
      },
    );

    it.each([expectedErr, unexpectedErr])(
      "rethrows `ResultError` with original error set as reason if self is `Error` and `mkDef` callback throws",
      (e) => {
        const self = err(e);
        const map = jest.fn(() => zero);
        const mkDef = jest.fn(() => {
          throw syncError;
        });

        expect(() => self.mapOrElse(mkDef, map)).toThrow(
          new ResultError(
            "`mapOrElse`: callback `mkDef` threw an exception",
            ResultErrorKind.PredicateException,
            syncError,
          ),
        );
        expect(map).not.toHaveBeenCalled();
        expect(mkDef).toHaveBeenCalledTimes(1);
      },
    );

    it("calls provided `map` callback and returns its result if self is `Ok`", () => {
      const self = ok(one);
      const map = jest.fn(() => zero);
      const mkDef = jest.fn(() => two);
      const result = self.mapOrElse(mkDef, map);

      expect(result).toBe(zero);
      expect(map).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledWith(one);
      expect(mkDef).not.toHaveBeenCalled();
    });

    it("ignores exception if provided `map` callback throws, calls provided `mkDef` callback and returns its result if self is `Ok`", () => {
      const self = ok(one);
      const map = jest.fn(() => {
        throw syncError;
      });
      const mkDef = jest.fn(() => two);
      const result = self.mapOrElse(mkDef, map);

      expect(result).toBe(two);
      expect(map).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledWith(one);
      expect(mkDef).toHaveBeenCalledTimes(1);
    });

    it("rethrows `ResultError` with original error set as reason if self is `Ok` and provided `mkDef` callback throws", () => {
      const mapError = new Error("map");
      const mkDefError = new Error("make default error");
      const self = ok(one);
      const map = jest.fn(() => {
        throw mapError;
      });
      const mkDef = jest.fn(() => {
        throw mkDefError;
      });

      expect(() => self.mapOrElse(mkDef, map)).toThrow(
        new ResultError(
          "`mapOrElse`: callback `mkDef` threw an exception",
          ResultErrorKind.PredicateException,
          mkDefError,
        ),
      );
      expect(map).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledWith(one);
      expect(mkDef).toHaveBeenCalledTimes(1);
    });
  });

  describe("match", () => {
    it("calls `ok` callback and returns its result if self is `Ok`", () => {
      const self = ok(one);
      const okCallback = jest.fn(() => two);
      const errCallback = jest.fn(() => zero);
      const result = self.match(okCallback, errCallback);

      expect(result).toBe(two);
      expect(okCallback).toHaveBeenCalledTimes(1);
      expect(okCallback).toHaveBeenCalledWith(one);
      expect(errCallback).not.toHaveBeenCalled();
    });

    it.each([expectedErr, unexpectedErr])(
      "calls `err` callback and returns its result if self is `Err { %p }`",
      (e) => {
        const self = err(e);
        const okCallback = jest.fn(() => two);
        const errCallback = jest.fn(() => zero);
        const result = self.match(okCallback, errCallback);

        expect(result).toBe(zero);
        expect(errCallback).toHaveBeenCalledTimes(1);
        expect(errCallback).toHaveBeenCalledWith(e);
        expect(okCallback).not.toHaveBeenCalled();
      },
    );

    it("throws `ResultError` if `ok` callback throws", () => {
      const self = ok(one);
      const okCallback = jest.fn(() => {
        throw syncError;
      });
      const errCallback = jest.fn(() => zero);

      expect(() => self.match(okCallback, errCallback)).toThrow(
        new ResultError(
          "`match`: one of the predicates threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(okCallback).toHaveBeenCalledTimes(1);
      expect(errCallback).not.toHaveBeenCalled();
    });

    it("throws `ResultError` if `err` callback throws", () => {
      const self = err(expectedErr);
      const okCallback = jest.fn(() => two);
      const errCallback = jest.fn(() => {
        throw syncError;
      });

      expect(() => self.match(okCallback, errCallback)).toThrow(
        new ResultError(
          "`match`: one of the predicates threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(errCallback).toHaveBeenCalledTimes(1);
      expect(okCallback).not.toHaveBeenCalled();
    });
  });

  describe("ok", () => {
    it.each([one, Promise.resolve(two)])(
      "returns `Some` if self is `Ok { %s }`",
      (v) => {
        const self = ok(v);
        const result = self.ok();

        expect(result.isSome()).toBe(true);
        // @ts-expect-error -- for testing
        expect(result.unwrap()).toBe(v);
      },
    );

    it.each([expectedErr, unexpectedErr])(
      "returns `None` if self is `Err { %p }`",
      (e) => {
        const self = err(e);
        const result = self.ok();

        expect(result.isNone()).toBe(true);
      },
    );
  });

  describe("or", () => {
    it.each([one, Promise.resolve(two)])(
      "returns self if self is `Ok { %s }`",
      (v) => {
        const self = ok(v);
        const other = ok(one);
        const result = self.or(other);

        expect(result).not.toBe(self);
        // @ts-expect-error -- for testing
        expect(result.unwrap()).toBe(v);
      },
    );

    it.each([expectedErr, unexpectedErr])(
      "returns other if self is `Err { %p }`",
      (e) => {
        const self = err(e);
        const other = ok(one);
        const result = self.or(other);

        expect(result.isOk()).toBe(true);
        expect(result).toBe(other);
      },
    );
  });

  describe("orElse", () => {
    it.each([one, Promise.resolve(two)])(
      "returns self if self is `Ok { %s }`",
      (v) => {
        const self = ok(v);
        const other = ok(one);
        const callback = jest.fn(() => other);
        const result = self.orElse(callback);

        expect(result).not.toBe(self);
        // @ts-expect-error -- for testing
        expect(result.unwrap()).toBe(v);
        expect(callback).not.toHaveBeenCalled();
      },
    );

    it.each([expectedErr, unexpectedErr])(
      "returns result of provided callback if self is `Err { %p }`",
      (e) => {
        const self = err(e);
        const other = ok(one);
        const callback = jest.fn(() => other);
        const result = self.orElse(callback);

        expect(result.isOk()).toBe(true);
        expect(result).toBe(other);
        expect(callback).toHaveBeenCalledTimes(1);
      },
    );

    it("returns unexpected `Err` if self is `Err` and provided callback throws", () => {
      const self = err("error");
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.orElse(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`orElse`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
    });
  });

  describe("tap", () => {
    it.each([
      err<number, string>(expectedErr),
      err<number, string>(unexpectedErr),
      ok<number, string>(one),
    ])(
      "calls provided callback with a copy of the result and returns a copy of self if self is `%s`",
      (res) => {
        let capturedResult: Result<number, string> | null = null;
        const callback = jest.fn((r: Result<number, string>) => {
          capturedResult = r;
        });

        const result = res.tap(callback);

        expect(result).not.toBe(res); // Different reference
        expect(result.isOk()).toBe(res.isOk());
        if (result.isOk()) {
          expect(result.unwrap()).toBe(res.unwrap());
        } else {
          expect(result.unwrapErr()).toBe(res.unwrapErr());
        }
        expect(callback).toHaveBeenCalledTimes(1);
        expect(capturedResult).not.toBe(res); // Callback receives copy
        expect(capturedResult).toStrictEqual(res);
      },
    );

    it("does not throw and returns a copy of self if provided callback throws", () => {
      const self = ok(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn(() => {
        throw syncError;
      });

      const result = self.tap(callback);

      expect(result).not.toBe(self);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not throw and returns a copy of self if provided asynchronous callback rejects", () => {
      const self = ok(one);
      const spy = jest.spyOn(self, "copy");
      const callback = jest.fn(() => Promise.reject(asyncError));

      const result = self.tap(callback);

      expect(result).not.toBe(self);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("toPending", () => {
    it("returns `PendingResult` with self `Ok`", async () => {
      const value = { number: one };
      const self = ok(value);
      const spy = jest.spyOn(self, "copy");
      const result = self.toPending();

      expect(isPendingResult(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.unwrap()).toBe(value);
    });

    it("returns `PendingResult` with awaited self `Ok`", async () => {
      const value = Promise.resolve({ number: one });
      const self = ok(value);
      const spy = jest.spyOn(self, "copy");
      const result = self.toPending();

      expect(isPendingResult(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.unwrap()).not.toBe(value);
      expect(awaited.unwrap()).toBe(await value);
    });

    it("returns `PendingResult` with shallow copy of self `Err` if self is unexpected error", async () => {
      const errValue = new ResultError("oops", ResultErrorKind.Unexpected);
      const err_ = unexpectedError(errValue);
      const self = err(err_);
      const spy = jest.spyOn(self, "copy");
      const result = self.toPending();

      expect(isPendingResult(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.unwrapErr()).not.toBe(err_);
      expect(awaited.unwrapErr()).toStrictEqual(err_);
      expect(awaited.unwrapErr().unexpected).toBe(errValue);
      expect(awaited.unwrapErr().expected).toBeUndefined();
    });

    it("returns `PendingResult` with shallow copy of self `Err` if self is expected error", async () => {
      const errValue = { some: "problem" };
      const err_ = expectedError(errValue);
      const self = err(err_);
      const spy = jest.spyOn(self, "copy");
      const result = self.toPending();

      expect(isPendingResult(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.unwrapErr()).not.toBe(err_);
      expect(awaited.unwrapErr()).toStrictEqual(err_);
      expect(awaited.unwrapErr().expected).toBe(errValue);
      expect(awaited.unwrapErr().unexpected).toBeUndefined();
    });

    it("returns `PendingResult` with shallow copy of awaited self `Err` if self is expected error", async () => {
      const obj = { some: "problem" };
      const errValue = Promise.resolve(obj);
      const err_ = expectedError(errValue);
      const self = err(err_);
      const spy = jest.spyOn(self, "copy");
      const result = self.toPending();

      expect(isPendingResult(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.unwrapErr()).not.toBe(err_);
      expect(awaited.unwrapErr()).toStrictEqual(expectedError(obj));
      expect(awaited.unwrapErr().expected).toBe(obj);
      expect(awaited.unwrapErr().unexpected).toBeUndefined();
    });
  });

  describe("toPendingCloned", () => {
    it("returns a `PendingResult` that resolves to a clone of self if self is `Ok`", async () => {
      const counter = new Counter({ count: 42 });
      const self = ok<Counter, string>(counter);
      const result = self.toPendingCloned();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(self);
      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap()).not.toBe(counter); // Different value reference (cloned)
      expect(awaited.unwrap()).toStrictEqual(counter.clone());
      expect(awaited.unwrap().data).not.toBe(counter.data); // Different data reference (deep clone)
      expect(awaited.unwrap().data.count).toBe(0);
    });

    it("returns a `PendingResult` that resolves to a clone of self `Err` if self is unexpected error", async () => {
      const errValue = new ResultError("oops", ResultErrorKind.Unexpected);
      const err_ = unexpectedError<string>(errValue);
      const self = err<number, string>(err_);
      const result = self.toPendingCloned();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(self);
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).not.toBe(err_);
      expect(awaited.unwrapErr()).toStrictEqual(err_);
      expect(awaited.unwrapErr().unexpected).not.toBe(errValue); // different reference
      expect(awaited.unwrapErr().unexpected).toStrictEqual(errValue.clone());
      expect(awaited.unwrapErr().expected).toBeUndefined();
    });

    it("returns a `PendingResult` that resolves to a clone of self `Err` if self is expected error", async () => {
      const counter = new Counter({ count: 123 });
      const err_ = expectedError(counter);
      const self = err<number, Counter>(err_);
      const result = self.toPendingCloned();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(self);
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).not.toBe(err_);
      expect(awaited.unwrapErr()).not.toStrictEqual(err_);
      expect(awaited.unwrapErr()).toStrictEqual(expectedError(counter.clone()));
      expect(awaited.unwrapErr().unexpected).toBeUndefined();
      expect(awaited.unwrapErr().expected).not.toBe(counter); // different reference
      expect(awaited.unwrapErr().expected).toStrictEqual(counter.clone());
    });

    it("creates a clone that doesn't change when the original is modified", async () => {
      const counter = new Counter({ count: 42 });
      const self = ok<Counter, string>(counter);
      const result = self.toPendingCloned();

      // Modify original after cloning
      counter.data.count = 100;

      const awaited = await result;

      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap().data.count).toBe(0); // Cloned value still has original count
      expect(self.unwrap().data.count).toBe(100); // Original was updated
    });
  });

  describe("toString", () => {
    it("returns `Err { 1 }` if self is `Err(1)`", () => {
      const self = err(1);

      expect(self.toString()).toBe("Err { 1 }");
    });

    it(`returns 'Ok { ${one} }' if self is 'Ok(1)'`, () => {
      const self = ok(one);

      expect(self.toString()).toBe(`Ok { ${one} }`);
    });
  });

  describe("transpose", () => {
    it("returns `None` if self is `Ok { None }`", () => {
      const self = ok(none());
      const result = self.transpose();

      expect(result.isNone()).toBe(true);
    });

    it("returns `Some { Ok { value } }` if self is `Ok { Some { value } }`", () => {
      const self = ok(some(one));
      const result = self.transpose();

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toStrictEqual(ok(one));
      expect(result.unwrap().unwrap()).toBe(one);
    });

    it("returns `None` if self is `Ok`, but inner value is not an `Option`", () => {
      const self = ok(one);
      // @ts-expect-error -- for testing
      const result = self.transpose();

      expect(result.isNone()).toBe(true);
    });

    it.each([expectedErr, unexpectedErr])(
      "returns `Some { Err { %s } }` if self is `Err`",
      (e) => {
        const self: Result<Option<number>, string> = err(e);
        const result = self.transpose();

        expect(result.isSome()).toBe(true);
        expect(result.unwrap()).toStrictEqual(err(e));
        expect(result.unwrap().unwrapErr()).toStrictEqual(e);
      },
    );
  });

  describe("try", () => {
    it("returns `[true, undefined, T]` if self is `Ok`", () => {
      const self = ok(one);
      const result = self.try();

      expect(result).toStrictEqual([true, undefined, one]);
    });

    it.each([expectedErr, unexpectedErr])(
      "returns `[false, CheckedError<E>, undefined]` if self is `Err { %p }`",
      (e) => {
        const self = err(e);
        const result = self.try();

        expect(result).toStrictEqual([false, e, undefined]);
      },
    );
  });

  describe("unwrap", () => {
    it("returns inner `Ok` value if self is `Ok`", () => {
      const self = ok(one);
      const result = self.unwrap();

      expect(result).toBe(one);
    });

    it("throws `ResultError` if self is `Err`", () => {
      const self = err();

      expect(() => self.unwrap()).toThrow(
        new ResultError(
          "`unwrap`: called on `Err`",
          ResultErrorKind.UnwrapCalledOnErr,
        ),
      );
    });
  });

  describe("unwrapErr", () => {
    it("returns inner `Err` value (CheckedError) if inner error is expected or unexpected `Err`", () => {
      const self = err(expectedErr);
      const another = err(unexpectedErr);

      expect(self.unwrapErr()).toBe(expectedErr);
      expect(another.unwrapErr()).toBe(unexpectedErr);
    });

    it("throws `ResultError` if self is `Ok`", () => {
      const self = ok(one);

      expect(() => self.unwrapErr()).toThrow(
        new ResultError(
          "`unwrapErr`: called on `Ok`",
          ResultErrorKind.UnwrapErrCalledOnOk,
        ),
      );
    });
  });

  describe("unwrapOr", () => {
    it("returns inner `Ok` value if self is `Ok`", () => {
      const self = ok(one);
      const result = self.unwrapOr(two);

      expect(result).toBe(one);
    });

    it.each([expectedErr, unexpectedErr])(
      "returns provided default if self is `Err { %s }`",
      (e) => {
        const self = err(e);

        expect(self.unwrapOr(zero)).toBe(zero);
      },
    );
  });

  describe("unwrapOrElse", () => {
    it("does not call provided callback and returns inner `Ok` value if self is `Ok`", () => {
      const self = ok(one);
      const callback = jest.fn(() => two);
      const result = self.unwrapOrElse(callback);

      expect(result).toBe(one);
      expect(callback).not.toHaveBeenCalled();
    });

    it.each([expectedErr, unexpectedErr])(
      "returns result of provided callback if self is `Err { %s }`",
      (e) => {
        const self = err(e);
        const callback = jest.fn(() => two);
        const result = self.unwrapOrElse(callback);

        expect(result).toBe(two);
      },
    );

    it("rethrows `ResultError` if self is `Err` and provided callback throws", () => {
      const self = err();
      const callback = jest.fn(() => {
        throw syncError;
      });

      expect(() => self.unwrapOrElse(callback)).toThrow(
        new ResultError(
          "`unwrapOrElse`: callback `mkDef` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
