import {
  expectedError,
  ResultError,
  ResultErrorKind,
  unexpectedError,
} from "./error";
import {
  err,
  isPendingResult,
  isResult,
  ok,
  pendingErr,
  pendingOk,
  pendingResult,
  unsafeErr,
  unsafeOk,
} from "./result";

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

  describe("unsafeOk", () => {
    it.each(values)(
      "returns `UnsafeResult` with `Ok { %s }` value",
      (value) => {
        const result = unsafeOk(value);

        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(value);
        expect(() => result.unwrapErr()).toThrow(ResultError);
      },
    );
  });

  describe("unsafeErr", () => {
    it.each([...values, ...checkedErrors])(
      "returns `UnsafeResult` with `UnsafeErr { %p }` value",
      (value) => {
        const result = unsafeErr(value);

        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe(value);
        expect(() => result.unwrap()).toThrow(ResultError);
      },
    );
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
});
