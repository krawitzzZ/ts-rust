import { ResultError } from "./error";
import { err, isPendingResult, isResult, ok, pendingResult } from "./result";

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

  describe("ok", () => {
    it.each(values)("returns `Result` with `Ok { %p }` value", (value) => {
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
  });

  describe("pendingResult", () => {
    it.each(values)(
      "returns `PendingResult` with `Ok { %p }` value",
      async (value) => {
        const result = pendingResult(ok(value));

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it.each(oks)(
      "returns `PendingResult` with `Ok { %p }` value if called with synchronous factory",
      async (value) => {
        const result = pendingResult(() => ok(value));

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it.each(oks)(
      "returns `PendingResult` with `Ok { %p }` value if called with asynchronous factory",
      async (value) => {
        const result = pendingResult(async () => ok(value));

        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isOk()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it.each(values)(
      "returns `PendingResult` with `Err { %p }` value",
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
