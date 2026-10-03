import type { NpcGear } from '@/controllers/monsters';
import { folderTable } from './npcModelTable';
import { CHARACTER_DEFAULT_SCALE } from './monsterModelTable';

/**
 * The player-rig NPC tables, live views of the monster folders (see `folderTable`). The kits
 * themselves are each folder's `gear` and `transformed`.
 */

/** NPCs the original builds as `MODEL_PLAYER` plus a fixed `c->BodyPart[]` / `c->Weapon[]` kit. */
export const GEARED_NPC_TABLE: Readonly<Record<number, NpcGear>> = folderTable('gear', g => g);

/** NPCs the original builds as `MODEL_PLAYER` with `c->Object.SubType` set to a whole-body part file. */
export const TRANSFORMED_NPC_TABLE: Readonly<Record<number, readonly [dir: string, part: string, scale: number]>> =
  folderTable('transformed', t => [t.dir, t.part, t.scale ?? CHARACTER_DEFAULT_SCALE] as const);
