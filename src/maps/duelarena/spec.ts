import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Duel Arena (`WD_64DUELARENA`, `World65`/`Object65`), the plain-data half.
 * Nothing here may import the scene.
 *
 * EncTerrain65.obj places 1347 objects of 31 types; Object65 ships 30 models
 * and every referenced type has one. The C++ is GMDuelArena.cpp:
 * `CreateObject` (:41-50), `MoveObject` (:64-89), `RenderObjectVisual`
 * (:122-164).
 */

/** No `o->BlendMesh` writes. */
export const DUEL_ARENA_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :71-76 hides 35 (×34) and 36 (×59) — nothing drawn in their
 * place; :77-85 hides 34 (×131), the brazier below.
 */
export const DUEL_ARENA_EFFECT_ONLY_TYPES: readonly number[] = [34, 35, 36];

/** The braziers carry their own fire on the light row; the markers nothing. */
export const DUEL_ARENA_EMISSIONS: Partial<Record<number, readonly Emission[]>> =
  {};

/**
 * Type 34 (×131), `MoveObject` :77-85: `L = (rand%3+5)*0.1;
 * AddTerrainLight(x, y, (0.9L, 0.2L, 0.1L), 3)` + hidden — a deep-red
 * brazier, brighter and steadier than the Kanturu one (0.5-0.7 rather than
 * 0.3-0.6). 131 of them ring the four arenas.
 */
export const DUEL_ARENA_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> =
  {
    34: [
      {
        pointRange: 5,
        terrain: {
          range: 3,
          color: [0.9, 0.2, 0.1],
          flicker: { min: 0.5, max: 0.7, steps: 3 },
        },
        emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
      },
    ],
  };
