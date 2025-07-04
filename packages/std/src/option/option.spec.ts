import { err, isCheckedError, ok, Result, ResultErrorKind } from "../result";
import { ResultError } from "../result/error";
import { Clone } from "../types";
import { OptionError } from "./error";
import {
  Option,
  Some,
  some,
  none,
  isPendingOption,
  OptionErrorKind,
} from "./index";

describe("Option", () => {
  const one = 11;
  const two = 222;
  const zero = 0;

  class Counter implements Clone<Counter> {
    constructor(public data: { count: number }) {}
    clone(this: Clone<Counter>): Counter {
      return new Counter({ count: 0 });
    }
  }

  describe("value", () => {
    it("returns inner value if self is `Some`", () => {
      const option = some(one);

      expect((option as Some<number>).value).toBe(one);
    });

    it("throws `OptionError` if self is `None` (wrongly casted)", () => {
      const option = none();

      expect(() => (option as Some<number>).value).toThrow(
        new OptionError(
          "`value`: accessed on `None`",
          OptionErrorKind.ValueAccessedOnNone,
        ),
      );
    });
  });

  describe("and", () => {
    it("returns `None` if self is `None`", () => {
      const option = none();
      const other = some(one);
      const result = option.and(other);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(result).not.toBe(other);
      expect(() => result.unwrap()).toThrow(OptionError);
    });

    it("returns copy of provided `Option` if self is `Some`", () => {
      const option = some(one);
      const other = some(two);
      const result = option.and(other);

      expect(result.isSome()).toBe(true);
      expect(result).not.toBe(other);
      expect(result).toStrictEqual(other);
    });
  });

  describe("andThen", () => {
    it("does not call provided callback and returns `None` if self is `None`", () => {
      const option = none();
      const callback = jest.fn();
      const result = option.andThen(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
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
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(option.unwrap());
    });
  });

  describe("clone", () => {
    it("returns `None` if self is `None`", () => {
      const self = none<number>();
      const cloned = self.clone();

      expect(cloned.isNone()).toBe(true);
      expect(cloned).not.toBe(self);
      expect(() => cloned.unwrap()).toThrow(OptionError);
    });

    it("returns `Some` with the same value", () => {
      const counter = new Counter({ count: 10 });
      const self = some(counter);
      const cloned = self.clone();

      expect(cloned.isSome()).toBe(true);
      expect(cloned).not.toBe(self);
      expect(cloned.unwrap()).not.toBe(self.unwrap());
      expect(cloned.unwrap()).toStrictEqual(counter.clone());
    });

    it.each([null, undefined, 0, 1, "string", Symbol("symbol"), true, false])(
      "creates a deep copy if the option holds a primitive '%p'",
      (v) => {
        const self = some(v);
        const cloned = self.clone();

        expect(cloned.isSome()).toBe(true);
        expect(cloned).not.toBe(self);
        expect(cloned.unwrap()).toBe(v);
      },
    );

    it("creates a deep copy, not a shallow copy", () => {
      const counter = new Counter({ count: 10 });
      const self = some(counter);
      const cloned = self.clone();

      expect(cloned.isSome()).toBe(true);
      expect(cloned).not.toBe(self);
      expect(cloned.unwrap()).not.toBe(self.unwrap());
      expect(cloned.unwrap().data).not.toBe(self.unwrap().data);
      expect(cloned.unwrap().data).toStrictEqual(counter.clone().data);

      counter.data.count = 100;

      expect(self.unwrap().data.count).toBe(100);
      expect(cloned.unwrap().data.count).toBe(counter.clone().data.count);
    });
  });

  describe("combine", () => {
    it("returns `None` if self is `None`", () => {
      const self = none<number>();
      const other = some(one);
      const result = self.combine(other);

      expect(result.isNone()).toBe(true);
    });

    it("returns `None` if self is `Some` and provided option is `None`", () => {
      const self = some(one);
      const other = none<number>();
      const result = self.combine(other);

      expect(result.isNone()).toBe(true);
    });

    it("returns `None` if self is `Some` and one of provided options is `None`", () => {
      const self = some(one);
      const other = some(two);
      const another = none<number>();
      const result = self.combine(other, another);

      expect(result.isNone()).toBe(true);
    });

    it("returns `Some` if self is `Some` and provided options are all `Some`", () => {
      const promiseTwo = Promise.resolve(two);
      const self = some(one);
      const other = some(promiseTwo);
      const another = some(zero);
      const result = self.combine(other, another);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toStrictEqual([one, promiseTwo, zero]);
    });
  });

  describe("copy", () => {
    it("returns a new `Option` with the same value but different reference if self is `Some`", () => {
      const value = { number: one };
      const option = some(value);
      const result = option.copy();

      expect(result).not.toBe(option); // Different Option reference
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(value); // Same value reference
    });

    it("returns a new `None` if self is `None`", () => {
      const option = none();
      const result = option.copy();

      expect(result).not.toBe(option); // Different Option reference
      expect(result.isNone()).toBe(true);
    });
  });

  describe("expect", () => {
    it("returns inner value if self is `Some`", () => {
      const option = some(one);
      const result = option.expect("error");

      expect(result).toBe(one);
    });

    it.each(["oi oi oi", undefined])(
      "throws `OptionError` if self is `None`",
      (msg) => {
        const option = none();

        expect(() => option.expect(msg)).toThrow(
          new OptionError(
            msg ?? "`expect`: called on `None`",
            OptionErrorKind.ExpectCalledOnNone,
          ),
        );
      },
    );
  });

  describe("filter", () => {
    it("does not call provided callback and returns `None` if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => true);
      const result = option.filter(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).not.toHaveBeenCalled();
    });

    it("returns `None` if self is `Some` and provided predicate returns `false`", () => {
      const option = some(one);
      const callback = jest.fn(() => false);
      const result = option.filter(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `Some` with inner value if self is `Some` and provided predicate returns `true`", () => {
      const option = some(one);
      const callback = jest.fn(() => true);
      const result = option.filter(callback);

      expect(result.isSome()).toBe(true);
      expect(result).not.toBe(option);
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
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("flatten", () => {
    it("returns `None` if self is `None`", () => {
      const option = none<Option<Option<number>>>();
      const result = option.flatten();

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
    });

    it("returns `None` if self is `Some`, but value is not `Option`", () => {
      // @ts-expect-error -- for testing
      const option: Option<Option<number>> = some(1);
      const result = option.flatten();

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
    });

    it("returns inner `Option` if self is `Some<Option<T>>`", () => {
      const inner = some(one);
      const option = some(inner);
      const spy = jest.spyOn(inner, "copy");
      const result = option.flatten();

      expect(result).not.toBe(option);
      expect(result).not.toBe(inner);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOrInsert", () => {
    it("returns inner value unchanged if self is `Some`", () => {
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
    it.each([one, true, { count: 3 }])(
      "does not call provided callback and returns inner value if self is `Some { %p }`",
      (val) => {
        const option = some(val);
        const callback = jest.fn(() => two);
        const result = option.getOrInsertWith(callback);

        expect(result).toBe(val);
        expect(option.unwrap()).toBe(val);
        expect(callback).not.toHaveBeenCalled();
      },
    );

    it.each([one, true, { count: 3 }])(
      "updates inner value with the result of provided callback and returns it if self is `None`",
      (val) => {
        const option = none();
        const callback = jest.fn(() => val);
        const result = option.getOrInsertWith(callback);

        expect(result).toBe(val);
        expect(option.unwrap()).toBe(val);
        expect(callback).toHaveBeenCalledTimes(1);
      },
    );

    it("rethrows `OptionError` with original error as reason if provided callback throws", () => {
      const option = none();
      const error = new Error("error");
      const callback = jest.fn(() => {
        throw new Error("error");
      });

      expect(() => option.getOrInsertWith(callback)).toThrow(
        new OptionError(
          "`getOrInsertWith`: callback `f` threw an exception",
          OptionErrorKind.PredicateException,
          error,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("insert", () => {
    it("updates inner value with provided value and returns it if self is `Some`", () => {
      const option = some(one);
      const result = option.insert(two);

      expect(result).toBe(two);
      expect(option.unwrap()).toBe(two);
    });

    it.each([
      one,
      true,
      Symbol("symbol"),
      { count: 3 },
      [1, 2, 3],
      new Error("error"),
    ])("sets inner value to `%p` and returns it if self is `None`", (val) => {
      const option = none();
      const result = option.insert(val);

      expect(result).toBe(val);
      expect(option.unwrap()).toBe(val);
    });
  });

  describe("inspect", () => {
    it("calls provided callback with current value and returns self if self is `Some`", () => {
      const option = some(one);
      const spy = jest.spyOn(option, "copy");
      const callback = jest.fn();
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.unwrap()).toBe(option.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("calls provided callback and does not await its result if self is `Some` and provided callback returns `Promise`", async () => {
      jest.useFakeTimers();
      let sideEffect = 0;
      const timeout = 1000;
      const option = some(one);
      const spy = jest.spyOn(option, "copy");
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
      expect(spy).toHaveBeenCalledTimes(1);
      expect(sideEffect).toBe(1);

      jest.useRealTimers();
    });

    it("does not call provided callback and returns self if self is `None`", () => {
      const option = none();
      const spy = jest.spyOn(option, "copy");
      const callback = jest.fn();
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not throw and returns self if provided callback throws", () => {
      const option = some(one);
      const spy = jest.spyOn(option, "copy");
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.unwrap()).toBe(option.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not throw and returns self if provided callback rejects", async () => {
      const option = some(one);
      const spy = jest.spyOn(option, "copy");
      const callback = jest.fn(() => Promise.reject(new Error("error")));
      const result = option.inspect(callback);

      expect(result).not.toBe(option);
      expect(result.unwrap()).toBe(option.unwrap());
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("isNone", () => {
    it.each([
      [true, none()],
      [false, some(one)],
    ])("returns '%p' if self is %s", (expected, option) => {
      expect(option.isNone()).toBe(expected);
    });
  });

  describe("isNoneOr", () => {
    it("does not call provided callback and returns `true` if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => false);
      const result = option.isNoneOr(callback);

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
      [false, none()],
      [true, some(one)],
    ])("returns '%p' if self is '%s'", (expected, option) => {
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

  describe("iter", () => {
    it("returns an iterator that yields nothing if self is `None`", () => {
      const self = none();
      const iter = self.iter();

      expect(iter.next()).toStrictEqual({ done: true });
      expect(iter.next()).toStrictEqual({ done: true });
    });

    it.each([one, true, { a: 2 }])(
      "returns an iterator that yields '%s' only once if self is `Some`",
      (v) => {
        const self = some(v);
        const iter = self.iter();

        expect(iter.next()).toStrictEqual({ done: false, value: v });
        expect(iter.next()).toStrictEqual({ done: true });
        expect(iter.next()).toStrictEqual({ done: true });
      },
    );

    it.each([some(one), none()])("works with spread operator", (opt) => {
      const iter = opt.iter();

      expect([...iter]).toStrictEqual(opt.isSome() ? [opt.unwrap()] : []);
      expect(iter.next()).toStrictEqual({ done: true });
    });

    it.each([some(one), none()])("works with for .. of loop", (opt) => {
      const iter = opt.iter();

      for (const x of iter) {
        expect(x).toBe(one);
      }

      expect.assertions(opt.isSome() ? 1 : 0);
    });
  });

  describe("map", () => {
    it("does not call provided callback and returns `None` if self is `None`", () => {
      const option = none();
      const callback = jest.fn();
      const result = option.map(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).not.toHaveBeenCalled();
    });

    it("calls provided callback with inner value and returns new `Option` with result", () => {
      const option = some(one);
      const callback = jest.fn(() => 123);
      const result = option.map(callback);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(123);
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
      expect(() => result.unwrap()).toThrow(OptionError);
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
      "calls provided asynchronous callback with self and returns `PendingOption` with awaited mapped option",
      async (option) => {
        const mapped = some(two);
        const fn = (_: Option<number>) => Promise.resolve(mapped);
        const callback = jest.fn(fn);
        const result = option.mapAll(callback);

        expect(isPendingOption(result)).toBe(true);

        const awaited = await result;

        expect(awaited).not.toBe(mapped);
        expect(awaited).toStrictEqual(mapped);
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
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(option);
    });

    it("returns `None` if provided asynchronous callback rejects", async () => {
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
      const map = jest.fn(() => zero);
      const mkDef = jest.fn(() => two);
      const result = option.mapOrElse(mkDef, map);

      expect(result).toBe(two);
      expect(map).not.toHaveBeenCalled();
      expect(mkDef).toHaveBeenCalledTimes(1);
    });

    it("rethrows `OptionError` with original error set as reason if self is `None` and `mkDef` callback throws", () => {
      const error = new Error("error");
      const option: Option<number> = none();
      const map = jest.fn(() => zero);
      const mkDef = jest.fn(() => {
        throw error;
      });

      expect(() => option.mapOrElse(mkDef, map)).toThrow(
        new OptionError(
          "`mapOrElse`: callback `mkDef` threw an exception",
          OptionErrorKind.PredicateException,
          error,
        ),
      );
      expect(map).not.toHaveBeenCalled();
      expect(mkDef).toHaveBeenCalledTimes(1);
    });

    it("calls provided `map` callback and returns its result if self is `Some`", () => {
      const option = some(one);
      const map = jest.fn(() => zero);
      const mkDef = jest.fn(() => two);
      const result = option.mapOrElse(mkDef, map);

      expect(result).toBe(zero);
      expect(map).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledWith(one);
      expect(mkDef).not.toHaveBeenCalled();
    });

    it("ignores exception if provided `map` callback throws, calls provided `mkDef` callback and returns its result if self is `Some`", () => {
      const error = new Error("error");
      const option = some(one);
      const map = jest.fn(() => {
        throw error;
      });
      const mkDef = jest.fn(() => two);
      const result = option.mapOrElse(mkDef, map);

      expect(result).toBe(two);
      expect(map).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledWith(one);
      expect(mkDef).toHaveBeenCalledTimes(1);
    });

    it("rethrows `OptionError` with original error set as reason if self is `Some` and provided `mkDef` callback throws", () => {
      const mapError = new Error("map");
      const mkDefError = new Error("make default error");
      const option = some(one);
      const map = jest.fn(() => {
        throw mapError;
      });
      const mkDef = jest.fn(() => {
        throw mkDefError;
      });

      expect(() => option.mapOrElse(mkDef, map)).toThrow(
        new OptionError(
          "`mapOrElse`: callback `mkDef` threw an exception",
          OptionErrorKind.PredicateException,
          mkDefError,
        ),
      );
      expect(map).toHaveBeenCalledTimes(1);
      expect(map).toHaveBeenCalledWith(one);
      expect(mkDef).toHaveBeenCalledTimes(1);
    });
  });

  describe("match", () => {
    it.each([one, true, { count: 3 }, [1]])(
      "calls provided `some` callback and returns its result (%p) if self is `Some`",
      (val) => {
        const option = some(one);
        const some_ = jest.fn(() => val);
        const none_ = jest.fn(() => zero);
        const result = option.match(some_, none_);

        expect(result).toBe(val);
        expect(some_).toHaveBeenCalledTimes(1);
        expect(some_).toHaveBeenCalledWith(one);
        expect(none_).not.toHaveBeenCalled();
      },
    );

    it.each([zero, true, { count: 3 }, [1]])(
      "calls provided `none` callback and returns its result (%p) if self is `None`",
      (val) => {
        const option = none();
        const some_ = jest.fn(() => two);
        const none_ = jest.fn(() => val);
        const result = option.match(some_, none_);

        expect(result).toBe(val);
        expect(some_).not.toHaveBeenCalled();
        expect(none_).toHaveBeenCalledTimes(1);
      },
    );

    it("rethrows `OptionError` with original error set as reason if self is `Some` and provided `some` callback throws", () => {
      const option = some(one);
      const some_ = jest.fn(() => {
        throw new Error();
      });
      const none_ = jest.fn(() => zero);

      expect(() => option.match(some_, none_)).toThrow(OptionError);
      expect(some_).toHaveBeenCalledTimes(1);
      expect(some_).toHaveBeenCalledWith(one);
      expect(none_).not.toHaveBeenCalled();
    });

    it("rethrows `OptionError` with original error set as reason if self is `None` and provided `none` callback throws", () => {
      const option = none();
      const some_ = jest.fn(() => two);
      const none_ = jest.fn(() => {
        throw new Error();
      });

      expect(() => option.match(some_, none_)).toThrow(OptionError);
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
      expect(result.unwrapErr().expected).toBe(error);
      expect(result.unwrapErr().unexpected).toBeUndefined();
    });
  });

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
      expect(result.unwrapErr().expected).toBe(error);
      expect(result.unwrapErr().unexpected).toBeUndefined();
    });

    it("returns `Err` with unexpected `ResultError` if self is `None` and provided callback throws", () => {
      const option = none();
      const error = new Error("error");
      const callback = jest.fn(() => {
        throw error;
      });
      const result = option.okOrElse(callback);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().expected).toBeUndefined();
      expect(result.unwrapErr().unexpected).not.toBeUndefined();
      expect(result.unwrapErr().unexpected?.reason).toBe(error);
      expect(result.unwrapErr().unexpected).toStrictEqual(
        new ResultError(
          "`Option.okOrElse`: callback `mkErr` threw an exception",
          ResultErrorKind.FromOptionException,
          error,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("or", () => {
    it("returns copy of provided `Option` if self is `None`", () => {
      const option = none<number>();
      const other = some(one);
      const result = option.or(other);

      expect(result.isSome()).toBe(true);
      expect(result).toBe(other);
      expect(result).toStrictEqual(other);
      expect(result.unwrap()).toBe(one);
    });

    it("returns shallow copy of self if self is `Some`", () => {
      const one_ = { number: one };
      const two_ = { number: two };
      const option = some(one_);
      const other = some(two_);
      const result = option.or(other);

      expect(result.isSome()).toBe(true);
      expect(result).not.toBe(option);
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
      expect(result).not.toBe(option);
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
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("replace", () => {
    it("replaces inner value with provided value and returns `Some` (shallow copy of self) if self was originally `Some`", () => {
      const option = some(one);
      const result = option.replace(two);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(result).not.toBe(option);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(two);
    });

    it("replaces inner value with provided value and returns `None` (shallow copy of self) if self was originally `None`", () => {
      const option = none();
      const result = option.replace(two);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(two);
    });
  });

  describe("take", () => {
    it("returns `None` if self is `None`", () => {
      const option = none();
      const result = option.take();

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
    });

    it("returns `Some` and makes self `None` if self was originally `Some`", () => {
      const option = some(one);
      const result = option.take();

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(result).not.toBe(option);
      expect(option.isNone()).toBe(true);
      expect(() => option.unwrap()).toThrow(OptionError);
    });
  });

  describe("takeIf", () => {
    it("does not call provided callback and returns `None` if self is `None`", () => {
      const option = none();
      const callback = jest.fn(() => true);
      const result = option.takeIf(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(callback).not.toHaveBeenCalled();
    });

    it("returns `Some` and makes self `None` if self was originally `Some` and provided callback returns `true`", () => {
      const option = some(one);
      const callback = jest.fn(() => true);
      const result = option.takeIf(callback);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(result).not.toBe(option);
      expect(option.isNone()).toBe(true);
      expect(() => option.unwrap()).toThrow(OptionError);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("returns `None` if self is `Some` and provided callback returns `false`, leaving self untouched", () => {
      const option = some(one);
      const callback = jest.fn(() => false);
      const result = option.takeIf(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
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
      expect(result).not.toBe(option);
      expect(() => result.unwrap()).toThrow(OptionError);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("tap", () => {
    it.each([none<number>(), some(one)])(
      "calls provided callback with a copy of the option and returns a copy of self if self is `%s`",
      (option) => {
        let capturedOption: Option<number> | null = null;
        const callback = jest.fn((opt: Option<number>) => {
          capturedOption = opt;
        });

        const result = option.tap(callback);

        expect(result).not.toBe(option); // Different Option reference
        expect(result.isSome()).toBe(option.isSome());
        if (result.isSome()) {
          expect(result.unwrap()).toBe(option.unwrap());
        }
        expect(callback).toHaveBeenCalledTimes(1);
        expect(capturedOption).not.toBe(option); // Callback receives copy
        expect(capturedOption).toStrictEqual(option);
      },
    );

    it("does not throw and returns a copy of self if provided callback throws", () => {
      const option = some(one);
      const spy = jest.spyOn(option, "copy");
      const callback = jest.fn(() => {
        throw new Error("error");
      });

      const result = option.tap(callback);

      expect(result).not.toBe(option);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("does not throw and returns a copy of self if provided asynchronous callback rejects", () => {
      const option = some(one);
      const spy = jest.spyOn(option, "copy");
      const callback = jest.fn(() => Promise.reject(new Error("oh")));

      const result = option.tap(callback);

      expect(result).not.toBe(option);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("toPending", () => {
    it("returns `PendingOption` with self `Some`", async () => {
      const value = { number: one };
      const option = some(value);
      const spy = jest.spyOn(option, "copy");
      const result = option.toPending();

      expect(isPendingOption(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.unwrap()).toBe(value);
    });

    it("returns `PendingOption` with self `None`", async () => {
      const option = none();
      const spy = jest.spyOn(option, "copy");
      const result = option.toPending();

      expect(isPendingOption(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
    });

    it("returns `PendingOption` with awaited self", async () => {
      const value = Promise.resolve({ number: one });
      const option = some(value);
      const spy = jest.spyOn(option, "copy");
      const result = option.toPending();

      expect(isPendingOption(result)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited.unwrap()).not.toBe(value);
      expect(awaited.unwrap()).toBe(await value);
    });
  });

  describe("toPendingCloned", () => {
    it("returns a `PendingOption` that resolves to a clone of self if self is `Some`", async () => {
      const counter = new Counter({ count: 42 });
      const option = some(counter);
      const result = option.toPendingCloned();

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(option);
      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap()).not.toBe(counter); // Different value reference (cloned)
      expect(awaited.unwrap().data).not.toBe(counter.data); // Different data reference (deep clone)
      expect(awaited.unwrap().data.count).toBe(0);
    });

    it("returns a `PendingOption` that resolves to `None` if self is `None`", async () => {
      const option = none<Counter>();
      const result = option.toPendingCloned();

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(option);
      expect(awaited.isNone()).toBe(true);
    });

    it("creates a clone that doesn't change when the original is modified", async () => {
      const counter = new Counter({ count: 42 });
      const option = some(counter);
      const result = option.toPendingCloned();

      // Modify original after cloning
      counter.data.count = 100;

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap().data.count).toBe(0); // Cloned value still has original count
      expect(option.unwrap().data.count).toBe(100); // Original was updated
    });
  });

  describe("toString", () => {
    it("returns `None` if self is `None`", () => {
      const option = none();

      expect(option.toString()).toBe("None");
    });

    it(`returns 'Some { ${one} }' if self is 'Some'`, () => {
      const option = some(one);

      expect(option.toString()).toBe(`Some { ${one} }`);
    });
  });

  describe("transpose", () => {
    it("returns `Ok` with `None` if self is `None`", () => {
      const option: Option<Result<number, string>> = none();
      const result = option.transpose();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isNone()).toBe(true);
    });

    it("returns `Ok` with `None` if self is `Some` but does not contain a result as its value", () => {
      // @ts-expect-error -- for testing purposes
      const option: Option<Result<number, string>> = some(some(1));
      const result = option.transpose();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isNone()).toBe(true);
    });

    it("returns `Ok` with `Some` if inner value is `Ok`", () => {
      const option: Option<Result<number, string>> = some(ok(one));
      const result = option.transpose();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isSome()).toBe(true);
      expect(result.unwrap().unwrap()).toBe(one);
    });

    it("returns `Err` if inner value is `Err`", () => {
      const error = "error";
      const option: Option<Result<number, string>> = some(err(error));
      const result = option.transpose();

      expect(result.isErr()).toBe(true);
      expect(isCheckedError(result.unwrapErr())).toBe(true);
      expect(result.unwrapErr().expected).toBe(error);
      expect(result.unwrapErr().unexpected).toBeUndefined();
    });
  });

  describe("unwrap", () => {
    it("returns inner value if self is `Some`", () => {
      const option = some(one);
      const result = option.unwrap();

      expect(result).toBe(one);
    });

    it("throws `OptionError` if self is `None`", () => {
      const option = none();

      expect(() => option.unwrap()).toThrow(
        new OptionError(
          "`unwrap`: called on `None`",
          OptionErrorKind.UnwrapCalledOnNone,
        ),
      );
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
    it("does not call provided callback and returns inner value if self is `Some`", () => {
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

    it("rethrows `OptionError` if self is `None` and provided callback throws", () => {
      const error = new Error("unwrapped");
      const option = none();
      const callback = jest.fn(() => {
        throw error;
      });

      expect(() => option.unwrapOrElse(callback)).toThrow(
        new OptionError(
          "`unwrapOrElse`: callback `mkDef` threw an exception",
          OptionErrorKind.PredicateException,
          error,
        ),
      );
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("xor", () => {
    it("converts self to `PendingOption` if provided option is `Promise<Option<T>>` by calling `xor` on self after provided option is awaited", async () => {
      const self = none<number>();
      const xorSpy = jest.spyOn(self, "xor");
      const other = some(one);
      const result = self.xor(Promise.resolve(other));

      expect(isPendingOption(result)).toBe(true);
      expect(xorSpy).toHaveBeenCalledTimes(1);

      const awaited = await result;

      expect(awaited).not.toBe(other);
      expect(awaited).toStrictEqual(other);
      expect(xorSpy).toHaveBeenCalledTimes(2);
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
      expect(() => result.unwrap()).toThrow(OptionError);
    });

    it("returns `None` if provided option is `Some` and self is `Some`", () => {
      const self = some(one);
      const other = some(two);
      const result = self.xor(other);

      expect(result.isNone()).toBe(true);
      expect(() => result.unwrap()).toThrow(OptionError);
    });
  });
});
