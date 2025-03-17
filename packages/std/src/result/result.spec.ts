import { Clone } from "../types";
import {
  expected,
  isCheckedError,
  ResultError,
  ResultErrorKind,
  unexpected,
} from "./error";
import { Err, Ok } from "./interface";
import { err, isPendingResult, ok, unsafeErr, unsafeOk } from "./result";

describe("Result", () => {
  const syncError = new Error("sync error");
  const errMsg = "err";
  const expectedErrMsg = "expected error happened";
  const unexpectedErrMsg = "unexpected error happened";
  const expectedErr = expected(expectedErrMsg);
  const unexpectedErr = unexpected<string>(
    unexpectedErrMsg,
    ResultErrorKind.Unexpected,
  );
  const one = 11;
  const two = 222;
  //   const zero = 0;

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
      expect(result.unwrapErr()).toStrictEqual(expected(errMsg));
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
      expect(result.unwrapErr()).toStrictEqual(expected(errMsg));
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
      expect(result.unwrapErr()).toStrictEqual(
        unexpected(
          "`andThen`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(self.unwrap());
    });
  });

  describe("clone", () => {
    it("returns `Err` with cloned `ResultError` if self is `Err` with unexpected error", () => {
      const self = err<number, string>(unexpectedErr);
      const cloned = self.clone();

      expect(cloned.isErr()).toBe(true);
      expect(cloned).not.toBe(self);
      expect(cloned.unwrapErr()).not.toBe(self.unwrapErr());
      expect(() => cloned.unwrap()).toThrow(ResultError);

      const error = cloned.unwrapErr();

      expect(error.expected).toBeUndefined();
      expect(error.unexpected).toBeInstanceOf(ResultError);
      expect(error.unexpected?.message).toBe(unexpectedErr.unexpected?.message);
      expect(error.unexpected?.kind).toBe(unexpectedErr.unexpected?.kind);
    });

    it("returns `Err` with deeply cloned `E` if self is `Err` with expected error", () => {
      const counter = new Counter({ count: 10 });
      const self = err<number, Counter>(expected(counter));
      const cloned = self.clone();

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
      const self = ok<Counter, string>(counter);
      const cloned = self.clone();

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

  describe("isErr", () => {
    it.each([
      [true, err<number, string>("err")],
      [false, ok<number, string>(one)],
    ])("returns '%p' if self is %s", (exp, result) => {
      expect(result.isErr()).toBe(exp);
    });

    it.each([
      [true, unsafeErr<number, string>("err")],
      [false, unsafeOk<number, string>(one)],
    ])("returns '%p' if self is unsafe %s", (exp, result) => {
      expect(result.isErr()).toBe(exp);
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
      const err_ = unexpected(errValue);
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
      const err_ = expected(errValue);
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
      const errValue = Promise.resolve({ some: "problem" });
      const err_ = expected(errValue);
      const self = err(err_);
      const spy = jest.spyOn(self, "copy");
      const result = self.toPending();

      expect(isPendingResult(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.unwrapErr()).not.toBe(err_);
      expect(awaited.unwrapErr()).toStrictEqual(err_);
      expect(awaited.unwrapErr().expected).toBe(await errValue);
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
      const err_ = unexpected<string>(errValue);
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
      const err_ = expected(counter);
      const self = err<number, Counter>(err_);
      const result = self.toPendingCloned();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(self);
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).not.toBe(err_);
      expect(awaited.unwrapErr()).toStrictEqual(err_);
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

  describe("toUnsafe", () => {
    it(`returns 'Ok' if self is 'Ok'`, () => {
      const self = ok(one);
      const result = self.toUnsafe();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(one);
    });

    it(`returns 'Err' if inner error is expected 'Err'`, () => {
      const self = err(expectedErr);
      const result = self.toUnsafe();

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(expectedErrMsg);
    });

    it(`throws 'ResultError' if inner error is unexpected 'Err'`, () => {
      const self = err(unexpectedErr);

      expect(() => self.toUnsafe()).toThrow(unexpectedErr.unexpected);
    });
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
    it("returns inner `Err` value (CheckedError) if inner error is safe `Err`", () => {
      const self = err(expectedErr);
      const another = err(unexpectedErr);

      expect(self.unwrapErr()).toBe(expectedErr);
      expect(another.unwrapErr()).toBe(unexpectedErr);
    });

    it("returns inner `Err` value (E) if inner error is `UnsafeErr`", () => {
      const self = unsafeErr(expectedErr);
      const another = unsafeErr(unexpectedErr);

      expect(self.unwrapErr()).toBe(expectedErr);
      expect(another.unwrapErr()).toBe(unexpectedErr);
    });

    // TODO(nikita.demin): figure out how to test this
    it.skip("throws `ResultError` if self is `UnsafeErr` and inner error is unexpected `Err`", () => {
      const self = err(unexpectedErr);

      expect(() => self.unwrapErr()).toThrow(
        new ResultError(
          "`unwrapErr`: called on `Ok`",
          ResultErrorKind.UnwrapErrCalledOnOk,
        ),
      );
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
});
