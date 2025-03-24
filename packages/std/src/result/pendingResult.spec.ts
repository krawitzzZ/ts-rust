import { isPendingOption, Option, some } from "../option";
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
  const syncErrorCallback =
    <T = Result<number, string>>(e?: Error) =>
    (): T => {
      throw e ?? new Error("sync error");
    };
  const asyncErrorCallback =
    <T = Result<number, string>>(e?: Error) =>
    (): Promise<T> =>
      Promise.reject(e ?? asyncError);
  const rejectedPromise = <T = Result<number, string>>(e?: Error): Promise<T> =>
    Promise.reject(e ?? asyncError);

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
    it("calls `inspect` on inner `Result` and returns its result", async () => {
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

  describe("inspectErr", () => {
    it("calls `inspect` on inner `Result` and returns its result", async () => {
      const inner = err(one);
      const inspectResult = err(one);
      const self = pendingResult(inner);
      const callback = jest.fn();
      const inspectSpy = jest
        .spyOn(inner, "inspectErr")
        .mockReturnValueOnce(inspectResult);
      const result = self.inspectErr(callback);

      expect(result).not.toBe(self);
      expect(inspectSpy).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).toBe(inspectResult);
      expect(awaited.unwrapErr()).toStrictEqual(expectedError(one));
      expect(inspectSpy).toHaveBeenCalledTimes(1);
    });

    it("does not throw/reject if inner result promise rejects", async () => {
      const self = pendingResult(Promise.reject(asyncError));
      const callback = jest.fn();
      const result = self.inspectErr(callback);

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

  describe("iter", () => {
    it("returns an iterator that yields nothing if self resolves to `Err`", async () => {
      const self = pendingErr(expectedErr);
      const iter = self.iter();

      expect(await iter.next()).toStrictEqual({ done: true });
      expect(await iter.next()).toStrictEqual({ done: true });
    });

    it.each([one, true, { a: 2 }])(
      "returns an iterator that yields '%s' only once if self resolves to `Ok`",
      async (v) => {
        const self = pendingOk(v);
        const iter = self.iter();

        expect(await iter.next()).toStrictEqual({ done: false, value: v });
        expect(await iter.next()).toStrictEqual({ done: true });
        expect(await iter.next()).toStrictEqual({ done: true });
      },
    );

    it.each([pendingOk(one), pendingErr(expectedErr)])(
      "works with await for .. of loop",
      async (opt) => {
        const iter = opt.iter();

        for await (const x of iter) {
          expect(x).toBe(one);
        }

        expect.assertions((await opt).isOk() ? 1 : 0);
      },
    );
  });

  describe("map", () => {
    it.each([expectedErr, unexpectedErr])(
      "does not call provided callback and returns self `Err` if self is `Err { %p }`",
      async (e) => {
        const inner = err(e);
        const self = pendingResult(inner);
        const callback = jest.fn();
        const result = self.map(callback);

        expect(result).not.toBe(self);

        const awaited = await result;

        expect(awaited).not.toBe(inner);
        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr()).toStrictEqual(e);
        expect(callback).not.toHaveBeenCalled();
      },
    );

    it.each([two, Promise.resolve(two)])(
      "calls provided callback and returns `Ok` with its (awaited) result '%O' if self is `Ok`",
      async (mapped) => {
        const inner = ok(one);
        const self = pendingResult(inner);
        const callback = jest.fn(() => mapped);
        const result = self.map(callback);

        expect(result).not.toBe(self);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(await mapped);
        expect(awaited).not.toBe(inner);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(one);
      },
    );

    it("calls provided callback and returns unexpected `Err` if self is `Ok` and provided callback throws an exception", async () => {
      const inner = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn(syncErrorCallback());
      const result = self.map(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`map`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("calls provided callback and returns unexpected `Err` if self is `Ok` and provided callback rejects with an exception", async () => {
      const inner = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn(asyncErrorCallback());
      const result = self.map(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`map`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          asyncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("mapAll", () => {
    it("calls provided callback with inner `Result` once resolved and returns its result", async () => {
      const inner = ok(one);
      const mapped = ok(two);
      const self = pendingResult(inner);
      const callback = jest.fn(() => mapped);

      const result = self.mapAll(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).not.toBe(mapped);
      expect(awaited).toStrictEqual(mapped);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(inner);
    });

    it("calls provided callback with unexpected `Err` if self rejects", async () => {
      const mapped = ok(two);
      const self = pendingResult(rejectedPromise<Result<number, string>>());
      const callback = jest.fn(() => mapped);

      const result = self.mapAll(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).not.toBe(mapped);
      expect(awaited).toStrictEqual(mapped);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        err(
          unexpectedError(
            "Pending result rejected unexpectedly",
            ResultErrorKind.ResultRejection,
            asyncError,
          ),
        ),
      );
    });

    it("returns unexpected `Err` if provided callback throws", async () => {
      const inner = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn(syncErrorCallback());

      const result = self.mapAll(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "Pending result rejected unexpectedly",
          ResultErrorKind.ResultRejection,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(inner);
    });

    it("supports asynchronous callbacks and returns the awaited result", async () => {
      const inner = ok(one);
      const mapped = ok(two);
      const self = pendingResult(inner);
      const callback = jest.fn(() => Promise.resolve(mapped));

      const result = self.mapAll(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).not.toBe(mapped);
      expect(awaited).toStrictEqual(mapped);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(inner);
    });

    it("returns unexpected `Err` if provided asynchronous callback rejects", async () => {
      const inner = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn(() => rejectedPromise());

      const result = self.mapAll(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

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
      expect(callback).toHaveBeenCalledWith(inner);
    });
  });

  describe("mapErr", () => {
    it("does not call provided callback and returns self `Ok` if self is `Ok`", async () => {
      const inner = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn();
      const result = self.mapErr(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).not.toHaveBeenCalled();
    });

    it("does not call provided callback and returns self `Err` if self is unexpected `Err`", async () => {
      const inner = err(unexpectedErr);
      const self = pendingResult(inner);
      const callback = jest.fn();
      const result = self.mapErr(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr().unexpected).toBe(unexpectedErr.unexpected);
      expect(callback).not.toHaveBeenCalled();
    });

    it.each([two, Promise.resolve(two)])(
      "calls provided callback and returns `Err` with its (awaited) result '%O' if self is expected `Err`",
      async (mapped) => {
        const inner = err(expectedErr);
        const self = pendingResult(inner);
        const callback = jest.fn(() => mapped);
        const result = self.mapErr(callback);

        expect(result).not.toBe(self);

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr().expected).toBe(await mapped);
        expect(awaited).not.toBe(inner);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(expectedErr.expected);
      },
    );

    it("calls provided callback and returns unexpected `Err` if self is expected `Err` and provided callback throws an exception", async () => {
      const inner = err(expectedErr);
      const self = pendingResult(inner);
      const callback = jest.fn(syncErrorCallback());
      const result = self.mapErr(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`mapErr`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedErr.expected);
    });

    it("calls provided callback and returns unexpected `Err` if self is expected `Err` and provided callback rejects with an exception", async () => {
      const inner = err(expectedErr);
      const self = pendingResult(inner);
      const callback = jest.fn(asyncErrorCallback());
      const result = self.mapErr(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`mapErr`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          asyncError,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedErr.expected);
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

  describe("or", () => {
    it("returns self if self is `Ok`", async () => {
      const inner = ok(one);
      const other = ok(two);
      const self = pendingResult(inner);
      const result = self.or(other);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.unwrap()).toBe(inner.unwrap());
    });

    it("does not await for provided promise and returns self if self is `Ok`", async () => {
      const inner = ok(one);
      const other = Promise.resolve(ok(two));
      const spy = jest.spyOn(other, "then");
      const self = pendingResult(inner);
      const result = self.or(other);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.unwrap()).toBe(inner.unwrap());
      expect(spy).not.toHaveBeenCalled();
    });

    it("returns other if self is `Err`", async () => {
      const msg = "nope";
      const inner = err(msg);
      const other = ok(two);
      const self = pendingResult(inner);
      const result = self.or(other);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.unwrap()).toBe(other.unwrap());
    });

    it("returns unexpected `Err` if self is `Err` and provided promise with result rejects", async () => {
      const inner = err("nope");
      const other = Promise.reject(asyncError);
      const self = pendingResult(inner);
      const result = self.or(other);

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
    });
  });

  describe("orElse", () => {
    it("does not call provided callback and returns shallow copy of self if self is `Ok`", async () => {
      const inner = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn();
      const result = self.orElse(callback);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).not.toHaveBeenCalled();
    });

    it.each([ok(two), Promise.resolve(ok(two))])(
      "calls provided callback and returns its (awaited) result `%O` if self is `Err`",
      async (other) => {
        const inner = err("nope");
        const self = pendingResult(inner);
        const callback = jest.fn(() => other);
        const result = self.orElse(callback);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited).not.toBe(inner);
        expect(awaited.unwrap()).toBe((await other).unwrap());
        expect(callback).toHaveBeenCalledTimes(1);
      },
    );

    it("return unexpected `Err` if self is `Err` and provided callback throws an exception", async () => {
      const inner = err("oops");
      const self = pendingResult(inner);
      const callback = jest.fn(syncErrorCallback());
      const result = self.orElse(callback);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isErr()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "`orElse`: callback `f` threw an exception",
          ResultErrorKind.PredicateException,
          syncError,
        ),
      );
    });

    it("return unexpected `Err` if self is `Err` and promise returned by provided callback rejects", async () => {
      const inner = err("oops");
      const self = pendingResult(inner);
      const callback = jest.fn(asyncErrorCallback());
      const result = self.orElse(callback);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isErr()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(awaited.unwrapErr()).toStrictEqual(
        unexpectedError(
          "Pending result rejected unexpectedly",
          ResultErrorKind.ResultRejection,
          asyncError,
        ),
      );
    });
  });

  describe("tap", () => {
    it("calls provided callback with copy of inner `Result` once resolved", async () => {
      const inner = ok<number, string>(one);
      const spy = jest.spyOn(inner, "copy");
      const self = pendingResult(inner);
      let capturedResult: Result<number, string> = err("oops");
      const callback = jest.fn((r: Result<number, string>) => {
        capturedResult = r;
      });

      const result = self.tap(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(capturedResult.isOk()).toBe(true);
      expect(capturedResult).not.toBe(inner);
      expect(capturedResult.unwrap()).toBe(one);
    });

    it("calls provided callback with `Err` if self rejects", async () => {
      const self = pendingResult(rejectedPromise());
      let capturedResult: Result<number, string> = ok(zero);
      const callback = jest.fn((r: Result<number, string>) => {
        capturedResult = r;
      });

      const result = self.tap(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

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
      expect(capturedResult.isErr()).toBe(true);
    });

    it("ignores errors thrown by the callback and returns a copy of the resolved result", async () => {
      const inner = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn(() => {
        throw syncError;
      });

      const result = self.tap(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("ignores rejections in callback's returned Promise", async () => {
      const inner = ok(one);
      const self = pendingResult(inner);
      const callback = jest.fn(() => Promise.reject(asyncError));

      const result = self.tap(callback);

      expect(isPendingResult(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("transpose", () => {
    it("calls `transpose` on inner `Result` and returns its result", async () => {
      const inner = ok(some(one));
      const transposed = some(ok(one));
      const self = pendingResult(inner);
      const spy = jest
        .spyOn(inner, "transpose")
        .mockReturnValueOnce(transposed);
      const result = self.transpose();

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap()).toStrictEqual(ok(one));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("returns `PendingOption` that resolves to `Ok(Err(unexpected error))` if self rejects", async () => {
      const self: PendingResult<Option<number>, string> = pendingResult(
        Promise.reject(asyncError),
      );
      const result = self.transpose();

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap().unwrapErr()).toStrictEqual(
        unexpectedError(
          "Pending result rejected unexpectedly",
          ResultErrorKind.ResultRejection,
          asyncError,
        ),
      );
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
