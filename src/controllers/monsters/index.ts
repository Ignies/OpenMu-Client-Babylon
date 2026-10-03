// Public API of the monsters controller: code outside this folder imports from here.
import type { MonsterDef } from './monster';
import { MonsterRegistry } from './registry';

export { defineMonster } from './monster';
export type { MonsterDef, MonsterRow, MonsterStats } from './monster';
export { MonsterRegistry } from './registry';

/** The game's monsters, filled by the content's monster folders when a version loads. */
export const monsterRegistry = new MonsterRegistry();

export function registerMonsters(defs: Iterable<MonsterDef>): void {
  monsterRegistry.add(defs);
}
