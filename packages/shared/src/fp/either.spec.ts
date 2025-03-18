import { Left, left, Right, right } from "./either";

describe("Either", () => {
  describe("left", () => {
    it("creates a Left variant if provided a value", () => {
      const result = left("error");

      expect(result.isLeft()).toBe(true);
      expect(result.isRight()).toBe(false);
    });

    it("stores the value if created with left()", () => {
      const value = "error message";
      const result = left(value);

      expect((result as Left<string, number>).left).toBe(value);
    });

    it("returns the value if get() is called", () => {
      const value = "error message";
      const result = left(value);

      expect(result.get()).toBe(value);
    });
  });

  describe("right", () => {
    it("creates a Right variant if provided a value", () => {
      const result = right(42);

      expect(result.isRight()).toBe(true);
      expect(result.isLeft()).toBe(false);
    });

    it("stores the value if created with right()", () => {
      const value = 42;
      const result = right(value);

      expect((result as Right<string, number>).right).toBe(value);
    });

    it("returns the value if get() is called", () => {
      const value = 42;
      const result = right(value);

      expect(result.get()).toBe(value);
    });
  });

  describe("either", () => {
    it("calls the first function if variant is Left", () => {
      const leftFn = jest.fn((s: string) => `Error: ${s}`);
      const rightFn = jest.fn((n: number) => `Number: ${n}`);

      const result = left<string, number>("failed").either(leftFn, rightFn);

      expect(leftFn).toHaveBeenCalledWith("failed");
      expect(rightFn).not.toHaveBeenCalled();
      expect(result).toBe("Error: failed");
    });

    it("calls the second function if variant is Right", () => {
      const leftFn = jest.fn((s: string) => `Error: ${s}`);
      const rightFn = jest.fn((n: number) => `Number: ${n}`);

      const result = right<string, number>(42).either(leftFn, rightFn);

      expect(rightFn).toHaveBeenCalledWith(42);
      expect(leftFn).not.toHaveBeenCalled();
      expect(result).toBe("Number: 42");
    });

    it("transforms the value if functions return different types", () => {
      const leftResult = left<string, number>("error").either(
        (s) => s.length,
        (n) => n,
      );
      expect(leftResult).toBe(5);

      const rightResult = right<string, number>(42).either(
        (s) => s.length,
        (n) => n * 2,
      );
      expect(rightResult).toBe(84);
    });
  });

  describe("working with complex types", () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    it("handles objects if used as values", () => {
      const errorObj = { code: 404, message: "Not found" };
      const dataObj = { id: 1, name: "Item" };

      const leftResult = left(errorObj);
      const rightResult = right(dataObj);

      expect((leftResult as Left<any, any>).left).toBe(errorObj);
      expect((rightResult as Right<any, any>).right).toBe(dataObj);
    });

    it("works with null and undefined if used as values", () => {
      const nullLeft = left<null, string>(null);
      const undefinedRight = right<string, undefined>(undefined);

      expect((nullLeft as Left<any, any>).left).toBeNull();
      expect((undefinedRight as Right<any, any>).right).toBeUndefined();
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });
});
