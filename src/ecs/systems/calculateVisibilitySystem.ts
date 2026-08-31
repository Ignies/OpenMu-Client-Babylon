import type { ISystemFactory } from '../world';

export const CalculateVisibilitySystem: ISystemFactory = world => {
  const query = world.with('transform', 'visibility');

  // Hero-relative load radius, in tiles. The original has no such radius:
  // RenderObjects (ZzzObject.cpp:3272) draws every 16x16 object block that
  // touches the 2D camera frustum. Babylon frustum-culls the loaded meshes,
  // so this only needs to cover what the camera can possibly see; 16/24 cut
  // long wall pieces (origin far from their visible extent) while on screen.
  const visibleRange = 32;
  const nearbyRange = 40;

  return {
    update: dt => {
      const terrain = world.terrain;
      if (!terrain) return;

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
