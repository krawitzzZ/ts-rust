import { stringify } from "@ts-rust/shared";
import { AnyError } from "./any.error";

describe("AnyError", () => {
  it("creates an instance with provided message and kind (kind is used for reason)", () => {
    const message = "oops";
    const kind = "UnexpectedException";
    const error = new AnyError(message, kind);

    expect(error).toBeInstanceOf(AnyError);
    expect(error.message).toBe(
      `[${stringify(kind)}] ${message}. Reason: undefined`,
    );
    expect(error.kind).toBe(kind);
    expect(error.reason).toStrictEqual(new Error(kind));
  });

  it.each([
    null,
    NaN,
    0,
    123,
    "",
    "Error Reason",
    new Error("oopsy"),
    {},
    new AnyError("any error", "kind"),
  ])("creates an instance with provided reason as Error instance", (reason) => {
    const error = new AnyError("msg", "some kind", reason);

    expect(error).toBeInstanceOf(AnyError);
    expect(error.reason).toBeInstanceOf(Error);

    if (reason instanceof Error) {
      expect(error.reason).toBe(reason);
    }
  });
});
