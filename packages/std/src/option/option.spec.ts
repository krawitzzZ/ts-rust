import { createMock } from "@golevelup/ts-jest";
import { AnyError } from "../error";
import { err, ok, Result } from "../result";
import { Option, PendingOption, Some } from "./interface";
import { some, none, isPendingOption, OptionErrorKind } from "./option";

describe("Option", () => {
  const one = 11;
  const two = 222;
  const zero = 0;

  // TODO(nikita.demin): add checks that shallow copies are returned
  // TODO(nikita.demin): add checks that provided callbacks that are promises and rejects do not kill the process
  // TODO(nikita.demin): add checks that MaybePromises that reject do not kill the process (e.g. for Result<number, Promise<string>>)
  describe("value", () => {
    it("returns inner value if self is `Some`", () => {
      const option = some(one);

      expect((option as Some<number>).value).toBe(one);
    });

    it("throws `AnyError` if self is `None` (wrongly casted)", () => {
      const option = none();

      expect(() => (option as Some<number>).value).toThrow(AnyError);
    });
  });

  describe("and", () => {
    it("returns `None` if self is `None`", () => {
      const option = none();
      const some_ = some(one);
      const result = option.and(some_);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
    });

    it("returns provided `Option` if self is `Some`", () => {
      const option = some(one);
      const some_ = some(two);
      const result = option.and(some_);

      expect(result.isSome()).toBe(true);
      expect(result).toBe(some_);
    });

    it("returns `PendingOption` if self is `None` and provided `Option` is `Promise<Option>`", () => {
      const option = none();
      const some_ = Promise.resolve(some(one));
      const result = option.and(some_);

      expect(isPendingOption(result)).toBe(true);
    });

    it("returns `PendingOption` if self is `Some` and provided `Option` is `Promise<Option>`", () => {
      const option = some(one);
      const some_ = Promise.resolve(some(two));
      const result = option.and(some_);

      expect(isPendingOption(result)).toBe(true);
    });

    it("returns `PendingOption` with `None` if self is `None` and provided `Option` is `Promise<Option>`", async () => {
      const option = none();
      const some_ = Promise.resolve(some(one));
      const result = await option.and(some_);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
    });

    it("returns `PendingOption` with provided `Option` if self is `Some` and provided `Option` is `Promise<Option>`", async () => {
      const option = some(one);
      const some_ = Promise.resolve(some(two));
      const result = await option.and(some_);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe((await some_).unwrap());
    });
  });

  describe("andThen", () => {
    it("does not call provided callback and returns `None` if self is `None`", () => {
      const option = none();
      const callback = jest.fn();
      const result = option.andThen(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).not.toHaveBeenCalled();
    });

    it("calls provided callback and returns `Option` if callback returns `Option` and self is `Some`", () => {
      const option = some(one);
      const some_ = some(two);
      const callback = jest.fn(() => some_);
      const result = option.andThen(callback);

      expect(result.isSome()).toBe(true);
      expect(result).toBe(some_);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(option.unwrap());
    });

    it("does not throw, returns `None` if self is `Some` and provided callback throws an exception", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.andThen(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(option.unwrap());
    });
  });

  describe("clone", () => {
    it("returns `Some` with the same value", () => {
      const option = some(one);
      const result = option.clone();

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(option.unwrap());
    });

    // it("returns `None` if self is `None`", () => {
    //   const option = none();
    //   const result = option.clone();

    //   expect(result.isNone()).toBe(true);
    //   expect(() => result.unwrap()).toThrow(AnyError);
    // });

    // it("creates a shallow copy, not a deep copy", () => {
    //   const value = { a: 1 };
    //   const option = some(value);
    //   const result = option.clone();

    //   expect(result).not.toBe(option);
    //   expect(result.unwrap()).toBe(value);
    // });
  });

  describe("expect", () => {
    it("returns inner value if self is `Some`", () => {
      const option = some(one);
      const result = option.expect("error");

      expect(result).toBe(one);
    });

    it("throws `AnyError` if self is `None`", () => {
      const option = none();

      expect(() => option.expect("error")).toThrow(AnyError);
    });
  });

  describe("filter", () => {
    it("does not call provided callback and returns `None` if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => true);
      const result = option.filter(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).not.toHaveBeenCalled();
    });

    it("returns `None` if self is `Some` and provided predicate returns `false`", () => {
      const option = some(one);
      const callback = jest.fn(() => false);
      const result = option.filter(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `Some` with inner value if self is `Some` and provided predicate returns `true`", () => {
      const option = some(one);
      const callback = jest.fn(() => true);
      const result = option.filter(callback);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `None` if provided predicate throws an exception", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.filter(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("flatten", () => {
    it("returns `None` if self is `None`", () => {
      const option = none<Option<Option<number>>>();
      const result = option.flatten();

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
    });

    it("returns inner `Option` if self is `Some<Option<T>>`", () => {
      const option = some(some(one));
      const result = option.flatten();

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
    });
  });

  describe("getOrInsert", () => {
    it("returns inner value if self is `Some`", () => {
      const option = some(one);
      const result = option.getOrInsert(two);

      expect(result).toBe(one);
      expect(option.unwrap()).toBe(one);
    });

    it("updates inner value with provided default and returns it if self is `None`", () => {
      const option = none();
      const result = option.getOrInsert(two);

      expect(result).toBe(two);
      expect(option.unwrap()).toBe(two);
    });
  });

  describe("getOrInsertWith", () => {
    it("does not call provided callback and returns inner value if self is `Some`", () => {
      const option = some(one);
      const callback = jest.fn(() => two);
      const result = option.getOrInsertWith(callback);

      expect(result).toBe(one);
      expect(option.unwrap()).toBe(one);
      expect(callback).not.toHaveBeenCalled();
    });

    it("updates inner value with the result of provided callback and returns it if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => two);
      const result = option.getOrInsertWith(callback);

      expect(result).toBe(two);
      expect(option.unwrap()).toBe(two);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("rethrows `AnyError` with original error as reason if provided callback throws", () => {
      const option = none();
      const callback = jest.fn(() => {
        throw new Error("error");
      });

      expect(() => option.getOrInsertWith(callback)).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("insert", () => {
    it("updates inner value with provided value and returns it", () => {
      const option = some(one);
      const result = option.insert(two);

      expect(result).toBe(two);
      expect(option.unwrap()).toBe(two);
    });
  });

  describe("inspect", () => {
    it("calls provided callback with current value and returns self if self is `Some`", () => {
      const option = some(one);
      const callback = jest.fn();
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.unwrap()).toBe(option.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("calls provided callback and does not await its result if self is `Some` and provided callback returns `Promise`", async () => {
      jest.useFakeTimers();
      let sideEffect = 0;
      const timeout = 1000;
      const option = some(one);
      const callback = jest.fn(async () => {
        setTimeout(() => {
          sideEffect = 1;
        }, timeout);
      });
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.unwrap()).toBe(option.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(sideEffect).toBe(0);

      jest.advanceTimersByTime(timeout);
      expect(result).not.toBe(option);
      expect(result.unwrap()).toBe(option.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(sideEffect).toBe(1);

      jest.useRealTimers();
    });

    it("does not call provided callback and returns self if self is `None`", () => {
      const option = none();
      const callback = jest.fn();
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).not.toHaveBeenCalled();
    });

    it("does not throw and returns self if provided callback throws", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.unwrap()).toBe(option.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("does not throw and returns self if provided callback rejects", async () => {
      const option = some(one);
      const callback = jest.fn(() => Promise.reject(new Error("error")));
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.unwrap()).toBe(option.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("isNone", () => {
    it.each([
      [none(), true],
      [some(one), false],
    ])("returns %p if self is %p", (option, expected) => {
      expect(option.isNone()).toBe(expected);
    });
  });

  describe("isNoneOr", () => {
    it("does not call provided callback and returns `true` if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => false);
      const result = option.isNoneOr(() => false);

      expect(result).toBe(true);
      expect(callback).not.toHaveBeenCalled();
    });

    it("returns `true` if self is `Some` and provided callback returns `true`", () => {
      const option = some(one);
      const callback = jest.fn(() => true);
      const result = option.isNoneOr(callback);

      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `false` if self is `Some` and provided callback returns `false`", () => {
      const option = some(one);
      const callback = jest.fn(() => false);
      const result = option.isNoneOr(callback);

      expect(result).toBe(false);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `false` if self is `Some` and provided callback throws an exception", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.isNoneOr(callback);

      expect(result).toBe(false);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("isSome", () => {
    it.each([
      [none(), false],
      [some(one), true],
    ])("returns %p if self is %p", (option, expected) => {
      expect(option.isSome()).toBe(expected);
    });
  });

  describe("isSomeAnd", () => {
    it("does not call provided callback and returns `false` if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => true);
      const result = option.isSomeAnd(callback);

      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });

    it("returns `false` if self is `Some` and provided callback returns `false`", () => {
      const option = some(one);
      const callback = jest.fn(() => false);
      const result = option.isSomeAnd(callback);

      expect(result).toBe(false);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `true` if self is `Some` and provided callback returns `true`", () => {
      const option = some(one);
      const callback = jest.fn(() => true);
      const result = option.isSomeAnd(callback);

      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `false` if self is `Some` and provided callback throws an exception", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.isSomeAnd(callback);

      expect(result).toBe(false);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("map", () => {
    it("does not call provided callback and returns `None` if self is `None`", () => {
      const option = none();
      const callback = jest.fn();
      const result = option.map(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).not.toHaveBeenCalled();
    });

    it("calls provided callback with inner value and returns new `Option` with result", () => {
      const option = some(one);
      const fn = (value: number) => value + value;
      const callback = jest.fn(fn);
      const result = option.map(callback);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(fn(one));
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `None` if provided callback throws", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.map(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("mapAll", () => {
    it.each([none<number>(), some(one)])(
      "calls provided synchronous callback with self and returns mapped `Option`",
      (option) => {
        const mapped = some(two);
        const fn = (_: Option<number>) => mapped;
        const callback = jest.fn(fn);
        const result = option.mapAll(callback);

        expect(result).not.toBe(option);
        expect(result).toBe(mapped);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(option);
      },
    );

    it.each([none<number>(), some(one)])(
      "calls provided synchronous callback with self and returns mapped `Option`",
      async (option) => {
        const mapped = some(two);
        const fn = (_: Option<number>) => Promise.resolve(mapped);
        const callback = jest.fn(fn);
        const result = option.mapAll(callback);

        expect(isPendingOption(result)).toBe(true);

        const awaited = await result;

        expect(awaited).toBe(mapped);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(option);
      },
    );

    it("returns `None` if provided synchronous callback throws", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.mapAll(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(option);
    });

    it("returns `None` if provided asynchronous callback throws", async () => {
      const option = some(one);
      const callback = jest.fn(() => Promise.reject(new Error("error")));
      const result = option.mapAll(callback);

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(option);
    });
  });

  describe("mapOr", () => {
    it("does not call provided callback and returns provided default if self is `None`", () => {
      const option = none();
      const callback = jest.fn();
      const result = option.mapOr(two, callback);

      expect(result).toBe(two);
      expect(callback).not.toHaveBeenCalled();
    });

    it("calls provided callback with inner value and returns the result if self is `Some`", () => {
      const option = some(one);
      const fn = (_: number) => two;
      const callback = jest.fn(fn);
      const result = option.mapOr(zero, callback);

      expect(result).toBe(two);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns provided default if self is `Some` and provided callback throws", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.mapOr(two, callback);

      expect(result).toBe(two);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("mapOrElse", () => {
    it("calls provided `mkDef` callback and returns its result if self is `None`", () => {
      const option: Option<number> = none();
      const map = (value: number) => value + value;
      const mkDef = () => two;
      const mapCallback = jest.fn(map);
      const mkDefCallback = jest.fn(mkDef);
      const result = option.mapOrElse(mkDefCallback, mapCallback);

      expect(result).toBe(mkDef());
      expect(mapCallback).not.toHaveBeenCalled();
      expect(mkDefCallback).toHaveBeenCalledTimes(1);
    });

    it("rethrows `AnyError` with original error set as reason if self is `None` and `mkDef` callback throws", () => {
      const option: Option<number> = none();
      const map = (value: number) => value + value;
      const mkDef = () => {
        throw new Error();
      };
      const mapCallback = jest.fn(map);
      const mkDefCallback = jest.fn(mkDef);

      expect(() => option.mapOrElse(mkDefCallback, mapCallback)).toThrow(
        AnyError,
      );
      expect(mapCallback).not.toHaveBeenCalled();
      expect(mkDefCallback).toHaveBeenCalledTimes(1);
    });

    it("calls provided `map` callback and returns its result if self is `Some`", () => {
      const option = some(one);
      const map = (value: number) => value + value;
      const mkDef = () => two;
      const mapCallback = jest.fn(map);
      const mkDefCallback = jest.fn(mkDef);
      const result = option.mapOrElse(mkDefCallback, mapCallback);

      expect(result).toBe(map(one));
      expect(mapCallback).toHaveBeenCalledTimes(1);
      expect(mapCallback).toHaveBeenCalledWith(one);
      expect(mkDefCallback).not.toHaveBeenCalled();
    });

    it("ignores exception if provided `map` callback throws, calls provided `mkDef` callback and returns its result if self is `None`", () => {
      const option = some(one);
      const map = (_: number) => {
        throw new Error();
      };
      const mkDef = () => two;
      const mapCallback = jest.fn(map);
      const mkDefCallback = jest.fn(mkDef);
      const result = option.mapOrElse(mkDefCallback, mapCallback);

      expect(result).toBe(mkDef());
      expect(mapCallback).toHaveBeenCalledTimes(1);
      expect(mapCallback).toHaveBeenCalledWith(one);
      expect(mkDefCallback).toHaveBeenCalledTimes(1);
    });

    it("rethrows `AnyError` with original error set as reason if self is `Some` and provided `mkDef` callback throws", () => {
      const mapError = new Error("map");
      const mkDefError = new Error("make default error");
      const option = some(one);
      const map = (_: number) => {
        throw mapError;
      };
      const mkDef = () => {
        throw mkDefError;
      };
      const mapCallback = jest.fn(map);
      const mkDefCallback = jest.fn(mkDef);

      expect(() => option.mapOrElse(mkDefCallback, mapCallback)).toThrow(
        new AnyError(
          "`Option.mapOrElse` - callback `mkDef` threw an exception",
          OptionErrorKind.PredicateException,
          mkDefError,
        ),
      );
      expect(mapCallback).toHaveBeenCalledTimes(1);
      expect(mapCallback).toHaveBeenCalledWith(one);
      expect(mkDefCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("match", () => {
    it("calls provided `some` callback and returns its result if self is `Some`", () => {
      const option = some(one);
      const some_ = jest.fn(() => two);
      const none_ = jest.fn(() => zero);
      const result = option.match(some_, none_);

      expect(result).toBe(two);
      expect(some_).toHaveBeenCalledTimes(1);
      expect(some_).toHaveBeenCalledWith(one);
      expect(none_).not.toHaveBeenCalled();
    });

    it("calls provided `none` callback and returns its result if self is `None`", () => {
      const option = none();
      const some_ = jest.fn(() => two);
      const none_ = jest.fn(() => zero);
      const result = option.match(some_, none_);

      expect(result).toBe(zero);
      expect(some_).not.toHaveBeenCalled();
      expect(none_).toHaveBeenCalledTimes(1);
    });

    it("rethrows `AnyError` with original error set as reason if self is `Some` and provided `some` callback throws", () => {
      const option = some(one);
      const some_ = jest.fn(() => {
        throw new Error();
      });
      const none_ = jest.fn(() => zero);

      expect(() => option.match(some_, none_)).toThrow(AnyError);
      expect(some_).toHaveBeenCalledTimes(1);
      expect(some_).toHaveBeenCalledWith(one);
      expect(none_).not.toHaveBeenCalled();
    });

    it("rethrows `AnyError` with original error set as reason if self is `None` and provided `none` callback throws", () => {
      const option = none();
      const some_ = jest.fn(() => two);
      const none_ = jest.fn(() => {
        throw new Error();
      });

      expect(() => option.match(some_, none_)).toThrow(AnyError);
      expect(some_).not.toHaveBeenCalled();
      expect(none_).toHaveBeenCalledTimes(1);
    });
  });

  describe("okOr", () => {
    it("returns `ok` with inner value if self is `Some`", () => {
      const option = some(one);
      const result = option.okOr(two);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(one);
    });

    it("returns `err` with provided error if self is `None`", () => {
      const option = none();
      const error = "error";
      const result = option.okOr(error);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(error);
    });
  });

  // TODO(nikita.demin): think of how to handle the error if thrown (after result is done)
  describe("okOrElse", () => {
    it("returns `ok` with inner value if self is `Some`", () => {
      const option = some(one);
      const result = option.okOrElse(() => two);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(one);
    });

    it("calls provided callback and returns `err` with its result if self is `None`", () => {
      const option = none();
      const error = "error";
      const result = option.okOrElse(() => error);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(error);
    });

    it("rethrows original error if self is `None` and provided callback throws", () => {
      const option = none();
      const error = new Error("error");
      const callback = jest.fn(() => {
        throw error;
      });

      expect(() => option.okOrElse(callback)).toThrow(error);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("or", () => {
    it("converts to `PendingOption` if provided option is `Promise`, calls `or` on it and returns its result", () => {
      const option: Option<number> = none();
      const some_: Option<number> = some(one);
      const pendingOrResult = createMock<PendingOption<number>>();
      const pendingOptionMock = createMock<PendingOption<number>>();
      pendingOptionMock.or.mockReturnValueOnce(pendingOrResult);

      const toPendingSpy = jest
        .spyOn(option, "toPending")
        .mockReturnValueOnce(pendingOptionMock);

      const result = option.or(Promise.resolve(some_));

      expect(toPendingSpy).toHaveBeenCalledTimes(1);
      expect(pendingOptionMock.or).toHaveBeenCalledTimes(1);
      expect(result).toBe(pendingOrResult);
    });

    it("returns provided `Option` if self is `None`", () => {
      const option = none<number>();
      const some_ = some(one);
      const result = option.or(some_);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
    });

    it("returns shallow copy of self if self is `Some`", () => {
      const one_ = { number: one };
      const two_ = { number: two };
      const option = some(one_);
      const some_ = some(two_);
      const result = option.or(some_);

      expect(result.isSome()).toBe(true);
      expect(result).toStrictEqual(option);
      expect(result.unwrap()).toBe(one_);
    });
  });

  describe("orElse", () => {
    it("returns shallow copy of self if self is `Some`", () => {
      const option = some(one);
      const callback = jest.fn();
      const result = option.orElse(callback);

      expect(result).toStrictEqual(option);
      expect(result.unwrap()).toBe(one);
      expect(callback).not.toHaveBeenCalled();
    });

    it("calls provided callback and returns its result if self is `None`", () => {
      const option = none<number>();
      const some_ = some(one);
      const callback = jest.fn(() => some_);
      const result = option.orElse(callback);

      expect(result).toBe(some_);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("returns `None` if self is `None` and provided callback throws", () => {
      const option = none();
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.orElse(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("replace", () => {
    it("replaces inner value with provided value and returns `Some` if self was originally `Some`", () => {
      const option = some(one);
      const result = option.replace(two);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(two);
    });

    it("replaces inner value with provided value and returns `None` if self was originally `None`", () => {
      const option = none();
      const result = option.replace(two);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(two);
    });
  });

  describe("take", () => {
    it("returns `None` if self is `None`", () => {
      const option = none();
      const result = option.take();

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
    });

    it("returns `Some` and makes self `None` if self was originally `Some`", () => {
      const option = some(one);
      const result = option.take();

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(option.isNone()).toBe(true);
      expect(() => option.unwrap()).toThrow(AnyError);
    });
  });

  describe("takeIf", () => {
    it("does not call provided callback and returns `None` if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => true);
      const result = option.takeIf(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(callback).not.toHaveBeenCalled();
    });

    it("returns `Some` and makes self `None` if self was originally `Some` and provided callback returns `true`", () => {
      const option = some(one);
      const callback = jest.fn(() => true);
      const result = option.takeIf(callback);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(option.isNone()).toBe(true);
      expect(() => option.unwrap()).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `None` if self is `Some` and provided callback returns `false`, leaving self untouched", () => {
      const option = some(one);
      const callback = jest.fn(() => false);
      const result = option.takeIf(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("calls provided callback and returns `None` if the callback throws, leaving self untouched", () => {
      const option = some(one);
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.takeIf(callback);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("toPending", () => {
    it("returns `PendingOption` with self", async () => {
      const value = { number: one };
      const option = some(value);
      const result = option.toPending();

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited).toStrictEqual(option);
      expect(awaited.unwrap()).toBe(value);
    });
  });

  describe("toString", () => {
    it("returns `None` if self is `None`", () => {
      const option = none();

      expect(option.toString()).toBe("None");
    });

    it("returns `Some { }` if self is `Some`", () => {
      const option = some(one);

      expect(option.toString()).toBe(`Some { ${one} }`);
    });
  });

  describe("transposeResult", () => {
    it("returns `Ok` with `None` if self is `None`", () => {
      const option: Option<Result<number, string>> = none();
      const result = option.transposeResult();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isNone()).toBe(true);
    });

    it("returns `Ok` with `None` if self is `Some` but does not contain a result as its value", () => {
      // @ts-expect-error -- for testing purposes
      const option: Option<Result<number, string>> = some(none());
      const result = option.transposeResult();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isNone()).toBe(true);
    });

    it("returns `Ok` with `Some` if inner value is `Ok`", () => {
      const option: Option<Result<number, string>> = some(ok(one));
      const result = option.transposeResult();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isSome()).toBe(true);
      expect(result.unwrap().unwrap()).toBe(one);
    });

    it("returns `Err` if inner value is `Err`", () => {
      const error = "error";
      const option: Option<Result<number, string>> = some(err(error));
      const result = option.transposeResult();

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(error);
    });
  });

  describe("transposeAwaitable", () => {
    it("returns `PendingOption` with `None` if self is `None`", async () => {
      const option: Option<Promise<number>> = none();
      const result = option.transposeAwaitable();

      expect(isPendingOption(result)).toBe(true);
      expect((await result).isNone()).toBe(true);
    });

    it("returns `PendingOption` with awaited inner value if self is `Some`", async () => {
      const option: Option<Promise<number>> = some(Promise.resolve(one));
      const result = option.transposeAwaitable();

      expect(isPendingOption(result)).toBe(true);
      expect((await result).unwrap()).toBe(one);
    });
  });

  describe("unwrap", () => {
    it("returns inner value if self is `Some`", () => {
      const option = some(one);
      const result = option.unwrap();

      expect(result).toBe(one);
    });

    it("throws `AnyError` if self is `None`", () => {
      const option = none();

      expect(() => option.unwrap()).toThrow(AnyError);
    });
  });

  describe("unwrapOr", () => {
    it("returns inner value if self is `Some`", () => {
      const option = some(one);
      const result = option.unwrapOr(two);

      expect(result).toBe(one);
    });

    it("returns provided default if self is `None`", () => {
      const option = none();
      const result = option.unwrapOr(two);

      expect(result).toBe(two);
    });
  });

  describe("unwrapOrElse", () => {
    it("does not call provided callback and  returns inner value if self is `Some`", () => {
      const option = some(one);
      const callback = jest.fn(() => two);
      const result = option.unwrapOrElse(callback);

      expect(result).toBe(one);
      expect(callback).not.toHaveBeenCalled();
    });

    it("calls provided callback and returns its result if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => two);
      const result = option.unwrapOrElse(callback);

      expect(result).toBe(two);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("rethrows `AnyError` if self is `None` and provided callback throws", () => {
      const option = none();
      const callback = jest.fn(() => {
        throw new Error("error");
      });

      expect(() => option.unwrapOrElse(callback)).toThrow(AnyError);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("xor", () => {
    it("converts self to `PendingOption`, calls `xor` on it and returns its result if provided option is `Promise<Option<T>>`", () => {
      const self = none<number>();
      const other = some(one);
      const xorPendingResult = createMock<PendingOption<number>>();
      const selfPendingOption = createMock<PendingOption<number>>();
      selfPendingOption.xor.mockReturnValueOnce(xorPendingResult);

      const toPendingSpy = jest
        .spyOn(self, "toPending")
        .mockReturnValueOnce(selfPendingOption);

      const result = self.xor(Promise.resolve(other));

      expect(toPendingSpy).toHaveBeenCalledTimes(1);
      expect(selfPendingOption.xor).toHaveBeenCalledTimes(1);
      expect(result).toBe(xorPendingResult);
    });

    it("returns `Some` if provided option is `Some` and self is `None`", () => {
      const self = none<number>();
      const other = some(one);
      const result = self.xor(other);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
    });

    it("returns `Some` if provided option is `None` and self is `Some`", () => {
      const self = some(one);
      const other = none<number>();
      const result = self.xor(other);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
    });

    it("returns `None` if provided option is `None` and self is `None`", () => {
      const self = none<number>();
      const other = none<number>();
      const result = self.xor(other);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
    });

    it("returns `None` if provided option is `Some` and self is `Some`", () => {
      const self = some(one);
      const other = some(two);
      const result = self.xor(other);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(AnyError);
    });
  });
});
