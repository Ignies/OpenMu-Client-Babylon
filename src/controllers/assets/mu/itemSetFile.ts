/**
 * The ancient sets: `Data/Local/ItemSetType.bmd` (which set each item belongs to) and
 * `Data/Local/<pack>/ItemSetOption_<lang>.bmd` (each set's name and options), read like
 * `CSItemOption::OpenItemSetType` / `OpenItemSetOption` (CSItemOption.cpp:77-185). See assets/readme.md.
 */

import { observable, runInAction } from 'mobx';
import { convertBux } from '../../terrain/mapFileEncryption';
import { onLanguageChanged } from '@/i18n';
import { downloadDataFile } from './dataFolder';
import { decodeLocalText, downloadLocalDataFile, repairPackText } from './localData';

/** `MAX_ITEM`: 16 groups of 512. */
const MAX_ITEM = 16 * 512;
const TYPE_RECORD = 4;
/** `MAX_SET_OPTION`. */
const MAX_SETS = 64;
/** `ITEM_SET_OPTION_FILE`: name 64, standard 6x2 + 6x2, ext 2 + 2, count, full 5 + 5, classes 7. */
const OPTION_RECORD = 110;
const NAME_LENGTH = 64;
/** An empty option or set slot. */
const EMPTY = 0xff;

/** One option of a set: the `AT_SET_OPTION_*` number past `AT_SET_OPTION_IMPROVE_STRENGTH`, and its value. */
export type SetOption = { readonly option: number; readonly value: number };

export type ItemSet = {
  readonly name: string;
  /** `byStandardOption[6][2]`: one row per piece past the first. */
  readonly standard: readonly (readonly SetOption[])[];
  readonly ext: readonly SetOption[];
  readonly full: readonly SetOption[];
  /** `bySetItemCount`: how many items the type table puts in this set. */
  readonly itemCount: number;
};

export type ItemSetTables = {
  /** Two set numbers per item code (`ITEM_SET_TYPE.byOption`), `EMPTY` or 0 for none. */
  readonly setOf: Uint8Array;
  /** By set number; null for an unused slot. */
  readonly sets: readonly (ItemSet | null)[];
};

/** `ItemSetType.bmd`: the two set numbers of every item code. */
export function parseItemSetTypes(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(MAX_ITEM * 2).fill(EMPTY);
  const count = Math.min(MAX_ITEM, Math.floor(bytes.length / TYPE_RECORD));
  for (let i = 0; i < count; i++) {
    const record = bytes.slice(i * TYPE_RECORD, (i + 1) * TYPE_RECORD);
    convertBux(record, TYPE_RECORD);
    out[i * 2] = record[0];
    out[i * 2 + 1] = record[1];
  }
  return out;
}

const options = (record: Uint8Array, at: number, valuesAt: number, count: number): SetOption[] => {
  const out: SetOption[] = [];
  for (let i = 0; i < count; i++) out.push({ option: record[at + i], value: record[valuesAt + i] });
  return out;
};

/**
 * `ItemSetOption_<lang>.bmd` against the type table. The Korean apostrophe some
 * English names carry (`0xA1 0xAF`, "Chrono's") is read as a plain one.
 */
export function parseItemSetOptions(bytes: Uint8Array, setOf: Uint8Array): (ItemSet | null)[] {
  const itemCounts = new Array<number>(MAX_SETS).fill(0);
  for (const set of setOf) if (set < MAX_SETS) itemCounts[set]++;

  const out: (ItemSet | null)[] = [];
  const count = Math.min(MAX_SETS, Math.floor(bytes.length / OPTION_RECORD));
  for (let i = 0; i < count; i++) {
    const record = bytes.slice(i * OPTION_RECORD, (i + 1) * OPTION_RECORD);
    convertBux(record, OPTION_RECORD);
    for (let c = 0; c + 1 < NAME_LENGTH && record[c]; c++) {
      if (record[c] !== 0xa1 || record[c + 1] !== 0xaf) continue;
      record.copyWithin(c + 1, c + 2, NAME_LENGTH);
      record[c] = 0x27;
    }
    const name = repairPackText(decodeLocalText(record, 0, NAME_LENGTH));
    if (!name) {
      out.push(null);
      continue;
    }
    const standard: SetOption[][] = [];
    for (let row = 0; row < 6; row++) standard.push(options(record, 64 + row * 2, 76 + row * 2, 2));
    out.push({
      name,
      standard,
      ext: options(record, 88, 90, 2),
      full: options(record, 93, 98, 5),
      itemCount: itemCounts[i],
    });
  }
  return out;
}

const tables = observable.box<ItemSetTables | null>(null, { deep: false });
let pending: Promise<void> | null = null;

/** Parses both files into the live tables (the loader's last step, and a test's way in). */
export function loadItemSetTables(typeBytes: Uint8Array, optionBytes: Uint8Array): void {
  const setOf = parseItemSetTypes(typeBytes);
  const parsed = { setOf, sets: parseItemSetOptions(optionBytes, setOf) };
  pending ??= Promise.resolve();
  runInAction(() => tables.set(parsed));
}

function load(): void {
  pending = Promise.all([
    downloadDataFile('Local/itemsettype.bmd'),
    downloadLocalDataFile('ItemSetOption', 'Local/ItemSetOption.bmd'),
  ])
    .then(([types, sets]) => {
      if (types.length && sets.length) loadItemSetTables(types, sets);
    })
    .catch(err => console.warn('Ancient set tables are missing:', err));
}

/** The set tables, or null until they have loaded (the first call starts the download). */
export function itemSetTables(): ItemSetTables | null {
  if (!pending) load();
  return tables.get();
}

// The set names are per language; the type table is not, but one reload keeps it simple.
onLanguageChanged(() => {
  if (pending) load();
});
