/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

import { none, pendingOption, PendingOption, some } from "./option";
import { err, ok } from "./result";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const _get = <T>() => {
  return {} as T;
};

async function main() {
  await Promise.resolve();
  const _ok = ok(some(true));
  const _err = err("error");
  const _some = some("some");
  const _none = none();
  const _pop = pendingOption(some(1));
  console.log(_ok.toString());
  console.log(_err.toString());
  console.log(_some.toString());
  console.log(_none.toString());
  console.log(_pop.toString());
}

main().catch(console.error);
