import { LazyPromise } from "./lazyPromise";
import {
  cloneError,
  isLazyPromise,
  isPromise,
  toLazyPromise,
  toPromise,
} from "./utils";

describe("utils", () => {
  describe("isPromise", () => {
    it.each([
      [Promise.resolve(), false],
      [Promise.resolve(1), false],
      [Promise.reject(true), true],
      [Promise.reject(1), true],
      [new Promise((res) => res(true)), false],
      [new Promise((_, rej) => rej(true)), true],
      [LazyPromise.resolve(1), false],
      [LazyPromise.reject(1), true],
    ])("returns true", async (p, rejects) => {
      expect(isPromise(p)).toBe(true);

      if (rejects) {
        await expect(p).rejects.toEqual(expect.anything());
      }
    });

    it.each([
      null,
      undefined,
      NaN,
      true,
      false,
      () => {},
      {},
      [],
      1,
      "",
      new Date(),
      new Error(),
    ])("returns false if called with '%p'", async (p) => {
      expect(isPromise(p)).toBe(false);
    });
  });

  describe("isLazyPromise", () => {
    it.each([
      [LazyPromise.resolve(1), false],
      [LazyPromise.reject(1), true],
    ])("returns true", async (p, rejects) => {
      expect(isLazyPromise(p)).toBe(true);

      if (rejects) {
        await expect(p).rejects.toEqual(expect.anything());
      }
    });

    it.each([
      null,
      undefined,
      NaN,
      true,
      false,
      () => {},
      {},
      [],
      1,
      "",
      new Date(),
      new Error(),
      Promise.resolve(1),
    ])("returns false if called with '%p'", async (p) => {
      expect(isLazyPromise(p)).toBe(false);
    });
  });

  describe("toPromise", () => {
    it("returns the same promise if called with promise", async () => {
      const p = Promise.resolve(1);
      expect(toPromise(p)).toBe(p);
      const rp = Promise.reject(1);
      expect(toPromise(rp)).toBe(rp);
      await expect(rp).rejects.toBe(1);
    });

    it.each([
      null,
      false,
      NaN,
      true,
      false,
      "",
      "wow",
      1,
      2,
      321,
      {},
      [],
      new Error("o"),
      new Date(),
    ])("returns promise that resolves to '%p'", async (value) => {
      const p = toPromise(value);

      expect(p).toBeInstanceOf(Promise);
      expect(await p).toBe(value);
    });
  });

  describe("toLazyPromise", () => {
    it("returns the same promise if called with promise", async () => {
      const p = LazyPromise.resolve(1);
      expect(toLazyPromise(p)).toBe(p);
      const rp = LazyPromise.reject(1);
      expect(toLazyPromise(rp)).toBe(rp);
      await expect(rp).rejects.toBe(1);
    });

    it.each([
      null,
      false,
      NaN,
      true,
      false,
      "",
      "wow",
      1,
      2,
      321,
      {},
      [],
      new Error("o"),
      new Date(),
    ])("returns promise that resolves to '%p'", async (value) => {
      const p = toLazyPromise(value);

      expect(p).toBeInstanceOf(LazyPromise);
      expect(await p).toBe(value);
    });
  });

  describe("cloneError", () => {
    it("it creates a new error with the same message", () => {
      const original = new Error("test message");
      const clone = cloneError(original);

      expect(clone).toBeInstanceOf(Error);
      expect(clone).not.toBe(original);
      expect(clone.message).toBe(original.message);
    });

    it("preserves the stack trace if it exists", () => {
      const original = new Error("test message");
      original.stack = "some stack";
      const clone = cloneError(original);

      expect(clone.stack).toBe(original.stack);
    });

    it("recursively clones nested errors in 'cause' property", () => {
      const nestedError = new Error("nested error");
      const original = new Error("parent error", { cause: nestedError });
      const clone = cloneError(original);

      expect(clone.cause).toBeInstanceOf(Error);
      expect(clone.cause).not.toBe(nestedError);
      expect((clone.cause as Error).message).toBe(nestedError.message);
    });

    it("recursively clones nested errors in 'reason' property", () => {
      const nestedError = new Error("nested error");
      const original = new Error("parent error") as Error & { reason: Error };
      original.reason = nestedError;
      const clone = cloneError(original) as Error & { reason: Error };

      expect(clone.reason).toBeInstanceOf(Error);
      expect(clone.reason).not.toBe(nestedError);
      expect((clone.reason as Error).message).toBe(nestedError.message);
    });

    it("clones non-error 'cause' values using structuredClone", () => {
      const causeObj = { data: "test data", num: 42 };
      const original = new Error("test message", { cause: causeObj });
      const clone = cloneError(original);

      expect(clone.cause).not.toBe(causeObj);
      expect(clone.cause).toEqual(causeObj);
    });

    it("handles deeply nested error chains", () => {
      const level3 = new Error("level 3");
      const level2 = new Error("level 2", { cause: level3 });
      const level1 = new Error("level 1", { cause: level2 });
      const clone = cloneError(level1);

      expect(clone.message).toBe("level 1");
      expect((clone.cause as Error).message).toBe("level 2");
      expect(((clone.cause as Error).cause as Error).message).toBe("level 3");

      // Verify different instances throughout the chain
      expect(clone).not.toBe(level1);
      expect(clone.cause).not.toBe(level2);
      expect((clone.cause as Error).cause).not.toBe(level3);
    });
  });
});
