import { AnyError } from "../error";
import { isOption, isPendingOption, none, pendingOption, some } from "./option";

describe("Option utils", () => {
  const someValues = [
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
  const options = [none(), ...someValues.map(some)];

  describe("some", () => {
    it.each(someValues)(
      "returns `Option` with `Some { %s }` value",
      (value) => {
        const option = some(value);

        expect(option.isSome()).toBe(true);
        expect(option.unwrap()).toBe(value);
      },
    );
  });

  describe("none", () => {
    it("returns Option with `None` value", () => {
      const option = none();

      expect(option.isNone()).toBe(true);
      expect(() => option.unwrap()).toThrow(AnyError);
    });
  });

  describe("pendingOption", () => {
    it.each(someValues)(
      "returns PendingOption with `Some { %s }` value",
      async (value) => {
        const option = pendingOption(some(value));

        expect(isPendingOption(option)).toBe(true);

        const awaited = await option;

        expect(isPendingOption(option)).toBe(true);
        expect(awaited.isSome()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it("returns PendingOption with `None` value", async () => {
      const option = pendingOption(none());

      expect(isPendingOption(option)).toBe(true);

      const awaited = await option;

      expect(isPendingOption(option)).toBe(true);
      expect(awaited.isNone()).toBe(true);
      expect(() => awaited.unwrap()).toThrow(AnyError);
    });
  });

  describe("isPendingOption", () => {
    it.each(options)(
      "returns true if called with `PendingOption { %s }`",
      (option) => {
        expect(isPendingOption(pendingOption(option))).toBe(true);
      },
    );

    it.each(options)("returns false if called with %s", (option) => {
      expect(isPendingOption(option)).toBe(false);
    });
  });

  describe("isOption", () => {
    it.each(options)("returns true if called with %s", (option) => {
      expect(isOption(option)).toBe(true);
    });

    it.each([...options.map(pendingOption), ...someValues])(
      "returns false if called with %s",
      (value) => {
        expect(isOption(value)).toBe(false);
      },
    );
  });
});
