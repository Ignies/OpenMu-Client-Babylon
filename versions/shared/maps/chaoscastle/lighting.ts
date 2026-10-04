import type { MapLighting } from '@/controllers/lighting';

/**
 * Chaos Castle's lighting (`MapLayer.lighting`), read by the lighting
 * controller. One row for every arena: `InChaosCastle()` takes 18-23 and 53
 * alike and `LoadWorld` draws them all from World19 (MapManager.cpp:1217, 1575).
 *
 * No sky: the original clears the frame to black, fog included
 * (`SetClearAndFogColor(0, 0, 0)` for `InChaosCastle()`, SceneManager.cpp:572).
 * The black haze starts eight tiles past the hero at every zoom. No underworld:
 * a fog under the flat floor went black over the frame at a low camera.
 */
export const CHAOS_CASTLE_LIGHTING: MapLighting = {
  look: {
    sky: null,
    fog: { start: 8, density: 0.15, cap: 1, height: 0, color: [0, 0, 0], fromTarget: true },
  },
};
