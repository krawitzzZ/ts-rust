import { LazyPromise } from "./lazyPromise";

describe("LazyPromise", () => {
  it("does not execute immediately", async () => {
    const executor = jest.fn((resolve) => resolve("executed"));
    const lp = new LazyPromise(executor);

    expect(executor).not.toHaveBeenCalled();

    await lp;

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("resolves correctly", async () => {
    const lp = new LazyPromise((resolve) => resolve("success"));

    await expect(lp).resolves.toBe("success");
  });

  it("rejects correctly", async () => {
    const lp = new LazyPromise((_, reject) => reject("error"));

    await expect(lp).rejects.toBe("error");
  });

  it("supports then() chaining", async () => {
    const lp = new LazyPromise<number>((resolve) => resolve(2)).then(
      (x) => x * 3,
    );

    await expect(lp).resolves.toBe(6);
  });

  it("supports catch() for error handling", async () => {
    const lp = new LazyPromise((_, reject) => reject("failure")).catch(
      (err) => `handled: ${err}`,
    );

    await expect(lp).resolves.toBe("handled: failure");
  });

  it("supports finally()", async () => {
    const finallyCallback = jest.fn();
    const lp = new LazyPromise((resolve) => resolve("done")).finally(
      finallyCallback,
    );

    await lp;

    expect(finallyCallback).toHaveBeenCalled();
  });

  it("supports LazyPromise.resolve()", async () => {
    const lp = LazyPromise.resolve("resolved");
    await expect(lp).resolves.toBe("resolved");

    const lp1 = LazyPromise.resolve();
    await expect(lp1).resolves.toBeUndefined();
  });

  it("supports LazyPromise.reject()", async () => {
    const lp = LazyPromise.reject("rejected");
    await expect(lp).rejects.toBe("rejected");
  });

  it("supports LazyPromise.fromFactory()", async () => {
    const lp = LazyPromise.fromFactory(() => Promise.resolve("factory"));

    await expect(lp).resolves.toBe("factory");
  });

  it("rejects if LazyPromise.fromFactory() throws synchronously", async () => {
    const error = new Error("oops");
    const lp = LazyPromise.fromFactory(() => {
      throw error;
    });

    await expect(lp).rejects.toThrow(error);
  });

  it("does not execute fromFactory() immediately", async () => {
    const factory = jest.fn(() => Promise.resolve("delayed"));
    const lp = LazyPromise.fromFactory(factory);

    expect(factory).not.toHaveBeenCalled();

    await lp;

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("supports pipe() for transformation", async () => {
    const lp = new LazyPromise<string>((resolve) => resolve("hello")).pipe(
      (x) => x.toUpperCase(),
    );

    await expect(lp).resolves.toBe("HELLO");
  });

  it("supports pipe() with error recovery", async () => {
    const lp = new LazyPromise((_, reject) => reject("oops")).pipe(
      (x) => x,
      () => "recovered",
    );

    await expect(lp).resolves.toBe("recovered");
  });

  it("supports recover() for error handling", async () => {
    const lp = new LazyPromise((_, reject) => reject("failure")).recover(
      () => "recovered",
    );

    await expect(lp).resolves.toBe("recovered");
  });

  it("does not execute immediately when created", async () => {
    const executor = jest.fn((resolve) => {
      resolve(42);
    });
    const _lazy = new LazyPromise(executor);

    expect(executor).not.toHaveBeenCalled();
  });

  it("executes only when awaited", async () => {
    const executor = jest.fn((resolve) => {
      resolve(42);
    });
    const lazy = new LazyPromise(executor);

    expect(executor).not.toHaveBeenCalled();

    await lazy;

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("does not execute when pipe is called", async () => {
    const executor = jest.fn((resolve) => resolve(42));
    const lazy = new LazyPromise<number>(executor);
    const piped = lazy.pipe((x) => x * 2);

    expect(executor).not.toHaveBeenCalled();

    await piped;

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("does not execute when recover is called", async () => {
    const executor = jest.fn((resolve) => resolve(42));
    const lazy = new LazyPromise(executor);
    const _recovered = lazy.recover(() => 0);

    expect(executor).not.toHaveBeenCalled();
  });

  it("applies pipe transformations only when awaited", async () => {
    const executor = jest.fn((resolve) => resolve(10));
    const lazy = new LazyPromise<number>(executor)
      .pipe((x) => x * 2)
      .pipe((x) => x + 5);

    await expect(lazy).resolves.toBe(25);

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("applies recover transformation only when awaited", async () => {
    const executor = jest.fn((_resolve, reject) => reject(new Error("fail")));
    const lazy = new LazyPromise(executor).recover(() => 99);

    await expect(lazy).resolves.toBe(99);

    expect(executor).toHaveBeenCalledTimes(1);
  });
});
