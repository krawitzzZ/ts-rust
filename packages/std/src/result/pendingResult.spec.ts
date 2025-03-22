import { isPendingOption } from "../option";
import { expectedError, ResultError, unexpectedError } from "./error";
import {
  Result,
  err,
  isPendingResult,
  ok,
  pendingResult,
  ResultErrorKind,
  pendingOk,
  pendingErr,
  PendingResult,
} from "./index";

describe("PendingResult", () => {
  const syncError = new Error("sync error");
  const asyncError = new Error("async error");
  const _errMsg = "err";
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
  const _syncErrorCallback =
    <T = Result<number, string>>(e?: Error) =>
    (): T => {
      throw e ?? new Error("sync error");
    };
  const _asyncErrorCallback =
    <T = Result<number, string>>(e?: Error) =>
    (): Promise<T> =>
      Promise.reject(e ?? new Error("async error"));
  const _rejectedPromise = <T = Result<number, string>>(
    e?: Error,
  ): Promise<T> => Promise.reject(e ?? new Error("async error"));

  describe("then", () => {
    it("calls provided `onSuccess` callback with inner `Ok` if self resolves", async () => {
      const inner = ok(one);
      const pending = pendingResult(inner);
      const onSuccess = jest.fn();
      const onError = jest.fn();

      await pending.then(onSuccess, onError);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(inner);
      expect(onError).not.toHaveBeenCalled();
    });

    it("calls provided `onSuccess` callback with inner `Err` if self resolves", async () => {
      const inner = err(one);
      const pending = pendingResult(inner);
      const onSuccess = jest.fn();
      const onError = jest.fn();

      await pending.then(onSuccess, onError);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(inner);
      expect(onError).not.toHaveBeenCalled();
    });

    it("calls provided `onError` callback if self rejects (which is only possible if typescript is hijacked)", async () => {
      let errorCaught = false;
      const error = new Error("error");
      // @ts-expect-error -- for testing
      const failure = Promise.resolve<Result<number, string>>(null);
      const catchSpy = jest
        .spyOn(failure, "catch")
        .mockImplementationOnce(() => Promise.reject(error));
      const pending = pendingResult(failure);
      const onSuccess = jest.fn();
      const onError = jest.fn((): Result<number, string> => {
        errorCaught = true;
        return ok(two);
      });

      const result = await pending.then(onSuccess, onError);

      expect(errorCaught).toBe(true);
      expect(result.unwrap()).toBe(two);
      expect(catchSpy).toHaveBeenCalledTimes(1);
      expect(catchSpy).toHaveBeenCalledWith(expect.any(Function));
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("catch", () => {
    it("calls provided callback if self rejects (which is only possible if typescript is hijacked)", async () => {
      let errorCaught = false;
      const error = new Error("error");
      // @ts-expect-error -- for testing
      const failure = Promise.resolve<Result<number, string>>(null);
      const catchSpy = jest
        .spyOn(failure, "catch")
        .mockImplementationOnce(() => Promise.reject(error));
      const pending = pendingResult(failure);
      const onError = jest.fn((): Result<number, string> => {
        errorCaught = true;
        return ok(two);
      });

      const result = await pending.catch(onError);

      expect(errorCaught).toBe(true);
      expect(result.unwrap()).toBe(two);
      expect(catchSpy).toHaveBeenCalledTimes(1);
      expect(catchSpy).toHaveBeenCalledWith(expect.any(Function));
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("and", () => {
    it.each([expectedErr, unexpectedErr])(
      "returns `Err` value of self if self is  `Err { %p }`",
      async (e) => {
        const res = err<number, string>(e);
        const self = pendingResult(res);
        const other = ok<number, string>(two);
        const result = self.and(other);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr()).toStrictEqual(e);
      },
    );

    it.each([expectedErr, unexpectedErr])(
      "does not await for provided promise and returns `Err` value of self if self is `Err { %p }`",
      async (e) => {
        const res = err<number, string>(e);
        const self = pendingResult(res);
        const other = Promise.resolve(ok<number, string>(two));
        const spy = jest.spyOn(other, "then");
        const result = self.and(other);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr()).toStrictEqual(e);
        expect(awaited.unwrapErr().expected).toStrictEqual(e.expected);
        expect(awaited.unwrapErr().unexpected).toStrictEqual(e.unexpected);
        expect(spy).not.toHaveBeenCalled();
      },
    );

    it("returns provided result if self is `Ok`", async () => {
      const res = ok<number, string>(one);
      const self = pendingResult(res);
      const other = Promise.resolve(ok<number, string>(two));
      const spy = jest.spyOn(other, "then");
      const result = self.and(other);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap()).toBe(two);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("andThen", () => {
    it.each([expectedErr, unexpectedErr])(
      "does not call provided callback and returns err value of self if self is `Err { %p }`",
      async (e) => {
        const res = err<number, string>(e);
        const self = pendingResult(res);
        const callback = jest.fn(() => ok<number, string>(two));
        const result = self.andThen(callback);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr()).toStrictEqual(e);
        expect(awaited.unwrapErr().expected).toStrictEqual(e.expected);
        expect(awaited.unwrapErr().unexpected).toStrictEqual(e.unexpected);
        expect(callback).not.toHaveBeenCalled();
      },
    );

    it("calls provided callback and returns its result if self is `Ok`", async () => {
      const res = ok<number, string>(one);
      const self = pendingResult(res);
      const callback = jest.fn(() => ok<number, string>(two));
      const result = self.andThen(callback);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap()).toStrictEqual(two);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("calls provided callback and returns unexpected `Err` if self is `Ok` and provided callback throws", async () => {
      const res = ok<number, string>(one);
      const self = pendingResult(res);
      const callback = jest.fn(() => {
        throw syncError;
      });
      const result = self.andThen(callback);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr().unexpected).toStrictEqual(
        new ResultError(
          "`andThen`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("calls provided callback and returns unexpected `Err` if self is `Ok` and result of provided callback rejects", async () => {
      const res = ok<number, string>(one);
      const self = pendingResult(res);
      const callback = jest.fn(() => Promise.reject(asyncError));
      const result = self.andThen(callback);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr().unexpected).toStrictEqual(
        new ResultError(
          "`andThen`: promise returned by provided callback `f` rejected",
          ResultErrorKind.ResultRejection,
          asyncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("check", () => {
    it.each([ok(one), Promise.resolve(ok(two))])(
      "returns a promise that resolves to `[true, Awaited<T>]` if inner result resolves to `Ok { %s }`",
      async (opt) => {
        const self = pendingOk(opt);
        const result = self.check();

        expect(result).toBeInstanceOf(Promise);

        const awaited = await result;

        expect(awaited).toStrictEqual([true, await opt]);
      },
    );

    it.each([
      expectedErr,
      unexpectedErr,
      Promise.resolve(expectedErr),
      Promise.resolve(unexpectedErr),
    ])(
      "returns a promise that resolves to `[false, CheckedError<Awaited<E>>]` if inner result resolves to `Err { %p }`",
      async (opt) => {
        const self = pendingErr(opt);
        const result = self.check();

        expect(result).toBeInstanceOf(Promise);

        const awaited = await result;

        expect(awaited).toStrictEqual([false, await opt]);
      },
    );

    it("returns a promise that resolves to `[false, CheckedError<Awaited<E>>]` if inner result rejects", async () => {
      const self = pendingResult(Promise.reject(syncError));
      const result = self.check();

      expect(result).toBeInstanceOf(Promise);

      const awaited = await result;

      expect(awaited).toStrictEqual([
        false,
        unexpectedError(
          "Pending result rejected unexpectedly",
          ResultErrorKind.ResultRejection,
          syncError,
        ),
      ]);
    });
  });

  describe("err", () => {
    it("returns `PendingOption` that resolves to `None` if self resolves to `Ok`", async () => {
      const self = pendingOk(one);
      const result = self.err();

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
    });

    it("returns `PendingOption` that resolves to `None` if self resolves to unexpected `Err`", async () => {
      const self = pendingErr(unexpectedErr);
      const result = self.err();

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
    });

    it("returns `PendingOption` that resolves to `None` if self resolves to expected `Err`", async () => {
      const self = pendingErr(expectedErr);
      const result = self.err();

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap()).toBe(expectedErr.expected);
    });
  });

  describe("flatten", () => {
    it("returns `PendingResult` that resolves to `Err` if self resolves to `Err`", async () => {
      const self: PendingResult<Result<number, string>, string> = pendingErr(
        expectedErr,
      );
      const result = self.flatten();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).toStrictEqual(expectedErr);
    });

    it("returns `PendingResult` that resolves to unexpected `Err` if self resolves to `Ok`, but its value is not a `Result`", async () => {
      // @ts-expect-error -- for testing
      const self: PendingResult<Result<number, string>, string> = pendingOk(
        one,
      );
      const result = self.flatten();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr().expected).toBeUndefined();
      expect(awaited.unwrapErr().unexpected).toStrictEqual(
        new ResultError(
          "`flatten`: called on `Ok` with non-result value",
          ResultErrorKind.FlattenCalledOnFlatResult,
        ),
      );
    });

    it.each([
      err<number, string>(unexpectedErr),
      err<number, string>(expectedErr),
      ok<number, string>(one),
      Promise.resolve(err<number, string>(unexpectedErr)),
      Promise.resolve(err<number, string>(expectedErr)),
      Promise.resolve(ok<number, string>(one)),
    ])(
      "returns `PendingResult` that resolves to awaited inner `Result` if self resolves to `Result<Result<T, E>, E>`",
      async (inner) => {
        const self = pendingOk(inner);
        const result = self.flatten();

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;
        const awaitedInner = await inner;

        expect(awaited.isOk()).toBe(awaitedInner.isOk());

        if (awaitedInner.isErr()) {
          expect(awaited.unwrapErr()).toStrictEqual(awaitedInner.unwrapErr());
        }
        if (awaitedInner.isOk()) {
          expect(awaited.unwrap()).toStrictEqual(awaitedInner.unwrap());
        }
      },
    );
  });

  describe("inspect", () => {
    it("calls `inspect` on inner `Option` and returns its result", async () => {
      const inner = ok(one);
      const inspectResult = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn();
      const inspectSpy = jest
        .spyOn(inner, "inspect")
        .mockReturnValueOnce(inspectResult);
      const result = self.inspect(callback);

      expect(result).not.toBe(self);
      expect(inspectSpy).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).toBe(inspectResult);
      expect(awaited.unwrap()).toBe(one);
      expect(inspectSpy).toHaveBeenCalledTimes(1);
    });

    it("does not throw/reject if inner result promise rejects", async () => {
      const self = pendingResult(Promise.reject(asyncError));
      const callback = jest.fn();
      const result = self.inspect(callback);

      expect(result).not.toBe(self);

      const awaited = await result;
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "Pending result rejected unexpectedly",
          ResultErrorKind.ResultRejection,
          asyncError,
        ),
      );
    });
  });

  describe("match", () => {
    it("calls `ok` callback and returns its result if self is `Ok`", async () => {
      const self = pendingOk(one);
      const okCallback = jest.fn(() => two);
      const errCallback = jest.fn(() => zero);
      const result = self.match(okCallback, errCallback);

      expect(result).toBeInstanceOf(Promise);

      const awaited = await result;

      expect(awaited).toBe(two);
      expect(okCallback).toHaveBeenCalledTimes(1);
      expect(okCallback).toHaveBeenCalledWith(one);
      expect(errCallback).not.toHaveBeenCalled();
    });

    it.each([expectedErr, unexpectedErr])(
      "calls `err` callback and returns its result if self is `Err { %p }`",
      async (e) => {
        const self = pendingErr(e);
        const okCallback = jest.fn(() => two);
        const errCallback = jest.fn(() => zero);
        const result = self.match(okCallback, errCallback);

        expect(result).toBeInstanceOf(Promise);

        const awaited = await result;

        expect(awaited).toBe(zero);
        expect(errCallback).toHaveBeenCalledTimes(1);
        expect(errCallback).toHaveBeenCalledWith(e);
        expect(okCallback).not.toHaveBeenCalled();
      },
    );

    it("returns a promise that rejects if provided callback throws", async () => {
      const self = pendingOk(one);
      const okCallback = jest.fn(() => {
        throw syncError;
      });
      const errCallback = jest.fn(() => zero);
      const result = self.match(okCallback, errCallback);

      expect(result).toBeInstanceOf(Promise);

      await expect(result).rejects.toThrow(syncError);
      expect(okCallback).toHaveBeenCalledTimes(1);
      expect(okCallback).toHaveBeenCalledWith(one);
      expect(errCallback).not.toHaveBeenCalled();
    });

    it("returns a promise that rejects if provided callback returns a promise that rejects", async () => {
      const self = pendingOk(one);
      const okCallback = jest.fn(() => Promise.reject(asyncError));
      const errCallback = jest.fn(() => zero);
      const result = self.match(okCallback, errCallback);

      expect(result).toBeInstanceOf(Promise);

      await expect(result).rejects.toThrow(asyncError);
      expect(okCallback).toHaveBeenCalledTimes(1);
      expect(okCallback).toHaveBeenCalledWith(one);
      expect(errCallback).not.toHaveBeenCalled();
    });
  });

  describe("try", () => {
    it("returns a promise that resolves `[true, undefined, T]` if self resolves to `Ok`", async () => {
      const self = pendingOk(one);
      const result = self.try();

      expect(result).toBeInstanceOf(Promise);

      const awaited = await result;

      expect(awaited).toStrictEqual([true, undefined, one]);
    });

    it.each([expectedErr, unexpectedErr])(
      "returns a promise that resolves `[false, CheckedError<E>, undefined]` if self resolves `Err { %p }`",
      async (e) => {
        const self = pendingErr(e);
        const result = self.try();

        expect(result).toBeInstanceOf(Promise);

        const awaited = await result;

        expect(awaited).toStrictEqual([false, e, undefined]);
      },
    );

    it("returns a promise that resolves `[false, CheckedError<E>, undefined]` if self rejects", async () => {
      const self = pendingOk(Promise.reject(asyncError));
      const result = self.try();

      expect(result).toBeInstanceOf(Promise);

      const awaited = await result;

      expect(awaited).toStrictEqual([
        false,
        unexpectedError(
          "Pending result rejected unexpectedly",
          ResultErrorKind.ResultRejection,
          asyncError,
        ),
        undefined,
      ]);
    });
  });
});
