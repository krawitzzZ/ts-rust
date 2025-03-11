import { LazyPromise } from "./lazyPromise";
import { isLazyPromise, isPromise, toLazyPromise, toPromise } from "./utils";

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
});
