# documentation

## 0.1.0

### Minor Changes

- 7eace1e: Add `runGenerator` / `runAsyncGenerator` to `yield*` a Result (Rust `?`, optional `mkErr`); drop Option/Result `iter`
- 24b005f: Add fromUndefined/fromPromise and improve Option/Result inference (InferType on and/andThen/match, combine Ok tuples, discriminated PendingResult.check/try)

### Patch Changes

- bc8eb5b: Adjust is_And types and return copies consistently
- e6e8c59: Fix the doc typos and errors
