/**
 * `Data/Local/credit.bmd`, the staff roll `CCreditWin::LoadText` reads (CreditWin.cpp:370-400): 400
 * `SCreditItem` records of a class byte (0 the end, 1 department, 2 team, 3 name) and a 32-byte name,
 * the whole file run through the Bux key at once. See assets/readme.md.
 */

import { observable, runInAction } from 'mobx';
import { convertBux } from '../../terrain/mapFileEncryption';
import { downloadDataFile } from './dataFolder';

/** `CRW_ITEM_MAX`, `sizeof(SCreditItem)`. */
const ITEMS = 400;
const RECORD = 33;
const NAME = 32;

export type CreditLine = { kind: number; name: string };

export function parseCredits(bytes: Uint8Array): CreditLine[] {
  const size = Math.min(bytes.length, ITEMS * RECORD);
  const data = bytes.slice(0, size);
  convertBux(data, size);
  const out: CreditLine[] = [];
  for (let at = 0; at + RECORD <= size; at += RECORD) {
    let end = at + 1;
    while (end < at + 1 + NAME && data[end]) end++;
    out.push({ kind: data[at], name: new TextDecoder('latin1').decode(data.subarray(at + 1, end)) });
  }
  return out;
}

const credits = observable.box<readonly CreditLine[] | null>(null, { deep: false });
let pending: Promise<void> | null = null;

/** Parses the file into the live roll (the loader's last step, and a test's way in). */
export function loadCredits(bytes: Uint8Array): void {
  const parsed = parseCredits(bytes);
  pending ??= Promise.resolve();
  runInAction(() => credits.set(parsed));
}

/** The staff roll, or null until loaded (the first call starts the download). */
export function creditLines(): readonly CreditLine[] | null {
  if (!pending) {
    pending = downloadDataFile('Local/credit.bmd')
      .then(bytes => {
        if (bytes.length) loadCredits(bytes);
      })
      .catch(err => console.warn('credit.bmd is missing:', err));
  }
  return credits.get();
}
