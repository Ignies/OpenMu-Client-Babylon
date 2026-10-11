/**
 * `Data/Local/<pack>/BuffEffect_<lang>.bmd` buff names: `_BUFFINFO` (`w_BuffScriptLoader.h`),
 * read like `BuffScriptLoader::Load`. See assets/readme.md.
 */

import { observable, runInAction } from 'mobx';
import { convertBux } from '../../terrain/mapFileEncryption';
import { i18n, onLanguageChanged } from '@/i18n';
import {
  checkPackText,
  decodeLocalText,
  downloadPackDataFile,
  repairPackText,
} from './localData';

const FILE = 'BuffEffect';
const HEADER_SIZE = 4;
const RECORD_SIZE = 158;
const NAME_OFFSET = 5;
const NAME_LENGTH = 50;

const names = observable.box<ReadonlyMap<number, string>>(new Map(), {
  deep: false,
});

let pending: Promise<void> | null = null;

function set(map: ReadonlyMap<number, string>): void {
  runInAction(() => names.set(map));
}

/** Effect id -> name. Exported so the record layout can be tested without a fetch. */
export function parseBuffNames(bytes: Uint8Array): Map<number, string> {
  const out = new Map<number, string>();
  if (bytes.length < HEADER_SIZE) return out;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declared = view.getInt32(0, true);
  const fit = Math.floor((bytes.length - HEADER_SIZE) / RECORD_SIZE);
  const count = Math.max(0, Math.min(declared, fit));

  for (let i = 0; i < count; i++) {
    const offset = HEADER_SIZE + i * RECORD_SIZE;
    convertBux(bytes.subarray(offset, offset + RECORD_SIZE), RECORD_SIZE);

    const id = view.getInt16(offset, true);
    const name = repairPackText(
      decodeLocalText(bytes, offset + NAME_OFFSET, NAME_LENGTH)
    );
    if (id > 0 && name) out.set(id, name);
  }

  return out;
}

/** Load the overlay for the active language; a no-op without a pack. */
function loadBuffNames(): Promise<void> {
  if (pending) return pending;

  const pack = i18n.dataPack;
  if (!pack || pack.folder === 'Eng') {
    set(new Map());
    pending = Promise.resolve();
    return pending;
  }

  const wanted = i18n.language;

  pending = downloadPackDataFile(FILE)
    .then(bytes => {
      if (i18n.language !== wanted || !bytes.length) return;
      const parsed = parseBuffNames(bytes);
      checkPackText(FILE, parsed.values());
      set(parsed);
    })
    .catch(err => {
      console.warn(`Buff names for ${pack.folder} are missing:`, err);
      if (i18n.language === wanted) set(new Map());
    });

  return pending;
}

/** The localised name for an effect id, or undefined for the English one. */
export function localisedBuffName(effectId: number): string | undefined {
  return names.get().get(effectId);
}

onLanguageChanged(() => {
  pending = null;
  set(new Map());
  void loadBuffNames();
});

// Deferred past module evaluation, like `itemNameFile`: this module can run
// before `i18n/index.ts` has, and reading `dataPack` then loads nothing.
queueMicrotask(() => void loadBuffNames());
