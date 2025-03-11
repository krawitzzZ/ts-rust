import { isPrimitive } from "./types.utils";

describe("types utils", () => {
  describe("isPrimitive", () => {
    it.each([
      null,
      undefined,
      false,
      true,
      0,
      1,
      4,
      123,
      "",
      "string",
      Symbol(),
      Symbol("qwe"),
      Symbol.for("qwe"),
    ])("returns true if called with '%p'", (value) => {
      expect(isPrimitive(value)).toBe(true);
    });

    it("returns true if called with 'bigint'", () => {
      expect(isPrimitive(123n)).toBe(true);
      expect(isPrimitive(BigInt(321))).toBe(true);
    });

    it.each([
      [],
      {},
      new Date(),
      new Error(),
      function () {},
      () => {},
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class A {},
    ])("should return false if called with '%p'", (value) => {
      expect(isPrimitive(value)).toBe(false);
    });
  });
});
