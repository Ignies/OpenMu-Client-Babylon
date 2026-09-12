import monsters from './monsters.json';
import monsterHealth from './monsterHealth.json';
import { localisedNpcName } from '../libs/mu/npcNameFile';
import { t } from '../i18n';

export const MonstersDatabase = new (class _MonstersDatabase {
  cache = new Map<number, (typeof monsters)[number]>();

  get(id: number) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }

    const monster = monsters.find(m => m.Numb === id);
    if (monster) {
      this.cache.set(id, monster);
      return monster;
    }

    return null;
  }
})();

/**
 * What to print for a monster or NPC: the active language pack's name when it
 * has one (`Local/<lang>/NpcName_<Lang>.txt`), else the English name the JSON
 * table carries, else a placeholder. Everything that keys on a monster still
 * uses `MonstersDatabase.get`; this is only what the player reads.
 */
export function monsterDisplayName(type: number, fallback?: string): string {
  return (
    localisedNpcName(type) ??
    MonstersDatabase.get(type)?.Name ??
    fallback ??
    t('item.monsterFallback', { type })
  );
}

const MAX_HEALTH: Readonly<Record<string, number>> = monsterHealth;

/**
 * The monster's maximum health, or 0 when nothing knows it. The server never
 * puts a monster's health on the wire in this protocol, so the health bar
 * needs a table to measure the damage it sees against; this one is generated
 * from the server's own monster definitions by
 * [tools/buildMonsterHealth.ts](../../tools/buildMonsterHealth.ts). The
 * `HP` column of `monsters.json` is an older version's and is not it.
 */
export function monsterMaxHealth(type: number): number {
  return MAX_HEALTH[type] ?? 0;
}
