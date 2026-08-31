/**
 * `Data/Local/<lang>/NpcName_<Lang>.txt` — the monster and NPC names, in the
 * language the player picked.
 *
 * The original ships this as a plain tab-separated text file rather than a
 * `.bmd`, one row per type number:
 *
 * ```
 * // MAX : 512
 * //<a Korean section comment>
 * 84	1	"Chief Skeleton Warrior"
 * 89	1	"Magic Skeleton"
 * ```
 *
 * `//` lines are comments, the middle column is a flag the client does not
 * read here, and the name is quoted. The English file is the same data
 * `monsters.json` carries, so it is not loaded at all: this is an **overlay**
 * that only exists when the active language has a pack, and every lookup falls
 * back to the JSON table. That keeps `Name` the single source of truth for
 * everything the server keys on and makes the localisation additive.
 *
 * Read through `monsterDisplayName()` in `common/monstersDatabase.ts`.
 */

import { observable, runInAction } from 'mobx';
import { i18n, onLanguageChanged } from '../../i18n';
import { resolveDataUrl } from './dataFolder';
import { decodeLocalText } from './localData';

/** `84\t1\t"Chief Skeleton Warrior"` — id, flag, quoted name. */
const ROW = /^\s*(\d+)\s+\d+\s+"([^"]*)"/;

/**
 * Type number → localised name, empty until a pack is loaded.
 *
 * An observable *ref* (the map is swapped whole, never mutated), because the
 * names are read straight out of React renders and the Babylon name tags: a
 * plain variable would load the new language and leave every name already on
 * screen showing the old one until the world was rebuilt.
 */
const names = observable.box<ReadonlyMap<number, string>>(new Map(), {
  deep: false,
});

let pending: Promise<void> | null = null;

function parse(text: string): Map<number, string> {
  const out = new Map<number, string>();

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('//')) continue;
    const hit = ROW.exec(line);
    if (hit) out.set(Number(hit[1]), hit[2]);
  }

  return out;
}

/**
 * Load the overlay for the active language. A no-op for a language with no
 * pack, and for English — `monsters.json` already holds those names.
 */
export function loadNpcNames(): Promise<void> {
  if (pending) return pending;

  const pack = i18n.dataPack;
  if (!pack || pack.folder === 'Eng') {
    set(new Map());
    pending = Promise.resolve();
    return pending;
  }

  // `NpcName_Spn.txt` — the folder is capitalised in the file name too.
  const url = resolveDataUrl(`Local/${pack.folder}/NpcName_${pack.folder}.txt`);
  const wanted = i18n.language;

  pending = fetch(url)
    .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then(buffer => {
      // Two changes in quick succession: the slower fetch must not land on
      // top of the language that is current by the time it answers.
      if (i18n.language !== wanted) return;
      const bytes = new Uint8Array(buffer);
      set(parse(decodeLocalText(bytes, 0, bytes.length)));
    })
    .catch(err => {
      console.warn(`NPC names for ${pack.folder} are missing:`, err);
      if (i18n.language === wanted) set(new Map());
    });

  return pending;
}

function set(map: ReadonlyMap<number, string>): void {
  runInAction(() => names.set(map));
}

/** The localised name for a type number, or undefined to use `monsters.json`. */
export function localisedNpcName(type: number): string | undefined {
  return names.get().get(type);
}

onLanguageChanged(() => {
  pending = null;
  set(new Map());
  void loadNpcNames();
});
