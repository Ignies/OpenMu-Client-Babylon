import type { Entity, ISystemFactory } from '../world';
import type { IVector3Like } from '../../controllers/render/babylon/exports';
import { GameOptions } from '@/controllers/settings';
import { renderDistanceRanges } from '../../controllers/render/renderDistance';

/** With `dropDrawCap` on (ours, a crowd option), the most ground items drawn; no normal map comes near it. */
export const MAX_DRAWN_DROPS = 150;
/** A capped drop is looked at again this soon, seconds: it may be among the nearest by then. */
const CAPPED_RECHECK = 0.25;

type Ranked = { visibility: NonNullable<Entity['visibility']>; distance: number };
/** Reused every frame the cap runs; slots past this frame's count sort last. */
const ranked: Ranked[] = [];
const byDistance = (a: Ranked, b: Ranked) => a.distance - b.distance;

/** Hides the visible drops past the nearest `MAX_DRAWN_DROPS` to `hero`. */
export function capDrawnDrops(drops: Iterable<Required<Pick<Entity, 'transform' | 'visibility'>>>, hero: IVector3Like): void {
  let n = 0;
  for (const { transform, visibility } of drops) {
    if (visibility.state !== 'visible') continue;
    const slot = (ranked[n++] ??= { visibility, distance: 0 });
    const dx = transform.pos.x - hero.x;
    const dz = transform.pos.z - hero.z;
    slot.visibility = visibility;
    slot.distance = dx * dx + dz * dz;
  }
  if (n <= MAX_DRAWN_DROPS) return;
  for (let i = n; i < ranked.length; i++) ranked[i].distance = Infinity;
  ranked.sort(byDistance);
  for (let i = MAX_DRAWN_DROPS; i < n; i++) {
    ranked[i].visibility.state = 'hidden';
    ranked[i].visibility.lastChecked = CAPPED_RECHECK;
  }
}

export const CalculateVisibilitySystem: ISystemFactory = world => {
  const query = world.with('transform', 'visibility');
  const drops = world.with('droppedItem', 'transform', 'visibility');

  return {
    update: dt => {
      const terrain = world.terrain;
      if (!terrain) return;

      // Hero-relative load radius, in tiles - the Render distance option
      // (`controllers/render/renderDistance.ts`), whose step 0 is the pair this held
      // as constants. Babylon frustum-culls the loaded meshes, so the radius
      // only has to cover what the camera can possibly see, and the camera
      // facade's zoom, pitch and FOV all move that horizon.
      const { visible: visibleRange, nearby: nearbyRange } =
        renderDistanceRanges(GameOptions.renderDistance);

      const playerEntity = world.playerEntity;

      if (!playerEntity) {
        for (const { visibility } of query) {
          if (visibility.state === 'visible') continue;

          visibility.state = 'visible';
          visibility.lastChecked = 1;
          visibility.swept = true;
        }

        return;
      }

      for (const { transform, visibility } of query) {
        visibility.lastChecked -= dt;

        if (visibility.lastChecked > 0) continue;

        visibility.swept = true;

        const distance = Math.sqrt(
          Math.pow(transform.pos.x - playerEntity.transform.pos.x, 2) +
            Math.pow(transform.pos.z - playerEntity.transform.pos.z, 2)
        );

        if (distance <= visibleRange) {
          visibility.state = 'visible';
          visibility.lastChecked = 0.2;
        } else if (distance <= nearbyRange) {
          visibility.state = 'nearby';
          visibility.lastChecked = 0.3;
        } else {
          visibility.state = 'hidden';
          visibility.lastChecked = 1;
        }
      }

      if (GameOptions.dropDrawCap && drops.size > MAX_DRAWN_DROPS) capDrawnDrops(drops, playerEntity.transform.pos);
    },
  };
};
