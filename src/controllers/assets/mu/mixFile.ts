/**
 * `Data/Local/Mix.bmd`, the chaos machine recipes, read like `CMixRecipeMgr::OpenRecipeFile`
 * (MixMgr.cpp:1110-1160): one count per mix type, then each type's `MIX_RECIPE` records, each run
 * through the Bux key on its own. See assets/readme.md.
 */

import { observable, runInAction } from 'mobx';
import { convertBux } from '../../terrain/mapFileEncryption';
import { downloadDataFile } from './dataFolder';

/** `MAX_MIX_TYPES`: goblin, chaos weapon, 380 option, castle senior ... detach socket. */
export const MIX_TYPES = 14;
/** `sizeof(MIX_RECIPE)`. */
const RECIPE_SIZE = 656;
const RATE_TOKENS = 32;
const SOURCES = 8;
const SOURCE_SIZE = 40;

/** `MIX_RECIPE_ITEM`: an item kind the recipe takes, by item code, level, option, durability and count. */
export type MixSource = {
  readonly typeMin: number;
  readonly typeMax: number;
  readonly levelMin: number;
  readonly levelMax: number;
  readonly optionMin: number;
  readonly optionMax: number;
  readonly durabilityMin: number;
  readonly durabilityMax: number;
  readonly countMin: number;
  readonly countMax: number;
  /** `RCP_SP_*`: excellent 1, 380 item 2, set item 4, harmony 8, socket item 16. */
  readonly special: number;
};

/** `MIXRATE_TOKEN`: the success rate formula in reading order (`_MIXRATE_OPS`). */
export type MixRateToken = { readonly op: number; readonly value: number };

export type MixRecipe = {
  readonly index: number;
  /** `m_iMixID`: what `ChaosMachineMixRequest` sends. */
  readonly mixId: number;
  /** `GlobalText` ids, 0 for none. */
  readonly names: readonly number[];
  readonly descriptions: readonly number[];
  readonly advice: readonly number[];
  /** The bag space the result needs; -1 for none. */
  readonly width: number;
  readonly height: number;
  readonly requiredLevel: number;
  /** 'A' flat, 'B' per success point, 'C' potion, 'D' harmony refinery. */
  readonly zenType: string;
  readonly zen: number;
  readonly rate: readonly MixRateToken[];
  readonly maxRate: number;
  readonly mixOption: string;
  readonly charmOption: string;
  readonly chaosCharmOption: string;
  readonly sources: readonly MixSource[];
};

function parseRecipe(record: Uint8Array): MixRecipe {
  convertBux(record, RECIPE_SIZE);
  const view = new DataView(record.buffer, record.byteOffset, record.byteLength);
  const int = (at: number) => view.getInt32(at, true);
  const char = (at: number) => String.fromCharCode(record[at]);
  const rate: MixRateToken[] = [];
  const rateCount = Math.min(RATE_TOKENS, Math.max(0, int(64)));
  for (let i = 0; i < rateCount; i++) rate.push({ op: int(68 + i * 8), value: view.getFloat32(72 + i * 8, true) });
  const sources: MixSource[] = [];
  const sourceCount = Math.min(SOURCES, Math.max(0, int(652)));
  for (let i = 0; i < sourceCount; i++) {
    const at = 332 + i * SOURCE_SIZE;
    sources.push({
      typeMin: view.getInt16(at, true),
      typeMax: view.getInt16(at + 2, true),
      levelMin: int(at + 4),
      levelMax: int(at + 8),
      optionMin: int(at + 12),
      optionMax: int(at + 16),
      durabilityMin: int(at + 20),
      durabilityMax: int(at + 24),
      countMin: int(at + 28),
      countMax: int(at + 32),
      special: view.getUint32(at + 36, true),
    });
  }
  return {
    index: int(0),
    mixId: int(4),
    names: [int(8), int(12), int(16)],
    descriptions: [int(20), int(24), int(28)],
    advice: [int(32), int(36), int(40)],
    width: int(44),
    height: int(48),
    requiredLevel: int(52),
    zenType: char(56),
    zen: view.getUint32(60, true),
    rate,
    maxRate: int(324),
    mixOption: char(328),
    charmOption: char(329),
    chaosCharmOption: char(330),
    sources,
  };
}

/** The recipes of every mix type, in file order. */
export function parseMixRecipes(bytes: Uint8Array): MixRecipe[][] {
  const head = bytes.slice(0, MIX_TYPES * 4);
  convertBux(head, head.length);
  const counts = new DataView(head.buffer);
  const out: MixRecipe[][] = [];
  let at = MIX_TYPES * 4;
  for (let type = 0; type < MIX_TYPES; type++) {
    const recipes: MixRecipe[] = [];
    const count = head.length === MIX_TYPES * 4 ? counts.getInt32(type * 4, true) : 0;
    for (let i = 0; i < count && at + RECIPE_SIZE <= bytes.length; i++, at += RECIPE_SIZE) {
      recipes.push(parseRecipe(bytes.slice(at, at + RECIPE_SIZE)));
    }
    out.push(recipes);
  }
  return out;
}

const recipes = observable.box<readonly (readonly MixRecipe[])[] | null>(null, { deep: false });
let pending: Promise<void> | null = null;

/** Parses the file into the live recipes (the loader's last step, and a test's way in). */
export function loadMixRecipes(bytes: Uint8Array): void {
  const parsed = parseMixRecipes(bytes);
  pending ??= Promise.resolve();
  runInAction(() => recipes.set(parsed));
}

/** The recipes by mix type, or null until loaded (the first call starts the download). */
export function mixRecipes(): readonly (readonly MixRecipe[])[] | null {
  if (!pending) {
    pending = downloadDataFile('Local/mix.bmd')
      .then(bytes => {
        if (bytes.length) loadMixRecipes(bytes);
      })
      .catch(err => console.warn('Mix.bmd is missing:', err));
  }
  return recipes.get();
}
