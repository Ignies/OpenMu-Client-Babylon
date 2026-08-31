import type { ISystemFactory } from '../world';
import { EventBus } from '../../libs/eventBus';
import {
  SAND_SMOKE_RATE,
  raisesSandSmoke,
  spawnHitImpact,
  spawnSandSmoke,
} from '../../common/impactVisuals';

/**
 * Sand smoke and hit impacts: the **consumer** that turns a
 * walking sand monster and the `ObjectHit` packet into `effects` spawns,
 * with the recipes in `common/impactVisuals.ts`.
 *
 * - `MonsterMoveSandSmoke` (ZzzCharacter.cpp:5456): every 25 Hz tick a
 *   walking Tarkan / Kalima monster drops one puff. Frame time is banked
 *   per monster so a 60 Hz frame emits 0 or 1 and a hitch emits the
 *   backlog, as the original's `rand_fps_check(1)` does.
 * - A blow is the `ObjectHit` packet: logic.ts already emits `objectDamaged`
 *   with the struck entity and the health / shield split; the sparks come off
 *   that.
 *
 * The hero's footsteps draw nothing — the original's `PlayWalkSound` is
 * sound only.
 */
export const ImpactEffectSystem: ISystemFactory = world => {
  const walkers = world.with('npcType', 'monsterAnimation', 'transform');
  /** Banked seconds per walking monster, spent a puff at a time. */
  const banked = new WeakMap<object, number>();

  EventBus.on('objectDamaged', ({ entity, healthDamage, shieldDamage }) => {
    if (entity.worldIndex !== undefined && entity.worldIndex !== world.mapIndex) return;
    spawnHitImpact(world.scene, entity, healthDamage, shieldDamage);
  });

  return {
    update: (dt: number) => {
      for (const e of walkers) {
        if (!raisesSandSmoke(e)) {
          banked.delete(e);
          continue;
        }
        let t = (banked.get(e) ?? 0) + dt;
        while (t >= 1 / SAND_SMOKE_RATE) {
          t -= 1 / SAND_SMOKE_RATE;
          spawnSandSmoke(world.scene, e);
        }
        banked.set(e, t);
      }
    },
  };
};
