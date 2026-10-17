// Public API of the monsters controller: code outside this folder imports from here.
import type { MonsterDef } from './monster';
import { MonsterRegistry } from './registry';
import { MonsterModelRegistry, type MonsterModelDef } from './monsterModel';

export { defineMonster } from './monster';
export type { MonsterDef, MonsterLight, MonsterRow, MonsterSound, MonsterStats, MonsterTeleport } from './monster';
export type { MonsterShatter } from './monsterModel';
export type { BodyBlurSheet, BodyCard, BodyCardSpot, BodyFxEmitter, BodyFxGate, BodyGround, BodyParticle, BodyPuff, BodyRibbon, BodyShard, BodyTexture, MonsterBodyFx } from './bodyFx';
export type { NpcGear, NpcGlobalCue, NpcGlobalVoice, NpcIdleRoll, NpcItem, NpcModel, NpcTransform, NpcTrap, NpcVoice } from './npc';
export { MonsterRegistry } from './registry';
export { cueLook, lookState, setLookState, takeLookCue, type LookCueName, type LookStateName } from './lookState';
export { defineMonsterModel, MonsterModelRegistry } from './monsterModel';
export type { MonsterModelDef, MonsterVoiceSlots } from './monsterModel';

/** The game's monsters, filled by the content's monster folders when a version loads. */
export const monsterRegistry = new MonsterRegistry();

export function registerMonsters(defs: Iterable<MonsterDef>): void {
  monsterRegistry.add(defs);
}

/** The game's monster bodies, filled by the content's monster model files when a version loads. */
export const monsterModelRegistry = new MonsterModelRegistry();

export function registerMonsterModels(models: Iterable<MonsterModelDef>): void {
  monsterModelRegistry.add(models);
}
