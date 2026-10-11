import { localisedNpcName } from '@/controllers/assets';
import type { MonsterRow } from '@/controllers/monsters';
import { t } from '@/i18n';
import { monsters } from './all';

/** The monsters area's lookups over the monster folders (`<name>/index.ts`, one per type). */
export const MonstersDatabase = {
  /** The original table's row for a monster or NPC type, or null when that table does not have it. */
  get(id: number): MonsterRow | null {
    return monsters.get(id);
  },
};

/**
 * What to print for a monster or NPC: the active language pack's name when it
 * has one (`Local/<lang>/NpcName_<Lang>.txt`), else the English name the
 * original table carries, else a placeholder. Everything that keys on a monster
 * still uses `MonstersDatabase.get`; this is only what the player reads.
 */
export function monsterDisplayName(type: number, fallback?: string): string {
  return (
    localisedNpcName(type) ??
    MonstersDatabase.get(type)?.Name ??
    fallback ??
    t('item.monsterFallback', { type })
  );
}

/**
 * The monster's maximum health, or 0 when nothing knows it. The server never
 * puts a monster's health on the wire in this protocol, so the health bar
 * needs a figure to measure the damage it sees against; each monster file's
 * `maxHealth` comes from the server's own definitions
 * ([tools/buildMonsterHealth.ts](../../../tools/buildMonsterHealth.ts)). The
 * table's `HP` is an older version's and is not it.
 */
export function monsterMaxHealth(type: number): number {
  return monsters.maxHealth(type);
}
