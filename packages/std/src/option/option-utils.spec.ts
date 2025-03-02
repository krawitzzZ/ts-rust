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

    it("clones provided option if it is `PendingOption` itself", async () => {
      const value = 42;
      const some_ = some(value);
      const pending = pendingOption(some_);
      const pendingClone = pendingOption(some_);
      const cloneSpy = jest
        .spyOn(pending, "clone")
        .mockReturnValueOnce(pendingClone);
      const option = pendingOption(pending);

      expect(isPendingOption(option)).toBe(true);
      expect(cloneSpy).toHaveBeenCalledTimes(1);
      expect(option).toBe(pendingClone);
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
