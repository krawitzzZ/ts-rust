import { createMock } from "@golevelup/ts-jest";
import * as shared from "@ts-rust/shared";
import { err, isPendingResult, ok, Result } from "../result";
import { Option, isPendingOption, none, pendingOption, some } from "./index";

jest.mock("@ts-rust/shared", () => ({
  ...jest.requireActual("@ts-rust/shared"),
  cnst: jest.fn(jest.requireActual("@ts-rust/shared").cnst),
}));

describe("PendingOption", () => {
  const one = 11;
  const two = 222;
  const zero = 0;
  const syncErrorCallback =
    <T = Option<number>>(e?: Error) =>
    (): T => {
      throw e ?? new Error("sync error");
    };
  const asyncErrorCallback =
    <T = Option<number>>(e?: Error) =>
    (): Promise<T> =>
      Promise.reject(e ?? new Error("async error"));
  const rejectedPromise = <T = Option<number>>(e?: Error): Promise<T> =>
    Promise.reject(e ?? new Error("async error"));

  describe("then", () => {
    it("calls provided `onSuccess` callback with inner `Option` if self resolves", async () => {
      const inner = some(5);
      const pending = pendingOption(inner);
      const onSuccess = jest.fn();
      const onError = jest.fn();

      await pending.then(onSuccess, onError);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(inner);
      expect(onError).not.toHaveBeenCalled();
    });

    it("calls provided `onError` callback if self rejects", async () => {
      const error = new Error("then error");
      jest.spyOn(shared, "cnst").mockImplementationOnce(() => () => {
        throw error;
      });
      const pending = pendingOption(rejectedPromise(error));
      const onSuccess = jest.fn();
      const onError = jest.fn();

      await pending.then(onSuccess, onError);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("catch", () => {
    it("calls provided callback with error if self rejects", async () => {
      const error = new Error("catch error");
      jest.spyOn(shared, "cnst").mockImplementationOnce(() => () => {
        throw error;
      });
      const pending = pendingOption(rejectedPromise(error));
      const onRejected = jest.fn(() => some(two));
      const result = await pending.catch(onRejected);

      expect(result).toStrictEqual(some(two));
      expect(onRejected).toHaveBeenCalledTimes(1);
      expect(onRejected).toHaveBeenCalledWith(error);
    });

    it("returns original option if self resolves", async () => {
      const inner = some(one);
      const pending = pendingOption(inner);
      const onRejected = jest.fn();
      const result = await pending.catch(onRejected);

      expect(result).toStrictEqual(inner);
      expect(onRejected).not.toHaveBeenCalled();
    });

    it("rethrows the exception if rejection handler throws", async () => {
      const pendingError = new Error("pending option error");
      const syncError = new Error("catch handler sync error");
      jest.spyOn(shared, "cnst").mockImplementationOnce(() => () => {
        throw pendingError;
      });
      const pending = pendingOption(rejectedPromise<Option<number>>());
      const onRejected = jest.fn(syncErrorCallback(syncError));

      await expect(pending.catch(onRejected)).rejects.toThrow(syncError);
      expect(onRejected).toHaveBeenCalledTimes(1);
      expect(onRejected).toHaveBeenCalledWith(pendingError);
    });
  });

  describe("and", () => {
    it("returns `None` if self is `None`", async () => {
      const inner = none();
      const self = pendingOption(inner);
      const other = some(one);
      const result = self.and(other);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(awaited).not.toBe(inner);
    });

    it.each([some(two), Promise.resolve(some(two))])(
      "returns shallow copy of provided `%O` if self is `Some`",
      async (other) => {
        const inner = some(one);
        const self = pendingOption(inner);
        const result = self.and(other);

        expect(result).not.toBe(self);

        const awaited = await result;

        expect(awaited.isSome()).toBe(true);
        expect(awaited.unwrap()).toBe(two);
        expect(awaited).not.toBe(inner);
      },
    );

    it("returns `None` if provided `Promise` rejects", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const result = self.and(rejectedPromise());

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(awaited).not.toBe(inner);
    });
  });

  describe("andThen", () => {
    it("does not call provided callback and returns `None` if self is `None`", async () => {
      const inner = none();
      const self = pendingOption(inner);
      const other = some(one);
      const callback = jest.fn(() => other);
      const result = await self.andThen(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(inner);
      expect(callback).not.toHaveBeenCalled();
    });

    it.each([none<number>(), some(two)])(
      "calls provided synchronous callback and returns its result if self is `Some`",
      async (other) => {
        const inner = some(one);
        const self = pendingOption(inner);
        const callback = jest.fn(() => other);
        const result = await self.andThen(callback);

        expect(result).not.toBe(inner);
        expect(result).not.toBe(other);
        expect(result).toStrictEqual(other);
        if (other.isSome()) {
          expect(result.unwrap()).toBe(other.unwrap());
        }
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(one);
      },
    );

    it.each([none<number>(), some(two)])(
      "calls provided asynchronous callback and returns its result if self is `Some`",
      async (other) => {
        const inner = some(one);
        const self = pendingOption(inner);
        const callback = jest.fn(() => Promise.resolve(other));
        const result = await self.andThen(callback);

        expect(result).not.toBe(inner);
        expect(result).not.toBe(other);
        expect(result).toStrictEqual(other);
        if (other.isSome()) {
          expect(result.unwrap()).toBe(other.unwrap());
        }
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(one);
      },
    );

    it("returns `None` if self is `Some` and provided synchronous callback throws an exception", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn(syncErrorCallback());
      const result = await self.andThen(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(inner);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("returns `None` if self is `Some` and provided asynchronous callback throws an exception", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback: () => Promise<Option<number>> =
        jest.fn(asyncErrorCallback());
      const result = await self.andThen(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(inner);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("filter", () => {
    it("does not call provided callback and returns `None` if self is `None`", async () => {
      const inner = none();
      const self = pendingOption(inner);
      const callback = jest.fn(() => true);
      const result = await self.filter(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(inner);
      expect(callback).not.toHaveBeenCalled();
    });

    it.each([false, Promise.resolve(false)])(
      "calls provided callback and returns `None` if self is `Some` and callback returns `%O`",
      async (ret) => {
        const inner = some(one);
        const self = pendingOption(inner);
        const callback = jest.fn(() => ret);
        const result = await self.filter(callback);

        expect(result.isNone()).toBe(true);
        expect(result).not.toBe(inner);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(one);
      },
    );

    it.each([true, Promise.resolve(true)])(
      "returns shallow copy of self if self is `Some` and callback returns `%O`",
      async (ret) => {
        const inner = some(one);
        const self = pendingOption(inner);
        const callback = jest.fn(() => ret);
        const result = await self.filter(callback);

        expect(result.isSome()).toBe(true);
        expect(result.unwrap()).toBe(one);
        expect(result).not.toBe(inner);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(one);
      },
    );

    it("returns `None` if self is `Some` and provided callback throws an exception", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback: () => boolean = jest.fn(syncErrorCallback());
      const result = await self.filter(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(inner);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("returns `None` if self is `Some` and `Promise` in provided callback rejects", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback: () => Promise<boolean> = jest.fn(asyncErrorCallback());
      const result = await self.filter(callback);

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(inner);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("flatten", () => {
    it("returns `PendingOption` that resolves `None` if self resolves to `None`", async () => {
      const option: Option<Option<number>> = none();
      const self = pendingOption(option);
      const result = await self.flatten();

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
    });

    it("returns `PendingOption` that resolves `None` if self resolves to `Some`, but its value is not an `Option`", async () => {
      // @ts-expect-error -- for testing
      const option: Option<Option<number>> = ok(1);
      const self = pendingOption(option);
      const result = await self.flatten();

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
    });

    it.each([none<number>(), some(one)])(
      "returns shallow copy of awaited inner `Option` if self is `Some<Option<T>>`",
      async (inner) => {
        const outer = some(inner);
        const self = pendingOption(Promise.resolve(outer));
        const result = await self.flatten();

        expect(result.isSome()).toBe(inner.isSome());
        if (inner.isSome()) {
          expect(result.unwrap()).toBe(inner.unwrap());
        }
        expect(result).not.toBe(inner);
        expect(result).not.toBe(outer);
      },
    );
  });

  describe("inspect", () => {
    it("calls `inspect` on inner `Option` and returns its result", async () => {
      const inner = some(one);
      const inspectResult = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn();
      const inspectSpy = jest
        .spyOn(inner, "inspect")
        .mockReturnValueOnce(inspectResult);
      const result = self.inspect(callback);

      expect(result).not.toBe(self);
      expect(inspectSpy).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).toBe(inspectResult);
      expect(awaited.unwrap()).toBe(one);
      expect(inspectSpy).toHaveBeenCalledTimes(1);
    });

    it("return `PendingOption` that resolves to `None` if inner option promise rejects", async () => {
      const error = new Error("oops");
      const self = pendingOption(Promise.reject(error));
      const callback = jest.fn();
      const result = self.inspect(callback);

      expect(result).not.toBe(self);

      const awaited = await result;
      expect(awaited.isNone()).toBe(true);
    });
  });

  describe("map", () => {
    it("does not call provided callback and returns `None` if self is `None`", async () => {
      const inner = none();
      const self = pendingOption(inner);
      const callback = jest.fn();
      const result = self.map(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(awaited).not.toBe(inner);
      expect(callback).not.toHaveBeenCalled();
    });

    it.each([two, Promise.resolve(two)])(
      "calls provided callback and returns `Some` with its (awaited) result '%O' if self is `Some`",
      async (mapped) => {
        const inner = some(one);
        const self = pendingOption(inner);
        const callback = jest.fn(() => mapped);
        const result = self.map(callback);

        expect(result).not.toBe(self);

        const awaited = await result;

        expect(awaited.isSome()).toBe(true);
        expect(awaited.unwrap()).toBe(await mapped);
        expect(awaited).not.toBe(inner);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(one);
      },
    );

    it("calls provided callback and returns `None` if self is `Some` and provided callback throws an exception", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn(syncErrorCallback());
      const result = self.map(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(awaited).not.toBe(inner);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("calls provided callback and returns `None` if self is `Some` and provided callback rejects with an exception", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn(asyncErrorCallback());
      const result = self.map(callback);

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(awaited).not.toBe(inner);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });
  });

  describe("mapAll", () => {
    it("calls provided callback with inner `Option` once resolved and returns its result", async () => {
      const inner = some(one);
      const mapped = some(two);
      const self = pendingOption(inner);
      const callback = jest.fn(() => mapped);

      const result = self.mapAll(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).not.toBe(mapped);
      expect(awaited).toStrictEqual(mapped);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(inner);
    });

    it("calls provided callback with `None` if self rejects", async () => {
      const mapped = some(two);
      const self = pendingOption(rejectedPromise<Option<number>>());
      const callback = jest.fn(() => mapped);

      const result = self.mapAll(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).not.toBe(mapped);
      expect(awaited).toStrictEqual(mapped);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(none());
    });

    it("returns `None` if provided callback throws", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn(syncErrorCallback());

      const result = self.mapAll(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(inner);
    });

    it("supports asynchronous callbacks and returns the awaited result", async () => {
      const inner = some(one);
      const mapped = some(two);
      const self = pendingOption(inner);
      const callback = jest.fn(() => Promise.resolve(mapped));

      const result = self.mapAll(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).not.toBe(mapped);
      expect(awaited).toStrictEqual(mapped);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(inner);
    });

    it("returns `None` if provided asynchronous callback rejects", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn(() => rejectedPromise());

      const result = self.mapAll(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(inner);
    });
  });

  describe("match", () => {
    it("calls provided `some` callback and returns its result if self resolves to `Some`", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const onSome = jest.fn(() => two);
      const onNone = jest.fn(() => zero);
      const awaited = await self.match(onSome, onNone);

      expect(awaited).toBe(two);
      expect(onSome).toHaveBeenCalledTimes(1);
      expect(onSome).toHaveBeenCalledWith(one);
      expect(onNone).not.toHaveBeenCalled();
    });

    it("calls provided `none` callback and returns its result if self resolves to `None`", async () => {
      const inner = none();
      const self = pendingOption(inner);
      const onSome = jest.fn(() => two);
      const onNone = jest.fn(() => zero);
      const awaited = await self.match(onSome, onNone);

      expect(awaited).toBe(zero);
      expect(onNone).toHaveBeenCalledTimes(1);
      expect(onSome).not.toHaveBeenCalled();
    });
  });

  describe("okOr", () => {
    it("calls inner `Option`'s `okOr` method with provided error", async () => {
      const error = new Error();
      const inner = some(one);
      const res = createMock<Result<number, Error>>();
      const spy = jest.spyOn(inner, "okOr").mockReturnValueOnce(res);
      const self = pendingOption(inner);
      const result = self.okOr(error);

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited).toBe(res);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(error);
    });
  });

  describe("okOrElse", () => {
    it("does not call provided callback and returns `Ok` with inner value if self is `Some`", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn();
      const result = self.okOrElse(callback);

      expect(result).not.toBe(self);
      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).not.toHaveBeenCalled();
    });

    it.each([{ error: "sync err" }, Promise.resolve({ error: "async error" })])(
      "calls provided callback and returns `Err` with its (awaited) result '%O' if self is `None`",
      async (error) => {
        const inner = none();
        const self = pendingOption(inner);
        const callback = jest.fn(() => error);
        const result = self.okOrElse(callback);

        expect(result).not.toBe(self);
        expect(isPendingResult(result)).toBe(true);

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr().expected).toBe(await error);
        expect(awaited.unwrapErr().unexpected).toBeUndefined();
        expect(callback).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe("or", () => {
    it.each([some(1), Promise.resolve(some(1))])(
      "calls inner `Option`'s `or` method with (awaited) provided default '%O' and return its result",
      async (other) => {
        const inner = some(one);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- for some reason ts expects other to be PendingOption only
        const spy = jest.spyOn(inner, "or").mockReturnValueOnce(other as any);
        const self = pendingOption(inner);
        const result = self.or(other);

        expect(result).not.toBe(self);

        const awaited = await result;

        expect(awaited).not.toBe(await other);
        expect(awaited).toStrictEqual(await other);
        expect(spy).toHaveBeenCalledTimes(1);
      },
    );

    it("does not call internal `Option`'s `or` method and returns `None` if provided default `Promise<Option<T>>` rejects", async () => {
      const inner = some(one);
      const spy = jest.spyOn(inner, "or");
      const self = pendingOption(inner);
      const result = self.or(rejectedPromise());

      expect(result).not.toBe(self);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("orElse", () => {
    it("does not call provided callback and returns shallow copy of inner `Option` if self is `Some`", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn();
      const result = self.orElse(callback);

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).not.toHaveBeenCalled();
    });

    it.each([some(two), Promise.resolve(some(two))])(
      "calls provided callback and returns its (awaited) result `%O` if self is `None`",
      async (other) => {
        const inner = none();
        const self = pendingOption(inner);
        const callback = jest.fn(() => other);
        const result = self.orElse(callback);

        expect(isPendingOption(result)).toBe(true);

        const awaited = await result;

        expect(awaited).not.toBe(inner);
        expect(awaited.unwrap()).toBe((await other).unwrap());
        expect(callback).toHaveBeenCalledTimes(1);
      },
    );

    it("return `None` if self is `None` and provided callback throws an exception", async () => {
      const inner = none();
      const self = pendingOption(inner);
      const callback = jest.fn(syncErrorCallback());
      const result = self.orElse(callback);

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isNone()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("return `None` if self is `None` and `Promise` in provided callback rejects", async () => {
      const inner = none();
      const self = pendingOption(inner);
      const callback = jest.fn(asyncErrorCallback());
      const result = self.orElse(callback);

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.isNone()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("tap", () => {
    it("calls provided callback with copy of inner `Option` once resolved", async () => {
      const inner = some(one);
      const spy = jest.spyOn(inner, "copy");
      const self = pendingOption(inner);
      let capturedOption: Option<number> = none();
      const callback = jest.fn((opt: Option<number>) => {
        capturedOption = opt;
      });

      const result = self.tap(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(capturedOption.isSome()).toBe(true);
      expect(capturedOption).not.toBe(inner);
      expect(capturedOption.unwrap()).toBe(one);
    });

    it("calls provided callback with `None` if self rejects", async () => {
      const self = pendingOption(rejectedPromise());
      let capturedOption: Option<number> = some(zero);
      const callback = jest.fn((opt: Option<number>) => {
        capturedOption = opt;
      });

      const result = self.tap(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(capturedOption.isNone()).toBe(true);
    });

    it("ignores errors thrown by the callback and returns a copy of the resolved option", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn(() => {
        throw new Error("error");
      });

      const result = self.tap(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("ignores rejections in callback's returned Promise", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn(() => Promise.reject(new Error("error")));

      const result = self.tap(callback);

      expect(isPendingOption(result)).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("transpose", () => {
    it("returns a `PendingResult<Option<V>, E>` with `Ok(None)` if self resolves to `None`", async () => {
      const inner = none<Result<number, string>>();
      const self = pendingOption(inner);
      const spy = jest.spyOn(inner, "transpose");
      const result = self.transpose();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(spy).toHaveBeenCalledTimes(1);
      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap().isNone()).toBe(true);
    });

    it("returns a `PendingResult<Option<V>, E>` with `Ok(Some(v))` if self resolves to `Some(Ok(v))`", async () => {
      const inner = some(ok(one));
      const self = pendingOption(inner);
      const spy = jest.spyOn(inner, "transpose");
      const result = self.transpose();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(spy).toHaveBeenCalledTimes(1);
      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap().isSome()).toBe(true);
      expect(awaited.unwrap().unwrap()).toBe(one);
    });

    it("returns a `PendingResult<Option<V>`, E> with Err(e) if self resolves to Some(Err(e))", async () => {
      const error = "error";
      const inner = some(err<number, string>(error));
      const self = pendingOption(inner);
      const result = self.transpose();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isErr()).toBe(true);
      expect(awaited.unwrapErr().expected).toBe(error);
      expect(awaited.unwrapErr().unexpected).toBeUndefined();
    });

    it("returns a `PendingResult<Option<V>, E>` with Ok(None) if self rejects", async () => {
      const self = pendingOption<Result<number, string>>(
        Promise.reject(new Error("result error")),
      );
      const result = self.transpose();

      expect(isPendingResult(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isOk()).toBe(true);
      expect(awaited.unwrap().isNone()).toBe(true);
    });
  });

  describe("xor", () => {
    it("returns None if both self and provided option are None", async () => {
      const inner = none<number>();
      const self = pendingOption(inner);
      const other = none<number>();
      const result = self.xor(other);

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
    });

    it("returns None if both self and provided option are Some", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const other = some(two);
      const result = self.xor(other);

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
    });

    it("returns Some from self if self is Some and provided option is None", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const other = none<number>();
      const result = self.xor(other);

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap()).toBe(one);
    });

    it("returns Some from provided option if self is None and provided option is Some", async () => {
      const inner = none<number>();
      const self = pendingOption(inner);
      const other = some(two);
      const result = self.xor(other);

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isSome()).toBe(true);
      expect(awaited.unwrap()).toBe(two);
    });

    it.each([Promise.resolve(some(two)), Promise.resolve(none<number>())])(
      "works with a Promise<Option<T>> as the provided option",
      async (other) => {
        const inner = some(one);
        const self = pendingOption(inner);
        const result = self.xor(other);

        expect(isPendingOption(result)).toBe(true);

        const awaited = await result;
        const awaitedOther = await other;

        if (awaitedOther.isSome()) {
          expect(awaited.isNone()).toBe(true);
        } else {
          expect(awaited.isSome()).toBe(true);
          expect(awaited.unwrap()).toBe(one);
        }
      },
    );

    it("returns None if provided option Promise rejects", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const result = self.xor(rejectedPromise());

      expect(isPendingOption(result)).toBe(true);

      const awaited = await result;

      expect(awaited.isNone()).toBe(true);
    });
  });
});
