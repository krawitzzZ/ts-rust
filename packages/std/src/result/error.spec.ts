import {
  ResultError,
  ResultErrorKind,
  expectedError,
  unexpectedError,
  isCheckedError,
} from "./error";

describe("Result error", () => {
  describe("ResultError", () => {
    describe("clone", () => {
      it("creates a deep clone of itself", () => {
        const original = new ResultError(
          "Test error",
          ResultErrorKind.Unexpected,
        );
        const clone = original.clone();

        expect(clone).not.toBe(original);
        expect(clone).toBeInstanceOf(ResultError);
        expect(clone.kind).toBe(original.kind);
        expect(clone.message).toBe(original.message);
      });

      it("creates a deep clone of itself and handles nested reasons", () => {
        const reason = new Error("Inner error");
        const original = new ResultError(
          "Test error",
          ResultErrorKind.Unexpected,
          reason,
        );
        const clone = original.clone();

        expect(clone.reason).not.toBe(original.reason);
        expect(clone.reason).toBeInstanceOf(Error);
        expect(clone.reason.message).toBe(reason.message);
      });
    });
  });

  describe("CheckedError", () => {
    describe("helper functions", () => {
      describe("expected", () => {
        it("creates an expected `CheckedError` with provided error", () => {
          const error = new Error("Test expected error");
          const checkedError = expectedError(error);

          expect(isCheckedError(checkedError)).toBe(true);
          expect(checkedError.isExpected()).toBe(true);
          expect(checkedError.isUnexpected()).toBe(false);
          expect(checkedError.expected).toBe(error);
        });
      });

      describe("unexpected", () => {
        it("creates an unexpected `CheckedError` with provided `ResultError`", () => {
          const resultError = new ResultError(
            "Test unexpected",
            ResultErrorKind.Unexpected,
          );
          const checkedError = unexpectedError(resultError);

          expect(isCheckedError(checkedError)).toBe(true);
          expect(checkedError.isUnexpected()).toBe(true);
          expect(checkedError.unexpected).toBe(resultError);
        });

        it("creates an unexpected `CheckedError` with provided `ResultError` arguments", () => {
          const reason = new Error("Reason");
          const checkedError = unexpectedError(
            "Test message",
            ResultErrorKind.PredicateException,
            reason,
          );

          expect(isCheckedError(checkedError)).toBe(true);
          expect(checkedError.isUnexpected()).toBe(true);
          expect(checkedError.unexpected?.kind).toBe(
            ResultErrorKind.PredicateException,
          );
          expect(checkedError.unexpected?.message).toBe(
            "[PredicateException] Test message. Reason: Error: Reason",
          );
          expect(checkedError.unexpected?.reason).toBe(reason);
        });
      });

      describe("isCheckedError", () => {
        it("returns `true` if called with expected `CheckedError`", () => {
          const error = expectedError("test error");
          expect(isCheckedError(error)).toBe(true);
        });

        it("returns `true` if called with unexpected `CheckedError`", () => {
          const error = unexpectedError("error", ResultErrorKind.Unexpected);
          expect(isCheckedError(error)).toBe(true);
        });

        it.each([
          null,
          undefined,
          0,
          1,
          NaN,
          "",
          {},
          [],
          true,
          false,
          new Error(),
        ])("returns `false` if called with '%s'", (error) => {
          expect(isCheckedError(error)).toBe(false);
        });
      });
    });

    describe("get", () => {
      it("returns error of type `E` if inner error is expected `E` error", () => {
        const expectedErr = "expected error";
        const checkedError = expectedError(expectedErr);

        expect(checkedError.get()).toBe(expectedErr);
      });

      it("returns error of type `ResultError` if inner error is unexpected `ResultError`", () => {
        const resultError = new ResultError(
          "unexpected",
          ResultErrorKind.Unexpected,
        );
        const checkedError = unexpectedError(resultError);

        expect(checkedError.get()).toBe(resultError);
      });
    });

    describe("handle", () => {
      it("calls first callback and returns its result if inner error is expected `E` error", () => {
        const value = "test value";
        const checkedError = expectedError(value);

        const unexpectedCallback = jest.fn(() => "unexpected");
        const expectedCallback = jest.fn(() => "expected");

        const result = checkedError.handle(
          unexpectedCallback,
          expectedCallback,
        );

        expect(expectedCallback).toHaveBeenCalledTimes(1);
        expect(expectedCallback).toHaveBeenCalledWith(value);
        expect(unexpectedCallback).not.toHaveBeenCalled();
        expect(result).toBe("expected");
      });

      it("calls second callback and returns its result if inner error is unexpected `ResultError` error", () => {
        const resultError = new ResultError(
          "error",
          ResultErrorKind.Unexpected,
        );
        const checkedError = unexpectedError(resultError);

        const unexpectedCallback = jest.fn(() => "unexpected");
        const expectedCallback = jest.fn(() => "expected");

        const result = checkedError.handle(
          unexpectedCallback,
          expectedCallback,
        );

        expect(unexpectedCallback).toHaveBeenCalledTimes(1);
        expect(unexpectedCallback).toHaveBeenCalledWith(resultError);
        expect(expectedCallback).not.toHaveBeenCalled();
        expect(result).toBe("unexpected");
      });
    });

    describe("isExpected", () => {
      it("returns `true` if inner error is expected `E` error", () => {
        const checkedError = expectedError("test error");
        expect(checkedError.isExpected()).toBe(true);
      });

      it("returns `false` if inner error is unexpected `ResultError` error", () => {
        const checkedError = unexpectedError(
          "test",
          ResultErrorKind.Unexpected,
        );
        expect(checkedError.isExpected()).toBe(false);
      });
    });

    describe("isUnexpected", () => {
      it("returns `false` if inner error is expected `E` error", () => {
        const checkedError = expectedError("test error");
        expect(checkedError.isUnexpected()).toBe(false);
      });

      it("returns `true` if inner error is unexpected `ResultError` error", () => {
        const checkedError = unexpectedError(
          "test",
          ResultErrorKind.Unexpected,
        );
        expect(checkedError.isUnexpected()).toBe(true);
      });
    });

    describe("toString", () => {
      it.each([
        ["expected string", expectedError("test error string")],
        ["expected error", expectedError(new Error("test error"))],
        [
          "unexpected result error",
          unexpectedError("test", ResultErrorKind.Unexpected),
        ],
      ])("returns string representation of self for %s", (_, error) => {
        const result = error.toString();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
