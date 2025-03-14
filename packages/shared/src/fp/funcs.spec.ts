import { id, noop, cnst } from "./funcs";

describe("fp", () => {
  describe("noop", () => {
    it("should return undefined", () => {
      expect(noop()).toBeUndefined();
    });

    it("should not throw an error when called without arguments", () => {
      expect(() => noop()).not.toThrow();
    });

    it("should not throw an error when called with arguments", () => {
      expect(() => noop(1, "test", {}, () => {})).not.toThrow();
    });

    it("should not have side effects", () => {
      let sideEffect = 0;
      const increment = () => sideEffect++;

      noop(increment); // Should do nothing
      expect(sideEffect).toBe(0);

      increment(); // Just to confirm sideEffect changes normally
      expect(sideEffect).toBe(1);
    });
  });

  describe("id", () => {
    it.each([
      null,
      undefined,
      NaN,
      0,
      2,
      5,
      123,
      true,
      false,
      "hey",
      new Date(),
      new Error(),
      {},
      [],
      () => {},
    ])("returns the same value - '%p'", (value) => {
      expect(id(value)).toBe(value);
    });
  });

  describe("cnst", () => {
    it("should return a function", () => {
      const always42 = cnst(42);
      expect(typeof always42).toBe("function");
    });

    it("should always return the provided value", () => {
      const alwaysHello = cnst("hello");
      expect(alwaysHello()).toBe("hello");
      expect(alwaysHello()).toBe("hello"); // Calling multiple times
    });

    it("should ignore all passed arguments", () => {
      const alwaysTrue = cnst(true);
      expect(alwaysTrue()).toBe(true);
      expect(alwaysTrue(123)).toBe(true);
      expect(alwaysTrue("ignored")).toBe(true);
      expect(alwaysTrue(null, undefined, {})).toBe(true);
    });

    it("should work with different types", () => {
      const alwaysNumber = cnst(100);
      const alwaysString = cnst("test");
      const alwaysObject = cnst({ a: 1 });
      const alwaysArray = cnst([1, 2, 3]);

      expect(alwaysNumber()).toBe(100);
      expect(alwaysString()).toBe("test");
      expect(alwaysObject()).toEqual({ a: 1 });
      expect(alwaysArray()).toEqual([1, 2, 3]);
    });

    it("should work in higher-order functions", () => {
      const alwaysZero = cnst(0);
      const result = [1, 2, 3].map(alwaysZero);
      expect(result).toEqual([0, 0, 0]);
    });
  });
});
