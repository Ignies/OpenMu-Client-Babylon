import type { Scene } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import { effects } from '../effects';
import { entityPos, tmpA } from '../effects/core';
import { BLOOD_CHIPS, BLOOD_MIST, HIT_SPARKS } from '../effects/recipes';

/**
 * What a landed blow draws - the consumer table for
 * `ecs/systems/impactEffectSystem.ts`, in the shape of `deathVisuals.ts`.
 *
 * A blow is `BITMAP_SPARK` chips from the struck body (the spark loop next
 * to `CreateBlood`, ZzzEffectBlurSpark.cpp:436, throws 20 of them), plus a
 * few blood flecks when health - not just shield - was taken.
 *
 * The **hero never raises dust**: `PlayWalkSound` (ZzzCharacter.cpp:5230)
 * only picks a sound, and no `CreateParticle` in the client is tied to a
 * footfall. The sand a Tarkan monster kicks up walking is the monster's own
 * body effect, `effects/monsterVisuals.ts`.
 */

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
  effects.spawn('particles', scene, at, {
    recipe: HIT_SPARKS,
    count: HIT_SPARK_COUNT,
  });
  if (healthDamage > 0) {
    effects.spawn('particles', scene, at, {
      recipe: BLOOD_CHIPS,
      count: HIT_BLOOD_COUNT,
    });
    effects.spawn('particles', scene, at, {
      recipe: BLOOD_MIST,
      count: HIT_BLOOD_MIST_COUNT,
    });
  }
}
