import { OptionError } from "./error";
import {
  isOption,
  isPendingOption,
  none,
  pendingNone,
  pendingOption,
  pendingSome,
  some,
} from "./option";

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
      "returns `Option` with `Some { %p }` value",
      (value) => {
        const option = some(value);

        expect(option.isSome()).toBe(true);
        expect(option.unwrap()).toBe(value);
      },
    );
  });

  describe("none", () => {
    it("returns `Option` with `None` value", () => {
      const option = none();

      expect(option.isNone()).toBe(true);
      expect(() => option.unwrap()).toThrow(OptionError);
    });
  });

  describe("pendingOption", () => {
    it.each(someValues)(
      "returns `PendingOption` with `Some { %p }` value",
      async (value) => {
        const option = pendingOption(some(value));

        expect(isPendingOption(option)).toBe(true);

        const awaited = await option;

        expect(awaited.isSome()).toBe(true);
        expect(awaited.unwrap()).toBe(value);
      },
    );

    it.each(options)(
      "returns `PendingOption` with `Some { %p }` value if called with synchronous factory function",
      async (opt) => {
        const option = pendingOption(() => opt);

        expect(isPendingOption(option)).toBe(true);

        const awaited = await option;

        expect(awaited.isSome()).toBe(opt.isSome());
      },
    );

    it.each(options)(
      "returns `PendingOption` with `Some { %p }` value if called with asynchronous factory function",
      async (opt) => {
        const option = pendingOption(async () => opt);

        expect(isPendingOption(option)).toBe(true);

        const awaited = await option;

        expect(awaited.isSome()).toBe(opt.isSome());
      },
    );

    it("returns `PendingOption` with `None` value", async () => {
      const option = pendingOption(none());

      expect(isPendingOption(option)).toBe(true);

      const awaited = await option;

      expect(isPendingOption(option)).toBe(true);
      expect(awaited.isNone()).toBe(true);
      expect(() => awaited.unwrap()).toThrow(OptionError);
    });
  });

  describe("pendingSome", () => {
    it("returns `PendingOption` that resolves to `Some`", async () => {
      const value = { a: 1 };
      const option = pendingSome(value);

      expect(isPendingOption(option)).toBe(true);
      expect(await option).toStrictEqual(some(value));
      expect((await option).unwrap()).toBe(value);
    });
  });

  describe("pendingNone", () => {
    it("returns `PendingOption` that resolves to `None`", async () => {
      const option = pendingNone();

      expect(isPendingOption(option)).toBe(true);
      expect(await option).toStrictEqual(none());
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
});
