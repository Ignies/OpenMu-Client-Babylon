/**
 * `Data/Local/<pack>/item_<lang>.bmd` — the item names in the language the
 * player picked.
 *
 * `ITEM_ATTRIBUTE_FILE` (`GameData/ItemData/ItemStructs.h`) with the legacy
 * 30-byte name the Season 6 tree ships: 8192 fixed records of 84 bytes, no
 * count in front, a 4-byte checksum after (which the client does not verify),
 * each record XOR-ed with the 3-byte Bux key **restarting at every record** —
 * one `BuxConvert(pSeek, structsize)` per record, the same as `MoveReq` and
 * the quest tables. The record index is the item code: `group * 512 + index`.
 *
 * Only the name is read. Everything else about an item still comes from
 * `items.json`, which is what the server keys on and what `muHelper` matches
 * behaviour against, so this is an **overlay**: empty until a pack is loaded,
 * consulted first by `itemBaseName`, English underneath.
 */

import { observable, runInAction } from 'mobx';
import { convertBux } from '../../common/terrain/mapFileEncryption';
import { i18n, onLanguageChanged } from '../../i18n';
import {
  checkPackText,
  decodeLocalText,
  downloadLocalDataFile,
  repairPackText,
} from './localData';

const FILE = 'item';
const RECORD_SIZE = 84;
const NAME_LENGTH = 30;
/** `MAX_SUBTYPE` — the stride between two groups in the flat record array. */
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
 * pack, and for English — `items.json` already holds those names.
 */
export function loadItemNames(): Promise<void> {
  if (pending) return pending;

  const pack = i18n.dataPack;
  if (!pack || pack.folder === 'Eng') {
    set(new Map());
    pending = Promise.resolve();
    return pending;
  }

  const wanted = i18n.language;

  pending = downloadLocalDataFile(FILE)
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

/** The localised name for an item code, or undefined to use `items.json`. */
export function localisedItemName(
  group: number,
  index: number
): string | undefined {
  return names.get().get(group * GROUP_STRIDE + index);
}

onLanguageChanged(() => {
  pending = null;
  set(new Map());
  void loadItemNames();
});

// Kicked off at import, never from a render: `loadItemNames` writes the
// observable synchronously on the no-pack path, and a write inside a MobX
// derivation is how a component starts re-rendering itself.
void loadItemNames();
