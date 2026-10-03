import type { LightEmitter } from '@/controllers/lighting';

/**
 * Building blocks the maps' object-light tables (`MapLighting.objectLights`)
 * share. Plain data.
 */

/**
 * A torch or brazier flame at `offset` (MU units, object frame): the
 * `AddTerrainLight` pool, a flickering point light and the fire particles.
 */
export function createFire(
  offset: readonly [number, number, number]
): LightEmitter {
  return {
    offset,
    pointRange: 7,
    wander: 0.12,
    terrain: {
      range: 4,
      color: [1, 0.6, 0.4],
      flicker: { min: 0.6, max: 1, steps: 5 },
    },
    emissions: [
      {
        kinds: ['fire0', 'fire0b'],
        every: 2,
        jitter: 8,
      },
    ],
  };
}
