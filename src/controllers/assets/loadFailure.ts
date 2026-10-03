/**
 * The one error path for fire-and-forget loads (`void load(x).then(...)`): a missing or broken
 * file is logged once per name and swallowed, so the thing it fed just does not appear.
 * See assets/readme.md.
 */

const reported = new Set<string>();

/** A `.catch` handler: warns once for `what` (a file path), never rethrows. */
export function reportLoadFailure(what: string): (err: unknown) => void {
  return err => {
    if (reported.has(what)) return;
    reported.add(what);
    console.warn(`Could not load ${what}:`, err);
  };
}

/** `promise` that resolves to `undefined` instead of rejecting, reported like above. */
export function settle<T>(promise: Promise<T>, what: string): Promise<T | undefined> {
  return promise.catch(err => {
    reportLoadFailure(what)(err);
    return undefined;
  });
}
