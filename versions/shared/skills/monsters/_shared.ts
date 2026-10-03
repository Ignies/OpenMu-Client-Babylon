import { Vector3 } from '@/controllers/render/babylon/exports';
import { entityPos, spawnCrystalShards, type RGB } from '@/controllers/fx';
import { COMBAT_BUS, playSfx } from '@/controllers/sound';
import { monsterRegistry } from '@/controllers/monsters';
import type { SkillCancel } from '@/controllers/skills';
import type { Entity } from '@/ecs/world';

/** eBuff_Defense and eBuff_WizDefense; OpenMU's effect ids are the same. */
export const DEFENSE = 2;
export const WIZ_DEFENSE = 4;

/** MONSTER_MODEL_DEATH_CENTURION and MONSTER_MODEL_SHRIKER (_enum.h:4223, :4225). */
const DEATH_CENTURION = 67;
const SHRIKER = 69;

/** The burst's pieces and height: one per mesh-6 vertex there, scattered over the body here. */
const SHARDS = 20;
const SHARD_HEIGHT = 1.2;
const WHITE: RGB = [1, 1, 1];

/** RenderDestroy_Def only runs in these bodies' render (GMHellas.cpp:2184, :2252). */
function drawsBreak(target: Entity): boolean {
  const def = target.npcType === undefined ? null : monsterRegistry.def(target.npcType);
  const model = def?.model?.type;
  return model === SHRIKER || (model === DEATH_CENTURION && def?.subType === 9);
}

/**
 * SetActionDestroy_Def (GMHellas.cpp:740-755): a monster's Soul Barrier, else its Defense, breaks
 * off; RenderDestroy_Def throws MODEL_STONE_COFFIN + 1 pieces and plays SOUND_HIT_CRISTAL (:757-776).
 */
export const destroyDefense: SkillCancel = (scene, target) => {
  if (target.playerAnimation) return []; // `o->Type != MODEL_PLAYER`
  const broken = target.buffs?.has(WIZ_DEFENSE) ? WIZ_DEFENSE : target.buffs?.has(DEFENSE) ? DEFENSE : null;
  if (broken === null) return [];
  if (drawsBreak(target)) {
    const at = entityPos(target, SHARD_HEIGHT, new Vector3());
    spawnCrystalShards(scene, at, SHARDS, WHITE);
    playSfx('Sound/eHitCristal', at, { bus: COMBAT_BUS, channels: 1 }); // 1 channel (ZzzOpenData.cpp:4849)
  }
  return [broken];
};
