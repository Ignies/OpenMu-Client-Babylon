import monsters from './monsters.json';
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
