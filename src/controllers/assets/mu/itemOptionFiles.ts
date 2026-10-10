/**
 * The extra item options the tooltip names: `JewelOfHarmonyOption_<lang>.bmd` (UIJewelHarmony.cpp:83-131),
 * `SocketItem_<lang>.bmd` (SocketSystem.cpp:572-613) and `ItemAddOption.bmd`, the 380 option
 * (ItemAddOptioninfo.cpp:43-55). See assets/readme.md.
 */

import { observable, runInAction } from 'mobx';
import { convertBux } from '../../terrain/mapFileEncryption';
import { onLanguageChanged } from '@/i18n';
import { downloadDataFile } from './dataFolder';
import { decodeLocalText, downloadLocalDataFile, repairPackText } from './localData';

/** `MAXHARMONYJEWELOPTIONTYPE` x `MAXHARMONYJEWELOPTIONINDEX`: weapon, staff, defense. */
const HARMONY_TYPES = 3;
const HARMONY_OPTIONS = 10;
/** OptionType, name 60, MinLevel, 14 values, 14 zen prices. */
const HARMONY_RECORD = 4 + 60 + 4 + 14 * 4 + 14 * 4;
/** `MAX_SOCKET_OPTION_TYPES` x `MAX_SOCKET_OPTION`. */
const SOCKET_TYPES = 3;
const SOCKET_OPTIONS = 50;
/** `SOCKET_OPTION_INFO_FILE`: id, category, name 64, type, 5 values, 6 check bytes, padded. */
const SOCKET_RECORD = 104;
/** `ITEM_ADD_OPTION`: option, value, option, value, type, time (16 bytes with padding). */
const ADD_OPTION_RECORD = 16;
const MAX_ITEM = 16 * 512;

export type HarmonyOption = { readonly name: string; readonly values: readonly number[] };
export type SocketOption = {
  readonly category: number;
  readonly name: string;
  /** `m_bOptionType`: 1 flat, 2 percent, 3 per level, 4 per max life, 5 per max mana. */
  readonly type: number;
  readonly values: readonly number[];
};
export type AddOption = readonly [option: number, value: number];

export type ItemOptionTables = {
  /** `[weapon | staff | defense][option - 1]`, null where the file has none. */
  readonly harmony: readonly (readonly (HarmonyOption | null)[])[];
  /** `[item options | mix bonus | equip bonus][id]`. */
  readonly sockets: readonly (readonly (SocketOption | null)[])[];
  /** By item code: the two options of the 380 item, `[0, 0]` for none. */
  readonly addOptions: readonly (readonly AddOption[])[];
};

/** The whole table is one BuxConvert pass, as the original reads it. */
export function parseHarmonyOptions(bytes: Uint8Array): (HarmonyOption | null)[][] {
  const data = bytes.slice(0, HARMONY_TYPES * HARMONY_OPTIONS * HARMONY_RECORD);
  convertBux(data, data.length);
  const view = new DataView(data.buffer);
  const out: (HarmonyOption | null)[][] = [];
  for (let type = 0; type < HARMONY_TYPES; type++) {
    const row: (HarmonyOption | null)[] = [];
    for (let option = 0; option < HARMONY_OPTIONS; option++) {
      const at = (type * HARMONY_OPTIONS + option) * HARMONY_RECORD;
      if (at + HARMONY_RECORD > data.length || view.getInt32(at, true) <= 0) {
        row.push(null);
        continue;
      }
      const values: number[] = [];
      for (let level = 0; level < 14; level++) values.push(view.getInt32(at + 68 + level * 4, true));
      row.push({ name: repairPackText(decodeLocalText(data, at + 4, 60)), values });
    }
    out.push(row);
  }
  return out;
}

/** One BuxConvert per record (SocketSystem.cpp:590). */
export function parseSocketOptions(bytes: Uint8Array): (SocketOption | null)[][] {
  const out: (SocketOption | null)[][] = [];
  for (let type = 0; type < SOCKET_TYPES; type++) {
    const row: (SocketOption | null)[] = [];
    for (let id = 0; id < SOCKET_OPTIONS; id++) {
      const at = (type * SOCKET_OPTIONS + id) * SOCKET_RECORD;
      const record = bytes.slice(at, at + SOCKET_RECORD);
      if (record.length < SOCKET_RECORD) {
        row.push(null);
        continue;
      }
      convertBux(record, SOCKET_RECORD);
      const view = new DataView(record.buffer);
      const name = repairPackText(decodeLocalText(record, 8, 64));
      const values: number[] = [];
      for (let level = 0; level < 5; level++) values.push(view.getInt32(76 + level * 4, true));
      row.push(name ? { category: view.getInt32(4, true), name, type: record[72], values } : null);
    }
    out.push(row);
  }
  return out;
}

/** The whole table is one BuxConvert pass (ItemAddOptioninfo.cpp:50). */
export function parseItemAddOptions(bytes: Uint8Array): AddOption[][] {
  const data = bytes.slice(0, MAX_ITEM * ADD_OPTION_RECORD);
  convertBux(data, data.length);
  const view = new DataView(data.buffer);
  const out: AddOption[][] = [];
  for (let code = 0; code < MAX_ITEM; code++) {
    const at = code * ADD_OPTION_RECORD;
    if (at + ADD_OPTION_RECORD > data.length) {
      out.push([]);
      continue;
    }
    out.push([
      [data[at], view.getUint16(at + 2, true)],
      [data[at + 4], view.getUint16(at + 6, true)],
    ]);
  }
  return out;
}

const tables = observable.box<ItemOptionTables | null>(null, { deep: false });
let pending: Promise<void> | null = null;

/** Parses the three files into the live tables (the loader's last step, and a test's way in). */
export function loadItemOptionTables(harmony: Uint8Array, sockets: Uint8Array, addOptions: Uint8Array): void {
  const parsed = {
    harmony: parseHarmonyOptions(harmony),
    sockets: parseSocketOptions(sockets),
    addOptions: parseItemAddOptions(addOptions),
  };
  pending ??= Promise.resolve();
  runInAction(() => tables.set(parsed));
}

function load(): void {
  pending = Promise.all([
    downloadLocalDataFile('JewelOfHarmonyOption'),
    downloadLocalDataFile('SocketItem'),
    downloadDataFile('Local/ItemAddOption.bmd'),
  ])
    .then(([harmony, sockets, addOptions]) => {
      if (harmony.length && sockets.length && addOptions.length) loadItemOptionTables(harmony, sockets, addOptions);
    })
    .catch(err => console.warn('Item option tables are missing:', err));
}

/** The option tables, or null until they have loaded (the first call starts the download). */
export function itemOptionTables(): ItemOptionTables | null {
  if (!pending) load();
  return tables.get();
}

// The harmony and socket names are per language.
onLanguageChanged(() => {
  if (pending) load();
});
