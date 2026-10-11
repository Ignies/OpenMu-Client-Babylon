/**
 * `Data/Local/<pack>/item_<lang>.bmd` item names: `ITEM_ATTRIBUTE_FILE`
 * (`GameData/ItemData/ItemStructs.h`), an overlay over the item files' `ItemName`. See assets/readme.md.
 */

import { observable, runInAction } from 'mobx';
import { convertBux } from '../../terrain/mapFileEncryption';
import { GameOptions } from '@/controllers/settings';
import { i18n, onLanguageChanged } from '@/i18n';
import {
  checkPackText,
  decodeLocalText,
  downloadPackDataFile,
  repairPackText,
} from './localData';

const FILE = 'item';
const RECORD_SIZE = 84;
const NAME_LENGTH = 30;
/** `MAX_SUBTYPE` - the stride between two groups in the flat record array. */
const GROUP_STRIDE = 512;

const names = observable.box<ReadonlyMap<number, string>>(new Map(), {
  deep: false,
});

let pending: Promise<void> | null = null;

function set(map: ReadonlyMap<number, string>): void {
  runInAction(() => names.set(map));
}

/** Item code -> name. Exported so the record layout can be tested without a fetch. */
export function parseItemNames(bytes: Uint8Array): Map<number, string> {
  const out = new Map<number, string>();
  const count = Math.floor(bytes.length / RECORD_SIZE);

  for (let i = 0; i < count; i++) {
    const offset = i * RECORD_SIZE;
    convertBux(bytes.subarray(offset, offset + RECORD_SIZE), RECORD_SIZE);

    const name = repairPackText(decodeLocalText(bytes, offset, NAME_LENGTH));
    if (name) out.set(i, name);
  }

  return out;
}

/**
 * Load the overlay for the active language. A no-op for a language with no
 * pack, and for English - the item files already hold those names.
 */
function loadItemNames(): Promise<void> {
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
      // Two changes in quick succession: the slower fetch must not land on
      // top of the language that is current by the time it answers.
      if (i18n.language !== wanted || !bytes.length) return;
      const parsed = parseItemNames(bytes);
      checkPackText(FILE, parsed.values());
      set(parsed);
    })
    .catch(err => {
      console.warn(`Item names for ${pack.folder} are missing:`, err);
      if (i18n.language === wanted) set(new Map());
    });

  return pending;
}

/** The localised name for an item code, or undefined to use the item file's `ItemName`. */
export function localisedItemName(
  group: number,
  index: number
): string | undefined {
  // The one option that turns a whole table off: a trader who wants to match
  // a price list reads the item files instead, with the rest of the interface
  // still in their own language. Observable, so every open window redraws the
  // moment it is switched.
  if (GameOptions.englishItemNames) return undefined;
  // A name the pack itself gets wrong, replaced before the table is read.
  return (
    i18n.itemNameFixes?.[`${group}/${index}`] ??
    names.get().get(group * GROUP_STRIDE + index)
  );
}

onLanguageChanged(() => {
  pending = null;
  set(new Map());
  void loadItemNames();
});

// Kicked off once the module graph has finished evaluating, never from a
// render: `loadItemNames` reads `i18n.dataPack`, and this module can be
// evaluated before `i18n/index.ts` has run its own body - a straight call here
// would quietly load nothing. It must not run inside a render either, because
// the no-pack path writes the observable synchronously.
queueMicrotask(() => void loadItemNames());
