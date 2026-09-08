import { Store } from './store';
import { nearbyOf } from './common/gmNearby';

export { RADAR_RANGE, type Nearby, type NearbyKind } from './common/gmNearby';

/**
 * What the panel can see of the world right now.
 *
 * Read straight off the ECS every time it is asked, never cached and never
 * made observable: `transform.pos` is written by the movement system on every
 * frame, and wrapping a per-frame value in MobX would re-render the panel
 * sixty times a second to move a number by a tenth of a tile. The panel polls
 * this a few times a second instead, only while it is open - the same bargain
 * the debug menu makes with its live rows.
 *
 * It is only ever *this client's* view. The server tells us about objects in
 * scope and nothing else, so "nearby" means nearby, not "on the server". A
 * game master who wants the whole map still asks the server, with `/online`
 * or `/trace`.
 *
 * The arithmetic lives in `common/gmNearby.ts`, which imports no store and is
 * therefore testable.
 */

export type HeroView = {
  name: string;
  x: number;
  y: number;
  map: number;
  level: number;
  /** `CharacterHeroState`; 3 is Normal. */
  heroState: number;
};

export type WorldView = {
  hero: HeroView | null;
  nearby: readonly import('./common/gmNearby').Nearby[];
  /** What the cursor is over, if it is one of `nearby`. */
  targetNetId: number | null;
};

const EMPTY: WorldView = { hero: null, nearby: [], targetNetId: null };

export function worldView(): WorldView {
  const world = Store.world;
  const hero = world?.playerEntity;
  if (!world || !hero?.transform) return EMPTY;

  const hx = Math.floor(hero.transform.pos.x);
  const hy = Math.floor(hero.transform.pos.z);

  return {
    hero: {
      name: Store.playerData.name,
      x: hx,
      y: hy,
      map: world.mapIndex,
      level: Store.playerData.level,
      heroState: Store.playerData.heroState,
    },
    nearby: nearbyOf(world.netObjsQuery.entities, hx, hy),
    targetNetId: world.currentPointerTarget?.netId ?? null,
  };
}
