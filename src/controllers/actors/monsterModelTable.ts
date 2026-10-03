import { monsterRegistry } from '@/controllers/monsters';

/**
 * How a monster type is drawn (`Setting_Monster`, ZzzCharacter.cpp:13795-13866): each monster's own
 * folder says it (`model: { type, scale, hiddenMesh }` in versions/shared/monsters/<name>/index.ts).
 * These read it through the monsters controller, so they answer once a version has loaded.
 */

export function monsterModelFile(modelType: number): string {
  return `Monster/Monster${(modelType + 1).toString().padStart(2, '0')}.glb`;
}
export const FALLBACK_MODEL_TYPE = 0;
export const FALLBACK_SCALE = 0.8;

/** The monster model a type uses, or -1 when its folder names none. */
export function monsterModelTypeOfNpc(npcType: number): number {
  return monsterRegistry.model(npcType)?.type ?? -1;
}

/** `c->Object.Scale` for an NPC type, or -1 when its folder names no model. */
export function monsterScaleOf(npcType: number): number {
  return monsterRegistry.model(npcType)?.scale ?? -1;
}

/** `c->Object.HiddenMesh` for a type that shares a model and hides a mesh, or -1. */
export function monsterHiddenMesh(npcType: number): number {
  return monsterRegistry.model(npcType)?.hiddenMesh ?? -1;
}

/** Whether a type has a monster model at all. */
export function hasMonsterModel(npcType: number): boolean {
  return monsterRegistry.model(npcType) !== null;
}
