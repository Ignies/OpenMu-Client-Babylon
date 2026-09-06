import { EventBus } from '../../libs/eventBus';
import { isKey } from '../../common/keyBindings';
import { isAttackableEntity } from './attackSystem';
import type { Entity, ISystemFactory } from '../world';

/**
 * Keyboard targeting: one key walks the monsters in range, nearest first,
 * and hands the pick to `world.attackTarget` - the same field a click on a
 * monster sets, so everything downstream (the approach walk, the swing
 * loop, the target health bar, the pet's attack command) behaves exactly as
 * it does for a clicked target, including staying on it until it dies.
 *
 * No original analog: the C++ client is mouse-only. It is a hot key like
 * any other, so a player who never binds it never notices.
 */

/** Tiles: a little past the longest bow, so a picked target is worth walking to. */
const TARGET_RANGE = 10;

/** How long a pick stays "the one we are cycling from", in seconds. */
const CYCLE_MEMORY = 4;

function tileDistance(a: Entity, b: Entity): number {
  const ax = ~~a.transform!.pos.x;
  const az = ~~a.transform!.pos.z;
  const bx = ~~b.transform!.pos.x;
  const bz = ~~b.transform!.pos.z;
  return Math.max(Math.abs(ax - bx), Math.abs(az - bz));
}

export const TargetCycleSystem: ISystemFactory = world => {
  let sinceCycle = CYCLE_MEMORY;

  const candidates = (hero: Entity): Entity[] => {
    const list: Entity[] = [];
    for (const e of world.netObjsQuery.entities) {
      if (!e.transform || !isAttackableEntity(world, e)) continue;
      if (tileDistance(hero, e) > TARGET_RANGE) continue;
      list.push(e);
    }
    // Nearest first, then by net id so the walk order is stable while the
    // monsters shuffle around at the same distance.
    return list.sort(
      (a, b) => tileDistance(hero, a) - tileDistance(hero, b) || a.netId! - b.netId!
    );
  };

  EventBus.on('keyPressed', code => {
    if (!isKey('targetNearest', code)) return;

    const hero = world.playerEntity;
    if (!hero || hero.dying) return;

    const list = candidates(hero);
    if (list.length === 0) {
      world.attackTarget = null;
      return;
    }

    // A fresh press after the memory ran out starts again at the nearest;
    // a press while the current pick is still current takes the next one.
    const current = sinceCycle < CYCLE_MEMORY ? world.attackTarget : null;
    const at = current ? list.indexOf(current) : -1;
    world.attackTarget = list[(at + 1) % list.length];
    sinceCycle = 0;
  });

  return {
    update: dt => {
      sinceCycle += dt;
    },
  };
};
