import { Result } from "./interface";
import { err, ok, pendingResult } from "./result";

describe("PendingResult", () => {
  const one = 11;
  const two = 222;
  //   const zero = 0;
  const _syncErrorCallback =
    <T = Result<number, string>>(e?: Error) =>
    (): T => {
      throw e ?? new Error("sync error");
    };
  const _asyncErrorCallback =
    <T = Result<number, string>>(e?: Error) =>
    (): Promise<T> =>
      Promise.reject(e ?? new Error("async error"));
  const _rejectedPromise = <T = Result<number, string>>(
    e?: Error,
  ): Promise<T> => Promise.reject(e ?? new Error("async error"));

  describe("then", () => {
    it("calls provided `onSuccess` callback with inner `Ok` if self resolves", async () => {
      const inner = ok(one);
      const pending = pendingResult(inner);
      const onSuccess = jest.fn();
      const onError = jest.fn();

      await pending.then(onSuccess, onError);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(inner);
      expect(onError).not.toHaveBeenCalled();
    });

    it("calls provided `onSuccess` callback with inner `Err` if self resolves", async () => {
      const inner = err(one);
      const pending = pendingResult(inner);
      const onSuccess = jest.fn();
      const onError = jest.fn();

      await pending.then(onSuccess, onError);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(inner);
      expect(onError).not.toHaveBeenCalled();
    });

    it("calls provided `onError` callback if self rejects (which is only possible if typescript is hijacked)", async () => {
      let errorCaught = false;
      const error = new Error("error");
      // @ts-expect-error -- for testing
      const failure = Promise.resolve<Result<number, string>>(null);
      const catchSpy = jest
        .spyOn(failure, "catch")
        .mockImplementationOnce(() => Promise.reject(error));
      const pending = pendingResult(failure);
      const onSuccess = jest.fn();
      const onError = jest.fn((): Result<number, string> => {
        errorCaught = true;
        return ok(two);
      });

      const result = await pending.then(onSuccess, onError);

      expect(errorCaught).toBe(true);
      expect(result.unwrap()).toBe(two);
      expect(catchSpy).toHaveBeenCalledTimes(1);
      expect(catchSpy).toHaveBeenCalledWith(expect.any(Function));
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe("catch", () => {
    it("calls provided callback if self rejects (which is only possible if typescript is hijacked)", async () => {
      let errorCaught = false;
      const error = new Error("error");
      // @ts-expect-error -- for testing
      const failure = Promise.resolve<Result<number, string>>(null);
      const catchSpy = jest
        .spyOn(failure, "catch")
        .mockImplementationOnce(() => Promise.reject(error));
      const pending = pendingResult(failure);
      const onError = jest.fn((): Result<number, string> => {
        errorCaught = true;
        return ok(two);
      });

      const result = await pending.catch(onError);

      expect(errorCaught).toBe(true);
      expect(result.unwrap()).toBe(two);
      expect(catchSpy).toHaveBeenCalledTimes(1);
      expect(catchSpy).toHaveBeenCalledWith(expect.any(Function));
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
