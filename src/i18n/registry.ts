/**
 * THE TEXT REGISTRY - every line of every language, filled by the owners.
 *
 * Built-in owners register at boot (`sources.ts`); a streamed module calls
 * `registerText` when it arrives. A later line for the same key replaces the
 * earlier one (a version overriding a window's text). Plain data, no mobx:
 * `index.ts` turns `onTextRegistered` into a redraw.
 */

export type TextStrings = Readonly<Record<string, string>>;

/** The source language: always complete for built-in owners, the fallback for the rest. */
export const SOURCE_CODE = 'en';

/** English, by key. Exported live: it grows as owners register. */
export const ENGLISH: Record<string, string> = Object.create(null);

const tables = new Map<string, Record<string, string>>([[SOURCE_CODE, ENGLISH]]);
const watchers = new Set<() => void>();

/** Adds (or replaces) lines of one language. */
export function registerText(code: string, strings: TextStrings): void {
  let table = tables.get(code);
  if (!table) tables.set(code, (table = Object.create(null) as Record<string, string>));
  Object.assign(table, strings);
  for (const watcher of watchers) watcher();
}

/** One language's line, or undefined when that language has none. */
export function lineOf(code: string, key: string): string | undefined {
  return tables.get(code)?.[key];
}

/** Called after every registration. Returns the unsubscribe. */
export function onTextRegistered(watcher: () => void): () => void {
  watchers.add(watcher);
  return () => watchers.delete(watcher);
}
