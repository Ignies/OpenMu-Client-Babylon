import type { Scene } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import { effects } from '../effects';
import { entityPos, tmpA } from '../effects/core';
import { BLOOD_CHIPS, BLOOD_MIST, HIT_SPARKS, SAND_SMOKE } from '../effects/recipes';
import { MonsterActionType } from './objects/enum';
import { monsterModelTypeOf } from './playSpeed';

/**
 * What a walking sand-monster and a landed blow draw — the consumer table for
 * `ecs/systems/impactEffectSystem.ts` ("Footstep dust / hit
 * impacts"), in the shape of `deathVisuals.ts`.
 *
 * - **Sand smoke**: `MonsterMoveSandSmoke` (ZzzCharacter.cpp:5456): while a
 *   Tarkan / Kalima monster plays `MONSTER01_WALK` it drops one
 *   `BITMAP_SMOKE + 1` puff per 25 Hz tick (`rand_fps_check(1)`), anywhere
 *   within ±100 cm of its origin, on the ground. The **hero never raises
 *   dust**: `PlayWalkSound` (:5230) only picks a sound, and no
 *   `CreateParticle` in the client is tied to a footfall — walking Lorencia
 *   stone, Noria grass or Devias snow draws nothing.
 * - **Blow**: `BITMAP_SPARK` chips from the struck body (the spark loop next
 *   to `CreateBlood`, ZzzEffectBlurSpark.cpp:436, throws 20 of them), plus a
 *   few blood flecks when health — not just shield — was taken.
 */

// ---- sand smoke ------------------------------------------------------------------

/**
 * The monster models whose `MoveCharacterVisual` case calls
 * `MonsterMoveSandSmoke` (ZzzCharacter.cpp:5720-5866): Golden Wheel 41,
 * Tantallos 42 (the plain one — its fire-lit `SubType 1` variant burns
 * instead, and the client has no SubType yet), Bloody Wolf 43, Beam Knight
 * 44, Mutant 45, Red Skeleton Knight 88.
 */
const SAND_SMOKE_MODELS: ReadonlySet<number> = new Set([41, 42, 43, 44, 45, 88]);

/** Puffs per second: `rand_fps_check(1)` is every 25 Hz tick. */
export const SAND_SMOKE_RATE = 25;

/** `rand() % 200 - 100` cm each way. */
const SAND_SMOKE_SCATTER = 1;

/** Whether this entity is a sand monster walking right now. */
export function raisesSandSmoke(e: Entity): boolean {
  return (
    e.monsterAnimation?.action === MonsterActionType.Walk &&
    SAND_SMOKE_MODELS.has(monsterModelTypeOf(e.npcType))
  );
}

/** One `CreateParticle(BITMAP_SMOKE + 1, …)` somewhere under the monster. */
export function spawnSandSmoke(scene: Scene, monster: Entity): void {
  const at = entityPos(monster, 0, tmpA);
  at.x += (Math.random() * 2 - 1) * SAND_SMOKE_SCATTER;
  at.z += (Math.random() * 2 - 1) * SAND_SMOKE_SCATTER;
  effects.spawn('particles', scene, at, { recipe: SAND_SMOKE, count: 1 });
}

// ---- blow ------------------------------------------------------------------------

/** Chips per landed blow: the original's CreateSpark loop throws 20 (at 1.6–2.8 cm a chip). */
const HIT_SPARK_COUNT = 20;
/** Blood flecks when health was taken, and the softer spray behind them. */
const HIT_BLOOD_COUNT = 6;
const HIT_BLOOD_MIST_COUNT = 2;
/** Tiles above the feet a blow lands (the chest; skillVisuals' IMPACT_HEIGHT). */
const HIT_HEIGHT = 0.9;

export function spawnHitImpact(
  scene: Scene,
  target: Entity,
  healthDamage: number,
  shieldDamage: number
): void {
  if (healthDamage + shieldDamage <= 0) return;
  const at = entityPos(target, HIT_HEIGHT, tmpA);
  effects.spawn('particles', scene, at, { recipe: HIT_SPARKS, count: HIT_SPARK_COUNT });
  if (healthDamage > 0) {
    effects.spawn('particles', scene, at, { recipe: BLOOD_CHIPS, count: HIT_BLOOD_COUNT });
    effects.spawn('particles', scene, at, { recipe: BLOOD_MIST, count: HIT_BLOOD_MIST_COUNT });
  }
}
