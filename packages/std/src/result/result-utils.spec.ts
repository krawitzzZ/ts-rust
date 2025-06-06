import { ResultError, expectedError, unexpectedError } from "./error";
import {
  PendingResult,
  Result,
  ResultErrorKind,
  err,
  isPendingResult,
  isResult,
  ok,
  pendingErr,
  pendingOk,
  pendingResult,
  run,
  runAsync,
  runPendingResult,
  runResult,
} from "./index";

describe("Result utils", () => {
  const values = [
    null,
    undefined,
    NaN,
    false,
    true,
    0,
    4,
    "hi",
    new Map([]),
    new Date(),
    [1, 2, 3],
  ];
  const oks = values.map(ok);
  const checkedErrors = [
    unexpectedError(new ResultError("oi", ResultErrorKind.ResultRejection)),
    expectedError("some error"),
  ];
  const resError = new ResultError("unexpected", ResultErrorKind.Unexpected);

  describe("ok", () => {
    it.each(values)("returns `Result` with `Ok { %s }` value", (value) => {
      const result = ok(value);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(value);
      expect(() => result.unwrapErr()).toThrow(ResultError);
    });
  });

  describe("err", () => {
    it.each(values)("returns `Result` with `Err { %p }` value", (value) => {
      const result = err(value);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().expected).toBe(value);
      expect(result.unwrapErr().unexpected).toBeUndefined();
      expect(() => result.unwrap()).toThrow(ResultError);
    });

    it.each(checkedErrors)(
      "returns `Result` with `CheckedError { %p }` value",
      (value) => {
        const result = err(value);

        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe(value);
        expect(() => result.unwrap()).toThrow(ResultError);
      },
    );

    it("returns `Result` with expected `Err` if called with `ResultError`", () => {
      const result = err(resError);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().unexpected).toBeUndefined();
      expect(result.unwrapErr().expected).toBe(resError);
      expect(() => result.unwrap()).toThrow(ResultError);
    });

    it("returns `Result` with void `Err` if called without arguments", () => {
      const result = err();

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().unexpected).toBeUndefined();
      expect(result.unwrapErr().expected).toBeUndefined();
      expect(() => result.unwrap()).toThrow(ResultError);
    });
  });

  describe("pendingOk", () => {
    it.each(values)(
      "returns `PendingResult` with `Ok { %s }` value",
      async (value) => {
        const result = pendingOk(value);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it.each(values.map((x) => Promise.resolve(x)))(
      "returns `PendingResult` with async `Ok { %s }` value",
      async (value) => {
        const result = pendingOk(value);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(await value);
      },
    );
  });

  describe("pendingErr", () => {
    it.each(values)(
      "returns `PendingResult` with `Err { %s }` value",
      async (value) => {
        const result = pendingErr(value);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr().expected).toBe(value);
      },
    );

    it.each(values.map((x) => Promise.resolve(x)))(
      "returns `PendingResult` with async `Err { %s }` value",
      async (value) => {
        const result = pendingErr(value);

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr().expected).toBe(await value);
      },
    );
  });

  describe("pendingResult", () => {
    it.each(values)(
      "returns `PendingResult` with `Ok { %s }` value",
      async (value) => {
        const result = pendingResult(ok(value));

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it.each(oks)(
      "returns `PendingResult` with `Ok { %s }` value if called with synchronous factory",
      async (value) => {
        const result = pendingResult(() => ok(value));

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it.each(oks)(
      "returns `PendingResult` with `Ok { %s }` value if called with asynchronous factory",
      async (value) => {
        const result = pendingResult(async () => ok(value));

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it.each(values)(
      "returns `PendingResult` with `Err { %s }` value",
      async (value) => {
        const result = pendingResult(err(value));

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr().expected).toBe(value);
        expect(awaited.unwrapErr().unexpected).toBeUndefined();
        expect(() => awaited.unwrap()).toThrow(ResultError);
      },
    );
  });

  describe("isResult", () => {
    it.each(oks)("returns true if called with %s", (result) => {
      expect(isResult(result)).toBe(true);
    });

    it.each([...oks.map(pendingResult), ...values])(
      "returns false if called with %s",
      (value) => {
        expect(isResult(value)).toBe(false);
      },
    );
  });

  describe("isPendingResult", () => {
    it.each(oks)(
      "returns true if called with `PendingOption { %s }`",
      (result) => {
        expect(isPendingResult(pendingResult(result))).toBe(true);
      },
    );

    it.each(oks)("returns false if called with %s", (result) => {
      expect(isPendingResult(result)).toBe(false);
    });
  });

  describe("run", () => {
    const runError = new Error("run error");

    it("returns ok", () => {
      const action = jest.fn(() => 1);
      const onError = jest.fn(() => runError);
      const res = run(action, onError);

      expect(res.isOk()).toBe(true);
      expect(res.unwrap()).toBe(1);
      expect(action).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it("does not throw and returns expected err", () => {
      const action = jest.fn(() => {
        throw new Error("oi");
      });
      const onError = jest.fn(() => runError);
      const res = run(action, onError);

      expect(res.isOk()).toBe(false);
      expect(res.unwrapErr().expected).toBe(runError);
      expect(action).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("does not throw and returns unexpected err if mkErr function throws", () => {
      const action = jest.fn(() => {
        throw new Error("oi");
      });
      const onError = jest.fn(() => {
        throw new Error("oops");
      });
      const res = run(action, onError);

      expect(res.isOk()).toBe(false);
      expect(res.unwrapErr().unexpected).toBeInstanceOf(ResultError);
      expect(res.unwrapErr().unexpected?.kind).toBe(
        ResultErrorKind.PredicateException,
      );
      expect(action).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("runAsync", () => {
    const runError = new Error("runAsync error");

    it("returns ok", async () => {
      const action = jest.fn(async () => 1);
      const onError = jest.fn(() => runError);
      const res = await runAsync(action, onError);

      expect(res.isOk()).toBe(true);
      expect(res.unwrap()).toBe(1);
      expect(action).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it("does not throw and returns expected err", async () => {
      const action = jest.fn(() => {
        throw new Error("oi");
      });
      const onError = jest.fn(() => runError);
      const res = await runAsync(action, onError);

      expect(res.isOk()).toBe(false);
      expect(res.unwrapErr().expected).toBe(runError);
      expect(action).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("does not throw and returns unexpected err if mkErr function throws", async () => {
      const action = jest.fn(() => {
        throw new Error("oi");
      });
      const onError = jest.fn(() => {
        throw new Error("oops");
      });
      const res = await runAsync(action, onError);

      expect(res.isOk()).toBe(false);
      expect(res.unwrapErr().unexpected).toBeInstanceOf(ResultError);
      expect(res.unwrapErr().unexpected?.kind).toBe(
        ResultErrorKind.PredicateException,
      );
      expect(action).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe("runResult", () => {
    it.each([ok<number, string>(1), err<number, string>("oi")])(
      "returns %s",
      (result) => {
        const getResult = jest.fn(() => result);
        const res = runResult(getResult);

        expect(res.isOk()).toBe(result.isOk());
        expect(res.isErr()).toBe(result.isErr());
        expect(getResult).toHaveBeenCalledTimes(1);
      },
    );

    it("does not throw and returns unexpected err if `getResult` function throws", () => {
      const getResult: () => Result<number, string> = jest.fn(() => {
        throw new Error("oi");
      });
      const res = runResult(getResult);

      expect(res.isErr()).toBe(true);
      expect(res.unwrapErr().unexpected).toBeInstanceOf(ResultError);
      expect(res.unwrapErr().unexpected?.kind).toBe(ResultErrorKind.Unexpected);
      expect(getResult).toHaveBeenCalledTimes(1);
    });
  });

  describe("runPendingResult", () => {
    it.each([
      ok<number, string>(1),
      err<number, string>("oi"),
      pendingOk<number, string>(1),
      pendingErr<number, string>("oi"),
      Promise.resolve(ok<number, string>(1)),
      Promise.resolve(err<number, string>("oi")),
    ])("returns awaited %s", async (result) => {
      const getResult = jest.fn(() => result);
      const res = runPendingResult(getResult);

      expect(isPendingResult(res)).toBe(true);
      expect(getResult).toHaveBeenCalledTimes(1);

      const awaited = await res;
      const awaitedExpected = await result;

      expect(awaited.isOk()).toBe(awaitedExpected.isOk());
      expect(awaited.isErr()).toBe(awaitedExpected.isErr());
    });

    it("does not throw and returns unexpected err if `getResult` function throws", async () => {
      const getResult: () => PendingResult<number, string> = jest.fn(() => {
        throw new Error("oi");
      });
      const res = runPendingResult(getResult);

      expect(isPendingResult(res)).toBe(true);
      expect(getResult).toHaveBeenCalledTimes(1);

      const awaited = await res;

      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr().isUnexpected()).toBe(true);
      expect(awaited.unwrapErr().unexpected?.kind).toBe(
        ResultErrorKind.Unexpected,
      );
    });
  });
});
