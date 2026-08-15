/**
 * Compile-time contract tests for `@ts-rust/std`.
 *
 * Call patterns a real project would write (config, cache, parse pipelines,
 * HTTP, narrowing, mutation). The file must typecheck.
 *
 * Cases that do not infer or assign the way the API suggests belong in the
 * Errors section at the bottom.
 */
import type {
  CheckedError,
  Err,
  None,
  Option,
  PendingOption,
  PendingResult,
  Result,
  SettledOption,
  SettledResult,
} from "./index";
import {
  err,
  fromNullable,
  fromPromise,
  fromUndefined,
  isCheckedError,
  isOption,
  isPendingOption,
  isPendingResult,
  isResult,
  none,
  ok,
  pendingErr,
  pendingNone,
  pendingOk,
  pendingOption,
  pendingResult,
  pendingSome,
  run,
  runGenerator,
  runAsync,
  runAsyncGenerator,
  runPendingResult,
  runResult,
  some,
} from "./index";

type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type User = { readonly id: number; readonly name: string };
type Session = { readonly user: User; readonly token: string };
type RepoError = "not_found" | "conflict" | "unavailable";
type HttpError = { readonly kind: "http"; readonly status: number };
type ParseError = { readonly kind: "parse"; readonly msg: string };
type AppError = HttpError | ParseError;

type CheckOk<T> = readonly [true, T];
type CheckErr<E> = readonly [false, CheckedError<E>];
type CheckUnion<T, E> = CheckOk<T> | CheckErr<E>;
type TryOk<T> = readonly [true, undefined, T];
type TryErr<E> = readonly [false, CheckedError<E>, undefined];
type TryUnion<T, E> = TryOk<T> | TryErr<E>;

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const _okVal = ok(1);
const _errVal = err("fail");
const _someVal = some(1);
const _noneVal = none();

const _okExact: Eq<typeof _okVal, Result<number, unknown>> = true;
const _errExact: Eq<typeof _errVal, Result<unknown, string>> = true;
const _someExact: Eq<typeof _someVal, Option<number>> = true;
const _noneExact: Eq<typeof _noneVal, Option<unknown>> = true;

const _someAssign: Option<number> = some(1);
const _okAssign: Result<number, string> = ok(1);

const _okVoid = ok();
const _errVoid = err();
const _okVoidExact: Eq<typeof _okVoid, Result<void, unknown>> = true;
const _errVoidExact: Eq<typeof _errVoid, Result<unknown, void>> = true;
const _errVoidAssign: Result<number, void> = err();

const _pendingOkVal = pendingOk(1);
const _pendingErrVal = pendingErr("fail");
const _pendingNoneVal = pendingNone();
const _pendingSomeVal = pendingSome(1);

const _pendingOkExact: Eq<
  typeof _pendingOkVal,
  PendingResult<number, unknown>
> = true;
const _pendingErrExact: Eq<
  typeof _pendingErrVal,
  PendingResult<unknown, string>
> = true;
const _pendingNoneExact: Eq<
  typeof _pendingNoneVal,
  PendingOption<unknown>
> = true;
const _pendingSomeExact: Eq<
  typeof _pendingSomeVal,
  PendingOption<number>
> = true;

const _pendingOkAssign: PendingResult<number, string> = pendingOk(1);
const _pendingErrAssign: PendingResult<number, string> = pendingErr("fail");
const _pendingNoneAssign: PendingOption<number> = pendingNone();
const _pendingSomeAssign: PendingOption<number> = pendingSome(1);

const _pendingOkPromise = pendingOk(Promise.resolve(1));
const _pendingOkPromiseExact: Eq<
  typeof _pendingOkPromise,
  PendingResult<number, unknown>
> = true;

const _pendingSomePromise = pendingSome(Promise.resolve("ada"));
const _pendingSomePromiseExact: Eq<
  typeof _pendingSomePromise,
  PendingOption<string>
> = true;

const _pendingFromOption = pendingOption(some(1));
const _pendingFromOptionExact: Eq<
  typeof _pendingFromOption,
  PendingOption<number>
> = true;

const _pendingFromResult = pendingResult(ok(1));
const _pendingFromResultExact: Eq<
  typeof _pendingFromResult,
  PendingResult<number, unknown>
> = true;

const _pendingFromFactory = pendingOption(() => some("x"));
const _pendingFromFactoryExact: Eq<
  typeof _pendingFromFactory,
  PendingOption<string>
> = true;

const _pendingResultFactory = pendingResult(() => err("no"));
const _pendingResultFactoryExact: Eq<
  typeof _pendingResultFactory,
  PendingResult<unknown, string>
> = true;

// ---------------------------------------------------------------------------
// Config / env / form fields
// ---------------------------------------------------------------------------

const _portEnv: string | undefined = "3000";
const _portOpt = fromUndefined(_portEnv).map(Number);
const _portOptExact: Eq<typeof _portOpt, Option<number>> = true;
const _port: number = _portOpt.unwrapOr(3000);

const _emailField: string | null = "a@b.c";
const _email = fromNullable(_emailField);
const _emailExact: Eq<typeof _email, Option<string>> = true;

const _nullable: number | null = 1;
const _fromNullableSome: Option<number> = fromNullable(_nullable);
const _fromNullableNone: Option<number> = fromNullable(null);

const _undefinable: number | undefined = 1;
const _fromUndefinedSome: Option<number> = fromUndefined(_undefinable);
const _fromUndefinedNone: Option<number> = fromUndefined(undefined);

declare const _nullish: number | null | undefined;
const _fromUndefinedNull: Option<number | null> = fromUndefined(_nullish);

const _fromNullableParam = (v: number | null | undefined): Option<number> =>
  fromNullable(v);

const _fromUndefinedParam = (v: number | undefined): Option<number> =>
  fromUndefined(v);

const _fromNullableNullish = fromNullable(_nullish);
const _fromNullableNullishExact: Eq<
  typeof _fromNullableNullish,
  Option<number>
> = true;

const _fromNullableUndef = fromNullable(undefined);
const _fromNullableUndefExact: Eq<
  typeof _fromNullableUndef,
  Option<never>
> = true;

const _fromNullableNull = fromNullable(null);
const _fromNullableNullExact: Eq<
  typeof _fromNullableNull,
  Option<never>
> = true;

const _missingPort = fromUndefined(undefined as string | undefined);
const _missingPortNum: number = _missingPort
  .map((s) => Number.parseInt(s, 10))
  .unwrapOr(8080);

type Form = {
  readonly email: string | null;
  readonly age: string | undefined;
};

const _form: Form = { email: "a@b.c", age: "32" };
const _formEmail: Option<string> = fromNullable(_form.email);
const _formAge: Option<number> = fromUndefined(_form.age).andThen((raw) => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? some(n) : none();
});

const _authFrom = (header: string | undefined): Result<string, string> =>
  fromUndefined(header).okOr("unauthorized");

const _header: string | undefined = undefined;
const _auth = fromUndefined<string>(_header).okOr("unauthorized");
const _authExact: Eq<typeof _auth, Result<string, string>> = true;

// ---------------------------------------------------------------------------
// Parse / validate / repository pipeline
// ---------------------------------------------------------------------------

const _chained = ok(1).andThen<number, string>((n) =>
  n > 0 ? ok(n) : err("neg"),
);
const _chainedExact: Eq<typeof _chained, Result<number, string>> = true;

const _and = ok(1).and(err(new Error("no")));
const _andExact: Eq<typeof _and, Result<unknown, Error>> = true;

const _parseInt = (raw: string): Result<number, string> => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? ok(n) : err("not a number");
};

const _loadUser = (id: number): Result<User, string> =>
  id > 0 ? ok({ id, name: "ada" }) : err("not found");

const _toSession = (user: User): Session => ({ user, token: "t" });

const _login = _parseInt("1").andThen(_loadUser).map(_toSession);
const _loginExact: Eq<typeof _login, Result<Session, string>> = true;

const _loginFail: Result<Session, string> = err<string, string>("unauthorized")
  .andThen(_parseInt)
  .andThen(_loadUser)
  .map(_toSession);

const _findUser = (id: number): Result<User, RepoError> =>
  id > 0 ? ok({ id, name: "ada" }) : err<User, RepoError>("not_found");

const _saveUser = (user: User): Result<void, RepoError> =>
  user.id > 0 ? ok() : err<void, RepoError>("conflict");

const _upsert: Result<void, RepoError> = _findUser(1).andThen(_saveUser);

const _tagged = (status: number): Result<User, AppError> =>
  status === 200
    ? ok({ id: 1, name: "ada" })
    : err<User, AppError>({ kind: "http", status });

const _taggedExact: Eq<
  ReturnType<typeof _tagged>,
  Result<User, AppError>
> = true;

const _mapTaggedErr: Result<User, string> = _tagged(404).mapErr((e) =>
  e.kind === "http" ? `http ${e.status}` : e.msg,
);

// ---------------------------------------------------------------------------
// Fallback: or / orElse / xor (annotated receivers)
// ---------------------------------------------------------------------------

const _cached: Result<User, string> = err<User, string>("cache miss");
const _fromDb: Result<User, string> = ok({ id: 1, name: "ada" });
const _user: Result<User, string> = _cached.or(_fromDb);

const _userOrElse: Result<User, Error> = _cached.orElse(() =>
  err<User, Error>(new Error("db down")),
);

const _okOrFallback: Result<number, string> = ok<number, string>(1).or(
  err("unused"),
);

const _missBound: Result<number, string> = err<number, string>("missing");
const _errOrOkBound: Result<number, string> = _missBound.or(ok(1));
const _errOrElseBound: Result<number, string> = _missBound.orElse(() => ok(0));

const _noneBound: Option<number> = none<number>();
const _noneOrSomeBound: Option<number> = _noneBound.or(some(1));
const _noneXorSomeBound: Option<number> = _noneBound.xor(some(1));
const _noneOrElseBound: Option<number> = _noneBound.orElse(() => some(0));

const _someXorNone: Option<number> = some(1).xor(none());
const _someOrNone: Option<number> = some(1).or(none());

const _noneAndSome = none().and(some(1));
const _noneAndSomeExact: Eq<typeof _noneAndSome, Option<number>> = true;

const _errAndOk = err("no").and(ok(1));
const _errAndOkExact: Eq<typeof _errAndOk, Result<number, unknown>> = true;

const _pendingOr: PendingResult<number, string> = pendingErr<number, string>(
  "miss",
).or(ok(1));

const _pendingNoneAnd: PendingOption<number> = pendingNone().and(some(1));

// ---------------------------------------------------------------------------
// combine
// ---------------------------------------------------------------------------

const _id: Result<number, string> = ok(1);
const _name: Result<string, string> = ok("ada");
const _combined = _id.combine(_name);
const _combinedExact: Eq<
  typeof _combined,
  Result<[number, string], string>
> = true;

const _combineErrAnnotated = ok<number, string>(1).combine(
  err<number, string>("no"),
);
const _combineErrExact: Eq<
  typeof _combineErrAnnotated,
  Result<[number, number], string>
> = true;

const _jsdocA = ok<Promise<number>, string>(Promise.resolve(1));
const _jsdocB = ok<string, string>("hi");
const _jsdocC = err<Date, string>("no");
const _jsdocCombine = _jsdocA.combine(_jsdocB, _jsdocC);
const _jsdocCombineExact: Eq<
  typeof _jsdocCombine,
  Result<[Promise<number>, string, Date], string>
> = true;

const _age: Option<number> = some(32);
const _uname: Option<string> = some("ada");
const _optCombined = _age.combine(_uname);
const _optCombinedExact: Eq<
  typeof _optCombined,
  Option<[number, string]>
> = true;

const _optCombinedNone = some(1).combine(none<string>(), some(true));
const _optCombinedNoneExact: Eq<
  typeof _optCombinedNone,
  Option<[number, string, boolean]>
> = true;

const _jsdocOptCombine = some(Promise.resolve(1)).combine(
  some("hi"),
  none<Date>(),
);
const _jsdocOptCombineExact: Eq<
  typeof _jsdocOptCombine,
  Option<[Promise<number>, string, Date]>
> = true;

// ---------------------------------------------------------------------------
// Narrowing / type guards
// ---------------------------------------------------------------------------

const _narrowOk = (r: Result<User, string>): User | undefined => {
  if (r.isOk()) {
    const user: User = r.value;
    return user;
  }
  return undefined;
};

const _narrowErr = (r: Result<User, string>): string | undefined => {
  if (r.isErr()) {
    const error: CheckedError<string> = r.error;
    return error.expected;
  }
  return undefined;
};

const _narrowExpected = (r: Result<User, string>): string | undefined => {
  if (r.isErr() && r.error.isExpected()) {
    const expected: string = r.error.expected;
    return expected;
  }
  return undefined;
};

const _narrowSome = (o: Option<User>): User | undefined => {
  if (o.isSome()) {
    const user: User = o.value;
    return user;
  }
  return undefined;
};

const _narrowNone = (o: Option<User>): boolean => o.isNone();

const _isOkAnd = (r: Result<number, string>): Result<number, string> => {
  r.isOkAnd((n) => n > 0);
  return r;
};

const _isSomeAnd = (o: Option<number>): Option<number> => {
  o.isSomeAnd((n) => n > 0);
  return o;
};

const _isErrAnd = (r: Result<number, string>): boolean =>
  r.isErrAnd((e) => e.expected === "fail");

const _guardUnknown = (x: unknown): number | undefined => {
  if (isResult(x) && x.isOk()) {
    const value: unknown = x.value;
    return typeof value === "number" ? value : undefined;
  }
  if (isOption(x) && x.isSome()) {
    const value: unknown = x.value;
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
};

const _guardPending = (x: unknown): boolean =>
  isPendingResult(x) || isPendingOption(x);

const _guardChecked = (e: unknown): string | undefined => {
  if (isCheckedError(e) && e.isExpected()) {
    const expected: unknown = e.expected;
    return typeof expected === "string" ? expected : undefined;
  }
  return undefined;
};

const _containsOk: boolean = ok(1).contains(1);
const _containsSome: boolean = some("ada").contains("ada");

// ---------------------------------------------------------------------------
// check() / try()
//
// `ok` / `err` return `Result`, so check/try on those values are the union
// of Ok and Err tuples. A value typed as `Result<T, E>` is the same.
// ---------------------------------------------------------------------------

declare const _resultUnion: Result<number, string>;
const _checkUnion = _resultUnion.check();
const _checkUnionExact: Eq<
  typeof _checkUnion,
  CheckUnion<number, string>
> = true;

const _checkOk = ok(1).check();
const _checkOkExact: Eq<typeof _checkOk, CheckUnion<number, unknown>> = true;

const _checkErr = err("fail").check();
const _checkErrExact: Eq<typeof _checkErr, CheckUnion<unknown, string>> = true;

const _tryUnion = _resultUnion.try();
const _tryUnionExact: Eq<typeof _tryUnion, TryUnion<number, string>> = true;

const _pendingCheck = pendingOk(1).check();
const _pendingCheckExact: Eq<
  typeof _pendingCheck,
  Promise<readonly [true, number] | readonly [false, CheckedError<unknown>]>
> = true;

const _pendingTry = pendingOk(1).try();
const _pendingTryExact: Eq<
  typeof _pendingTry,
  Promise<
    | readonly [true, undefined, number]
    | readonly [false, CheckedError<unknown>, undefined]
  >
> = true;

// ---------------------------------------------------------------------------
// unwrap / match / mapOr
// ---------------------------------------------------------------------------

const _unwrapOk: number = ok(1).unwrap();
const _unwrapOr: number = err<number, string>("x").unwrapOr(0);
const _unwrapOrElse: User = err<User, string>("x").unwrapOrElse(() => ({
  id: 0,
  name: "guest",
}));

const _unwrapErr = err("fail").unwrapErr();
const _unwrapErrExact: Eq<typeof _unwrapErr, CheckedError<string>> = true;
const _expected: string | undefined = _unwrapErr.expected;

const _expectOk: number = ok(1).expect("must have id");
const _expectErr: CheckedError<string> = err("fail").expectErr("must fail");

const _matched: number = _resultUnion.match(
  (n) => n,
  (e) => e.expected?.length ?? 0,
);

const _optMatched: string = fromNullable(_emailField).match(
  (s) => s,
  () => "anonymous",
);

const _mapOrOk: string = ok(1).mapOr("0", (n) => n.toFixed(0));
const _mapOrErr: string = err<number, string>("x").mapOr("0", (n) =>
  n.toFixed(0),
);
const _mapOrElseOk: string = ok(1).mapOrElse(
  () => "0",
  (n) => n.toFixed(0),
);

const _optMapOr: number = some(2).mapOr(0, (n) => n * 2);
const _optMapOrElse: number = none<number>().mapOrElse(
  () => 0,
  (n) => n * 2,
);

const _noneOkOrElse: Result<number, string> = none<number>().okOrElse(
  () => "missing",
);

// ---------------------------------------------------------------------------
// map / mapErr / filter / inspect / tap / mapAll
// ---------------------------------------------------------------------------

const _mapped = ok(1).map((n) => n.toFixed(0));
const _mappedExact: Eq<typeof _mapped, Result<string, unknown>> = true;

const _optMapped: Option<string> = some(1).map((n) => n.toFixed(0));
const _filtered: Option<number> = some(2).filter((n) => n % 2 === 0);
const _noneFilter: Option<number> = none<number>().filter((n) => n > 0);

const _mapErr = err("fail").mapErr((e) => new Error(e));
const _mapErrExact: Eq<typeof _mapErr, Result<unknown, Error>> = true;

const _inspected = ok(1).inspect((n) => n);
const _inspectedExact: Eq<typeof _inspected, Result<number, unknown>> = true;

const _inspectErr = err("fail").inspectErr((e) => e);
const _inspectErrExact: Eq<typeof _inspectErr, Result<unknown, string>> = true;

const _optInspected: Option<number> = some(1).inspect((n) => n);
const _tapped = ok(1).tap((r) => r);
const _tappedExact: Eq<typeof _tapped, Result<number, unknown>> = true;
const _optTapped: Option<number> = some(1).tap((o) => o);

const _errMap = err("fail").map((n) => n);
const _errMapExact: Eq<typeof _errMap, Result<unknown, string>> = true;

const _errMapAnnotated = err<number, string>("fail").map((n) => n + 1);
const _errMapAnnExact: Eq<
  typeof _errMapAnnotated,
  Result<number, string>
> = true;

const _mapAllOk = ok(1).mapAll((r) => r.map((n) => n + 1));
const _mapAllOkExact: Eq<typeof _mapAllOk, Result<number, unknown>> = true;

const _mapAllPending = ok(1).mapAll((r) =>
  Promise.resolve(r.map((n) => n + 1)),
);
const _mapAllPendingExact: Eq<
  typeof _mapAllPending,
  PendingResult<number, unknown>
> = true;

const _optMapAll = none<number>().mapAll((o) => o.or(some(1)));
const _optMapAllExact: Eq<typeof _optMapAll, Option<number>> = true;

// ---------------------------------------------------------------------------
// flatten / transpose / ok() / err() / okOr
// ---------------------------------------------------------------------------

const _flat = ok(ok(1)).flatten();
const _flatExact: Eq<typeof _flat, Result<number, unknown>> = true;

const _flatInnerErr = ok(ok<number, string>(1)).flatten();
const _flatInnerErrExact: Eq<
  typeof _flatInnerErr,
  Result<number, string>
> = true;

const _flatNested = ok(ok(ok(1))).flatten();
const _flatNestedExact: Eq<
  typeof _flatNested,
  Result<Result<number, unknown>, unknown>
> = true;

const _flatNestedTwice = _flatNested.flatten();
const _flatNestedTwiceExact: Eq<
  typeof _flatNestedTwice,
  Result<number, unknown>
> = true;

const _flatDeep = ok(ok(ok(ok(1))))
  .flatten()
  .flatten()
  .flatten();
const _flatDeepExact: Eq<typeof _flatDeep, Result<number, unknown>> = true;

const _flatDeepTyped = ok<Result<Result<number, string>, string>, string>(
  ok<Result<number, string>, string>(ok<number, string>(1)),
);
const _flatDeepTypedOnce = _flatDeepTyped.flatten();
const _flatDeepTypedOnceExact: Eq<
  typeof _flatDeepTypedOnce,
  Result<Result<number, string>, string>
> = true;
const _flatDeepTypedTwice = _flatDeepTypedOnce.flatten();
const _flatDeepTypedTwiceExact: Eq<
  typeof _flatDeepTypedTwice,
  Result<number, string>
> = true;

const _flatErr = err<Result<number, string>, string>("e").flatten();
const _flatErrExact: Eq<typeof _flatErr, Result<number, string>> = true;

const _pFlat = pendingOk(ok(1)).flatten();
const _pFlatExact: Eq<typeof _pFlat, PendingResult<number, unknown>> = true;

const _pFlatInnerErr = pendingOk(ok<number, string>(1)).flatten();
const _pFlatInnerErrExact: Eq<
  typeof _pFlatInnerErr,
  PendingResult<number, string>
> = true;

const _pFlatFromResult = ok(ok(1)).toPending().flatten();
const _pFlatFromResultExact: Eq<
  typeof _pFlatFromResult,
  PendingResult<number, unknown>
> = true;

const _pFlatPending = pendingOk(pendingOk(1)).flatten();
const _pFlatPendingExact: Eq<
  typeof _pFlatPending,
  PendingResult<number, unknown>
> = true;

const _pFlatNested = pendingOk(ok(ok(1))).flatten();
const _pFlatNestedExact: Eq<
  typeof _pFlatNested,
  PendingResult<Result<number, unknown>, unknown>
> = true;
const _pFlatNestedTwice = _pFlatNested.flatten();
const _pFlatNestedTwiceExact: Eq<
  typeof _pFlatNestedTwice,
  PendingResult<number, unknown>
> = true;

const _pFlatDeep = pendingOk(pendingOk(pendingOk(1)));
const _pFlatDeepOnce = _pFlatDeep.flatten();
const _pFlatDeepOnceExact: Eq<
  typeof _pFlatDeepOnce,
  PendingResult<Result<number, unknown>, unknown>
> = true;
const _pFlatDeepTwice = _pFlatDeepOnce.flatten();
const _pFlatDeepTwiceExact: Eq<
  typeof _pFlatDeepTwice,
  PendingResult<number, unknown>
> = true;

const _pFlatDeepTyped = pendingOk<
  Result<Result<number, string>, string>,
  string
>(ok<Result<number, string>, string>(ok<number, string>(1)));
const _pFlatDeepTypedOnce = _pFlatDeepTyped.flatten();
const _pFlatDeepTypedOnceExact: Eq<
  typeof _pFlatDeepTypedOnce,
  PendingResult<Result<number, string>, string>
> = true;
const _pFlatDeepTypedTwice = _pFlatDeepTypedOnce.flatten();
const _pFlatDeepTypedTwiceExact: Eq<
  typeof _pFlatDeepTypedTwice,
  PendingResult<number, string>
> = true;

const _pFlatPromiseInner = pendingResult(
  ok(Promise.resolve(ok<number, string>(1))),
).flatten();
const _pFlatPromiseInnerExact: Eq<
  typeof _pFlatPromiseInner,
  PendingResult<number, string>
> = true;

const _pFlatErr = pendingErr<Result<number, string>, string>("e").flatten();
const _pFlatErrExact: Eq<
  typeof _pFlatErr,
  PendingResult<number, string>
> = true;

const _optFlat = some(some(1)).flatten();
const _optFlatExact: Eq<typeof _optFlat, Option<number>> = true;

const _optFlatNone = some(none<number>()).flatten();
const _optFlatNoneExact: Eq<typeof _optFlatNone, Option<number>> = true;

const _optFlatNested = some(some(some(1))).flatten();
const _optFlatNestedExact: Eq<
  typeof _optFlatNested,
  Option<Option<number>>
> = true;
const _optFlatNestedTwice = _optFlatNested.flatten();
const _optFlatNestedTwiceExact: Eq<
  typeof _optFlatNestedTwice,
  Option<number>
> = true;

const _optFlatDeep = some(some(some(some(1))))
  .flatten()
  .flatten()
  .flatten();
const _optFlatDeepExact: Eq<typeof _optFlatDeep, Option<number>> = true;

const _pOptFlat = pendingSome(some(1)).flatten();
const _pOptFlatExact: Eq<typeof _pOptFlat, PendingOption<number>> = true;

const _pOptFlatFromOption = some(some(1)).toPending().flatten();
const _pOptFlatFromOptionExact: Eq<
  typeof _pOptFlatFromOption,
  PendingOption<number>
> = true;

const _pOptFlatPending = pendingSome(pendingSome(1)).flatten();
const _pOptFlatPendingExact: Eq<
  typeof _pOptFlatPending,
  PendingOption<number>
> = true;

const _pOptFlatNested = pendingSome(some(some(1))).flatten();
const _pOptFlatNestedExact: Eq<
  typeof _pOptFlatNested,
  PendingOption<Option<number>>
> = true;
const _pOptFlatNestedTwice = _pOptFlatNested.flatten();
const _pOptFlatNestedTwiceExact: Eq<
  typeof _pOptFlatNestedTwice,
  PendingOption<number>
> = true;

const _pOptFlatDeep = pendingSome(pendingSome(pendingSome(1)));
const _pOptFlatDeepOnce = _pOptFlatDeep.flatten();
const _pOptFlatDeepOnceExact: Eq<
  typeof _pOptFlatDeepOnce,
  PendingOption<Option<number>>
> = true;
const _pOptFlatDeepTwice = _pOptFlatDeepOnce.flatten();
const _pOptFlatDeepTwiceExact: Eq<
  typeof _pOptFlatDeepTwice,
  PendingOption<number>
> = true;

const _transposed = ok(some(1)).transpose();
const _transposedExact: Eq<
  typeof _transposed,
  Option<Result<number, unknown>>
> = true;

const _transposedNone = ok(none<number>()).transpose();
const _transposedNoneExact: Eq<
  typeof _transposedNone,
  Option<Result<number, unknown>>
> = true;

const _transposedErr = err<Option<number>, string>("e").transpose();
const _transposedErrExact: Eq<
  typeof _transposedErr,
  Option<Result<number, string>>
> = true;

const _optTransposed = some(ok(1)).transpose();
const _optTransposedExact: Eq<
  typeof _optTransposed,
  Result<Option<number>, unknown>
> = true;

const _optTransposedErr = some(err<number, string>("e")).transpose();
const _optTransposedErrExact: Eq<
  typeof _optTransposedErr,
  Result<Option<number>, string>
> = true;

const _optTransposedNone = none<Result<number, string>>().transpose();
const _optTransposedNoneExact: Eq<
  typeof _optTransposedNone,
  Result<Option<number>, string>
> = true;

const _okToOpt = ok(1).ok();
const _okToOptExact: Eq<typeof _okToOpt, Option<number>> = true;
const _errToOpt = err("fail").ok();
const _errToOptExact: Eq<typeof _errToOpt, Option<unknown>> = true;
const _errToErrOpt: Option<string> = err("fail").err();
const _okToErrOpt = ok(1).err();
const _okToErrOptExact: Eq<typeof _okToErrOpt, Option<unknown>> = true;

const _okOr: Result<number, string> = some(1).okOr("missing");
const _noneOkOr: Result<number, string> = none<number>().okOr("missing");

const _unannotatedNoneOkOr = none().okOr("missing");
const _unannotatedNoneOkOrExact: Eq<
  typeof _unannotatedNoneOkOr,
  Result<unknown, string>
> = true;

const _someOkOrElse: Result<User, ParseError> = some({
  id: 1,
  name: "ada",
}).okOrElse(() => ({ kind: "parse", msg: "missing user" }));

// ---------------------------------------------------------------------------
// HTTP / async / pending
// ---------------------------------------------------------------------------

const _fromPromise: PendingResult<number, Error> = fromPromise(
  Promise.resolve(1),
  () => new Error("no"),
);

const _http = fromPromise(Promise.resolve('{"id":1}'), (e) =>
  e instanceof Error ? e : new Error(String(e)),
).andThen((raw) =>
  run(
    (): User => {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed &&
        "name" in parsed
      ) {
        return parsed as User;
      }
      throw new Error("shape");
    },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  ),
);
const _httpExact: Eq<typeof _http, PendingResult<User, Error>> = true;

const _runSync: Result<number, Error> = run(
  () => 1,
  () => new Error("x"),
);

const _runGen = runGenerator(function* () {
  const n = yield* ok<number, string>(1);
  return ok(n + 1);
});
const _runGenExact: Eq<typeof _runGen, Result<number, string>> = true;

const _runGenErr = runGenerator(function* () {
  const n = yield* ok<number, "e1">(1);
  yield* err<number, "e2">("e2");
  return ok(n);
});
const _runGenErrExact: Eq<
  typeof _runGenErr,
  Result<number, "e1" | "e2">
> = true;

const _runGenMkErr = runGenerator(
  function* () {
    const n = yield* ok<number, string>(1);
    return ok(n);
  },
  () => new Error("x"),
);
const _runGenMkErrExact: Eq<
  typeof _runGenMkErr,
  Result<number, string | Error>
> = true;

const _runAsyncGen = runAsyncGenerator(async function* () {
  const a = yield* pendingOk<number, "e1">(1);
  const b = yield* ok<number, "e2">(2);
  return ok(a + b);
});
const _runAsyncGenExact: Eq<
  typeof _runAsyncGen,
  PendingResult<number, "e1" | "e2">
> = true;

const _runAsyncGenMkErr = runAsyncGenerator(
  async function* () {
    const n = yield* pendingOk<number, string>(1);
    return ok(n);
  },
  () => new Error("x"),
);
const _runAsyncGenMkErrExact: Eq<
  typeof _runAsyncGenMkErr,
  PendingResult<number, string | Error>
> = true;

const _runAsync: PendingResult<number, Error> = runAsync(
  () => Promise.resolve(1),
  () => new Error("x"),
);

const _runResultOk = runResult(() => ok(1));
const _runResultOkExact: Eq<
  typeof _runResultOk,
  Result<number, unknown>
> = true;

const _runResultErr = runResult(() => err("no"));
const _runResultErrExact: Eq<
  typeof _runResultErr,
  Result<unknown, string>
> = true;

const _runPending = runPendingResult(() => pendingOk(1));
const _runPendingExact: Eq<
  typeof _runPending,
  PendingResult<number, unknown>
> = true;

const _toPending = ok(1).toPending();
const _toPendingExact: Eq<
  typeof _toPending,
  PendingResult<number, unknown>
> = true;
const _optToPending: PendingOption<number> = some(1).toPending();
const _promiseToPending = ok(Promise.resolve(1)).toPending();
const _promiseToPendingExact: Eq<
  typeof _promiseToPending,
  PendingResult<number, unknown>
> = true;

const _pendingChain: PendingResult<string, string> = pendingOk(1).andThen(
  (n) => (n > 0 ? ok(String(n)) : err("neg")),
);

const _pendingAndThenPromise: PendingResult<number, unknown> = pendingOk(
  1,
).andThen((n) => Promise.resolve(ok(n + 1)));

const _pendingOptChain: PendingOption<string> = pendingSome(1).andThen((n) =>
  n > 0 ? some(String(n)) : none(),
);

const _pendingMatch: Promise<number> = pendingOk(1).match(
  (n) => n,
  () => 0,
);

const _pendingOptMatch: Promise<string> = pendingSome("ada").match(
  (s) => s,
  () => "anon",
);

const _awaitPending: PromiseLike<Result<number, unknown>> = pendingOk(1);
const _awaitPendingOpt: PromiseLike<Option<number>> = pendingSome(1);

const _fetchUser = (): PendingResult<User, AppError> =>
  fromPromise(Promise.resolve({ id: 1, name: "ada" }), (): AppError => ({
    kind: "http",
    status: 500,
  }));

const _loadPage: PendingResult<Session, AppError> = _fetchUser().map(
  (user) => ({ user, token: "t" }),
);

// ---------------------------------------------------------------------------
// copy / clone / defaults
// ---------------------------------------------------------------------------

const _save: Result<void, Error> = ok();
const _saved: Result<void, Error> = _save.andThen(() => ok());

const _copied = ok(1).copy();
const _copiedExact: Eq<typeof _copied, Result<number, unknown>> = true;
const _optCopied: Option<number> = some(1).copy();
const _unwrapDef: number | undefined = ok(1).unwrapOrDefault();
const _optUnwrapDef: number | undefined = some(1).unwrapOrDefault();
const _errUnwrapDef: string | undefined = err<string, string>(
  "x",
).unwrapOrDefault();
const _noneUnwrapDef: number | undefined = none<number>().unwrapOrDefault();

const _cloned = ok<number, never>(1).clone();
const _clonedExact: Eq<typeof _cloned, Result<number, never>> = true;
const _optCloned: Option<number> = some(1).clone();

const _toPendingCloned = ok<number, never>(1).toPendingCloned();
const _toPendingClonedExact: Eq<
  typeof _toPendingCloned,
  PendingResult<number, never>
> = true;
const _optToPendingCloned: PendingOption<number> = some(1).toPendingCloned();

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

const _slot: Option<number> = none();
const _inserted: number = _slot.getOrInsert(7);
const _replaced: Option<number> = _slot.replace(8);
const _taken: Option<number> = _slot.take();
const _takeIf: Option<number> = some(2).takeIf((n) => n > 0);
const _overwrite: number = some(1).insert(9);
const _getOrInsertWith: number = none<number>().getOrInsertWith(() => 1);

// ---------------------------------------------------------------------------
// Result generator protocol
// ---------------------------------------------------------------------------

const _okYield: Generator<Err<never, unknown>, number> = ok(1)[
  Symbol.iterator
]();
const _pendingYield: AsyncGenerator<Err<never, unknown>, number> = pendingOk(1)[
  Symbol.asyncIterator
]();

// ---------------------------------------------------------------------------
// Settled vs PromiseLike payloads
// ---------------------------------------------------------------------------

const _okPromise = ok(Promise.resolve(1));
const _okPromiseExact: Eq<
  typeof _okPromise,
  Result<Promise<number>, unknown>
> = true;
const _okPromisePending = _okPromise.toPending();
const _okPromisePendingExact: Eq<
  typeof _okPromisePending,
  PendingResult<number, unknown>
> = true;

const _somePromise = some(Promise.resolve("ada"));
const _somePromisePending: PendingOption<string> = _somePromise.toPending();

const _settledOk: SettledResult<number, string> = ok(1);
const _settledOpt: SettledOption<number> = some(1);

// ---------------------------------------------------------------------------
// Correctly rejected assignability
// ---------------------------------------------------------------------------

const _rejectWrongOk = (): void => {
  // @ts-expect-error Ok<string> is not Result<number, string>
  const _fail: Result<number, string> = ok("x");
  void _fail;
};

const _rejectWrongSome = (): void => {
  // @ts-expect-error Some<string> is not Option<number>
  const _fail: Option<number> = some("x");
  void _fail;
};

const _rejectOkToErr = (): void => {
  // @ts-expect-error Ok is not Err
  const _fail: Err<number, string> = ok(1);
  void _fail;
};

const _rejectSomeToNone = (): void => {
  // @ts-expect-error Some is not None
  const _fail: None<number> = some(1);
  void _fail;
};

const _rejectSyncAndThenPromise = (): void => {
  // @ts-expect-error sync andThen does not accept Promise<Result>
  const _fail = ok(1).andThen((n) => Promise.resolve(ok(n)));
  void _fail;
};

const _rejectSyncOptAndThenPromise = (): void => {
  // @ts-expect-error sync andThen does not accept Promise<Option>
  const _fail = some(1).andThen((n) => Promise.resolve(some(n)));
  void _fail;
};

const _rejectNonCloneable = (): void => {
  // @ts-expect-error clone requires Cloneable value
  const _fail = ok({ a: 1 }).clone();
  void _fail;
};

const _rejectFlatOk = (): void => {
  // @ts-expect-error flatten requires nested Result
  const _fail = ok(1).flatten();
  void _fail;
};

const _rejectFlatPendingOk = (): void => {
  // @ts-expect-error flatten requires nested Result
  const _fail = pendingOk(1).flatten();
  void _fail;
};

const _rejectFlatSome = (): void => {
  // @ts-expect-error flatten requires nested Option
  const _fail = some(1).flatten();
  void _fail;
};

const _rejectFlatPendingSome = (): void => {
  // @ts-expect-error flatten requires nested Option
  const _fail = pendingSome(1).flatten();
  void _fail;
};

const _rejectPendingToSync = (): void => {
  // @ts-expect-error PendingResult is not Result
  const _fail: Result<number, string> = pendingOk(1);
  void _fail;
};

const _rejectUnwrapPromise = (): void => {
  // @ts-expect-error unwrap is only on SettledResult
  const _fail: number = ok(Promise.resolve(1)).unwrap();
  void _fail;
};

const _rejectAsyncGenInRunGenerator = (): void => {
  /* eslint-disable require-yield, @typescript-eslint/require-await -- type reject */
  const _fail = runGenerator(
    // @ts-expect-error runGenerator does not accept async generators
    async function* () {
      return ok(1);
    },
  );
  /* eslint-enable require-yield, @typescript-eslint/require-await */
  void _fail;
};
