import { createMock } from "@golevelup/ts-jest";
import { Result } from "../result";
import { Option, phantom } from "./interface";
import { isPendingOption, none, pendingOption, some } from "./option";

// TODO(nikita.demin): test that all the methods that return Awaited<T> actually return awaited values

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

    it("calls provided `onSuccess` callback with `None` if self rejects (never calls `onError` callback)", async () => {
      const pending = pendingOption(rejectedPromise());
      const onSuccess = jest.fn();
      const onError = jest.fn();

      await pending.then(onSuccess, onError);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ [phantom]: "none" }),
      );
      expect(onError).not.toHaveBeenCalled();
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

    it("calls provided synchronous callback and returns its result if self is `Some`", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const other = some(two);
      const callback = jest.fn(() => other);
      const result = await self.andThen(callback);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(two);
      expect(result).not.toBe(inner);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

    it("calls provided asynchronous callback and returns its result if self is `Some`", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const other = some(two);
      const callback = jest.fn(() => Promise.resolve(other));
      const result = await self.andThen(callback);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(two);
      expect(result).not.toBe(inner);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(one);
    });

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
    it("returns `None` if self is `None`", async () => {
      const option: Option<Option<number>> = none();
      const self = pendingOption(option);
      const result = await self.flatten();

      expect(result.isNone()).toBe(true);
      expect(result).not.toBe(option);
    });

    it("returns shallow copy of awaited inner `Option` if self is `Some<Option<T>>`", async () => {
      const inner = some(one);
      const outer = some(inner);
      const self = pendingOption(Promise.resolve(outer));
      const result = await self.flatten();

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(one);
      expect(result).not.toBe(inner);
      expect(result).not.toBe(outer);
    });
  });

  describe("inspect", () => {
    it("calls `inspect` on inner `Option` and returns new instance of self with clone of inner `Option`", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn();
      const inspectSpy = jest.spyOn(inner, "inspect");
      const cloneSpy = jest.spyOn(inner, "clone");
      const result = self.inspect(callback);

      expect(result).not.toBe(self);
      expect(inspectSpy).not.toHaveBeenCalled();
      expect(cloneSpy).not.toHaveBeenCalled();

      const awaited = await result;

      expect(awaited).not.toBe(inner);
      expect(awaited.unwrap()).toBe(one);
      expect(inspectSpy).toHaveBeenCalledTimes(1);
      expect(cloneSpy).toHaveBeenCalledTimes(1);
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

  describe("match", () => {
    it("calls inner `Option`'s `match` method with provided callbacks", async () => {
      const inner = some(one);
      const spy = jest.spyOn(inner, "match").mockReturnValueOnce(zero);
      const self = pendingOption(inner);
      const onNone = jest.fn();
      const onSome = jest.fn();
      const awaited = await self.match(onSome, onNone);

      expect(awaited).toBe(zero);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(onSome, onNone);
    });
  });

  // TODO(nikita.demin): check if Sync<E> needed in interface
  describe("okOr", () => {
    it("calls inner `Option`'s `okOr` method with provided error", async () => {
      const error = new Error();
      const inner = some(one);
      const res = createMock<Result<number, Error>>();
      const spy = jest.spyOn(inner, "okOr").mockReturnValueOnce(res);
      const self = pendingOption(inner);
      const awaited = await self.okOr(error);

      expect(awaited).toBe(res);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(error);
    });
  });

  // TODO(nikita.demin): think of how to handle the error if thrown (after result is done)
  describe("okOrElse", () => {
    it("does not call provided callback and returns `Ok` with inner value if self is `Some`", async () => {
      const inner = some(one);
      const self = pendingOption(inner);
      const callback = jest.fn();
      const result = self.okOrElse(callback);

      expect(result).not.toBe(self);

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

        const awaited = await result;

        expect(awaited.isErr()).toBe(true);
        expect(awaited.unwrapErr()).toBe(await error);
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

        expect(awaited).toBe(await other);
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
});
