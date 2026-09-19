import type { ISystemFactory } from '../world';
import { EventBus } from '../../libs/eventBus';
import { spawnHitImpact } from '../../common/impactVisuals';

/**
 * Hit impacts: the **consumer** that turns the `ObjectHit` packet into
 * `effects` spawns, with the recipes in `common/impactVisuals.ts`.
 *
 * A blow is the `ObjectHit` packet: logic.ts already emits `objectDamaged`
 * with the struck entity and the health / shield split; the sparks come off
 * that.
 *
 * The hero's footsteps draw nothing - the original's `PlayWalkSound` is
 * sound only. The sand a walking Tarkan monster raises is its own body
 * effect (`monsterVisualSystem.ts`).
 */
export const ImpactEffectSystem: ISystemFactory = world => {
  EventBus.on('objectDamaged', ({ entity, healthDamage, shieldDamage }) => {
    if (entity.worldIndex !== undefined && entity.worldIndex !== world.mapIndex)
      return;
    spawnHitImpact(world.scene, entity, healthDamage, shieldDamage);
  });

  return { update: () => {} };
};
