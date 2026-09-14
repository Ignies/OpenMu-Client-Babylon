import { isKnownObjectType } from '../common/modelFactoryPerId';
import { NPC_MODEL_TABLE } from '../common/npcs/npcModelTable';
import { GEARED_NPC_TABLE, TRANSFORMED_NPC_TABLE } from '../common/npcs/playerNpcTables';
import { monsterDisplayName } from '../common/monstersDatabase';
import { itemBaseName } from '../common/itemsDatabase';
import {
  buildMonsterCatalogue,
  buildSkinCatalogue,
  type ItemEntry,
  type SkinEntry,
} from './catalogues';

/**
 * The catalogues with the client's own tables plugged in: which numbers
 * have a model, which are the NPCs, and what the language pack calls them.
 * Built once, on first use.
 */

const NPC_NUMBERS = new Set<number>([
  ...Object.keys(NPC_MODEL_TABLE).map(Number),
  ...Object.keys(GEARED_NPC_TABLE).map(Number),
  ...Object.keys(TRANSFORMED_NPC_TABLE).map(Number),
]);

let skins: SkinEntry[] | null = null;
let spawnable: SkinEntry[] | null = null;

/** Every model the client can draw, so every skin a game master can wear and see worn. */
export function skinCatalogue(): readonly SkinEntry[] {
  return (skins ??= buildSkinCatalogue(isKnownObjectType, NPC_NUMBERS));
}

/** Every monster and NPC the server defines, for `/createmonster`. */
export function spawnCatalogue(): readonly SkinEntry[] {
  return (spawnable ??= buildMonsterCatalogue(NPC_NUMBERS));
}

export function skinDisplayName(entry: SkinEntry): string {
  return monsterDisplayName(entry.number, entry.name);
}

export function itemDisplayName(entry: ItemEntry): string {
  return itemBaseName(entry.group, entry.number) || entry.name;
}
