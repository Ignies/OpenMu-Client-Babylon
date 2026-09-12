/**
 * `Data/Local/<pack>/skill_<lang>.bmd` — the skill names in the language the
 * player picked.
 *
 * `SKILL_ATTRIBUTE_FILE_LEGACY` (`GameData/SkillData/SkillStructs.h`): 650
 * fixed records of 88 bytes with a 32-byte name in front, no count, a 4-byte
 * checksum after, each record XOR-ed with the 3-byte Bux key restarting at
 * every record. The record index is the wire skill number, so it lines up with
 * `skillsDatabase.ts` without a table in between.
 *
 * An overlay, like `itemNameFile`: `SKILL_DEFINITIONS` keeps the English name
 * as the identity everything else keys on, and only what the player reads goes
 * through here.
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

const FILE = 'skill';
const RECORD_SIZE = 88;
const NAME_LENGTH = 32;

const names = observable.box<ReadonlyMap<number, string>>(new Map(), {
  deep: false,
});

let pending: Promise<void> | null = null;

function set(map: ReadonlyMap<number, string>): void {
  runInAction(() => names.set(map));
}

/** Skill number -> name. Exported so the record layout can be tested without a fetch. */
export function parseSkillNames(bytes: Uint8Array): Map<number, string> {
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

/** Load the overlay for the active language; a no-op without a pack. */
export function loadSkillNames(): Promise<void> {
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
      if (i18n.language !== wanted || !bytes.length) return;
      const parsed = parseSkillNames(bytes);
      checkPackText(FILE, parsed.values());
      set(parsed);
    })
    .catch(err => {
      console.warn(`Skill names for ${pack.folder} are missing:`, err);
      if (i18n.language === wanted) set(new Map());
    });

  return pending;
}

/** The localised name for a skill number, or undefined for the English one. */
export function localisedSkillName(number: number): string | undefined {
  return names.get().get(number);
}

onLanguageChanged(() => {
  pending = null;
  set(new Map());
  void loadSkillNames();
});

void loadSkillNames();
