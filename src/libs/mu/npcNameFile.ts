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
 * read here, and the name is quoted. Every language pack has one, English
 * included: `Eng/NpcName_Eng.txt` is 532 rows covering types 0 to 585 and is
 * this client version's own table, where `monsters.json` is an older
 * version's - 220 types are missing from it entirely and 168 of the names it
 * does have belong to other monsters ("King Orc" for type 84, which is the
 * Chief Skeleton Warrior). So the file is the base table for every language
 * and the JSON is only the fallback under it.
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
 * Load the table for the active language. A no-op only for a language with no
 * pack at all, which falls back to `monsters.json`.
 */
export function loadNpcNames(): Promise<void> {
  if (pending) return pending;

  const pack = i18n.dataPack;
  if (!pack) {
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
  for (const listener of listeners) listener();
}

/** The localised name for a type number, or undefined to use `monsters.json`. */
export function localisedNpcName(type: number): string | undefined {
  return names.get().get(type);
}

const listeners = new Set<() => void>();

/**
 * Called every time the table changes: a pack finished loading, or the
 * language changed and cleared it. Names already snapshotted onto entities
 * (`objectNameInWorld`) have to be walked again on each of those.
 */
export function onNpcNamesChanged(listener: () => void): void {
  listeners.add(listener);
}

onLanguageChanged(() => {
  pending = null;
  set(new Map());
  void loadNpcNames();
});
