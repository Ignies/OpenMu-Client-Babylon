/**
 * `Data/Local/<pack>/Text_<lang>.bmd`, the original's `GlobalText`: 'GT', a count, then each line
 * as its id, its length and its bytes run through the Bux key. Only what the data files point at by
 * number reads it (the `Mix.bmd` recipe names); the interface's own text lives in the i18n folders.
 * See assets/readme.md.
 */

import { observable, runInAction } from 'mobx';
import { onLanguageChanged } from '@/i18n';
import { convertBux } from '../../terrain/mapFileEncryption';
import { decodeLocalText, downloadLocalDataFile, repairPackText } from './localData';

const HEADER = 6;

/** Id -> line. */
export function parseGlobalText(bytes: Uint8Array): Map<number, string> {
  const out = new Map<number, string>();
  if (bytes.length < HEADER || bytes[0] !== 0x47 || bytes[1] !== 0x54) return out;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(2, true);
  let at = HEADER;
  for (let i = 0; i < count && at + 8 <= bytes.length; i++) {
    const id = view.getUint32(at, true);
    const length = view.getUint32(at + 4, true);
    at += 8;
    const line = bytes.slice(at, at + length);
    convertBux(line, line.length);
    out.set(id, repairPackText(decodeLocalText(line, 0, line.length)));
    at += length;
  }
  return out;
}

const lines = observable.box<ReadonlyMap<number, string>>(new Map(), { deep: false });
let pending: Promise<void> | null = null;

/** Parses a text file into the live table (the loader's last step, and a test's way in). */
export function loadGlobalText(bytes: Uint8Array): void {
  const parsed = parseGlobalText(bytes);
  pending ??= Promise.resolve();
  runInAction(() => lines.set(parsed));
}

function load(): void {
  pending = downloadLocalDataFile('Text')
    .then(bytes => {
      if (bytes.length) loadGlobalText(bytes);
    })
    .catch(err => console.warn('Text.bmd is missing:', err));
}

/** One `GlobalText` line, or '' until the file has loaded (the first call starts the download). */
export function globalText(id: number): string {
  if (!pending) load();
  return lines.get().get(id) ?? '';
}

onLanguageChanged(() => {
  if (pending) load();
});
