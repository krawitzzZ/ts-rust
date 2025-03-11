import { stringify } from "./stringify";

describe("stringify", () => {
  it("stringifies primitives", () => {
    expect(stringify(42)).toBe("42");
    expect(stringify(true)).toBe("true");
    expect(stringify(false)).toBe("false");
    expect(stringify(null)).toBe("null");
    expect(stringify(undefined)).toBe("undefined");
  });

  it("stringifies strings with optional quotes", () => {
    expect(stringify("hello")).toBe("hello");
    expect(stringify("hello", true)).toBe("'hello'");
    expect(stringify("")).toBe("");
    expect(stringify("", true)).toBe("''");
  });

  it("stringifies bigints", () => {
    expect(stringify(12n)).toBe("12n");
    expect(stringify(BigInt(1234))).toBe("1234n");
    expect(stringify(BigInt(-5678))).toBe("-5678n");
  });

  it("stringifies symbols", () => {
    expect(stringify(Symbol("id"))).toBe("Symbol(id)");
    expect(stringify(Symbol())).toBe("Symbol()");
  });

  it("stringifies functions", () => {
    function namedFunc() {}
    const anotherNamedFunc = () => {};

    expect(stringify(namedFunc)).toBe("[Function: namedFunc]");
    expect(stringify(anotherNamedFunc)).toBe("[Function: anotherNamedFunc]");
    expect(stringify(() => {})).toBe("[Function: anonymous]");
  });

  it("stringifies promises", () => {
    expect(stringify(Promise.resolve())).toBe("promise");
    expect(stringify(new Promise(() => {}))).toBe("promise");
  });

  it("stringifies objects with toString", () => {
    const customObject = {
      toString: () => "CustomObject",
    };
    expect(stringify(customObject)).toBe("CustomObject");

    const objectWithDefaultToString = {};
    expect(stringify(objectWithDefaultToString)).toBe("{}");
  });

  it("stringifies JSON objects", () => {
    expect(stringify({ a: 1 })).toBe('{"a":1}');
    expect(stringify({ foo: "bar", num: 42 })).toBe('{"foo":"bar","num":42}');
  });

  it("handles circular references", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = {};
    obj.self = obj;
    expect(stringify(obj)).toBe("[Circular or Unstringifiable Object]");
  });

  it("handles unknown types", () => {
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class CustomClass {}
    expect(stringify(new CustomClass())).toBe("{}");
  });
});
