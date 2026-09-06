import type { ISystemFactory } from '../world';
import { GameOptions } from '../../common/gameOptions';
import { renderDistanceRanges } from '../../common/renderDistance';

export const CalculateVisibilitySystem: ISystemFactory = world => {
  const query = world.with('transform', 'visibility');

  return {
    update: dt => {
      const terrain = world.terrain;
      if (!terrain) return;

      // Hero-relative load radius, in tiles - the Render distance option
      // (`common/renderDistance.ts`), whose step 0 is the pair this held
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
        }

        return;
      }

      for (const { transform, visibility } of query) {
        visibility.lastChecked -= dt;

        if (visibility.lastChecked > 0) continue;

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
    },
  };
};
