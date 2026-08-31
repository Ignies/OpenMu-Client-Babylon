import type { Emission } from '../../common/effectParticles';
import type { LightEmitter } from '../../lighting/mapObjectLights';

/**
 * Barracks of Balgass (`WD_41CHANGEUP3RD_1ST`, `World42`/`Object42`) and
 * Balgass' Refuge (`WD_42CHANGEUP3RD_2ND`, `World43`/`Object43`), the
 * plain-data half — one table set, because the C++ is one function:
 * `SEASON3A::CGM3rdChangeUp::MoveObject` (GM3rdChangeUp.cpp:63-116) tests
 * `IsBalgasBarrackMap() || IsBalgasRefugeMap()` and the two `Create*Object`
 * entries (:47-61) are bare `return true`s. `maps/balgasrefuge` imports
 * these.
 *
 * EncTerrain42.obj: 1531 objects, 61 types; EncTerrain43.obj: 354 objects,
 * 36 types. Object42/43 ship 82/84 models, every referenced type present.
 */

/** No `o->BlendMesh` writes; the 57 V scroll is in `meshAnimation.ts`. */
export const BALGAS_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :73-78 hides 2, 5, 58, 59, 60; :79-85 hides 3 (the brazier,
 * see `BALGAS_LIGHTS`); :103-113 hides 85-93. `RenderObjectVisual`
 * (:118-255) gives 2 (Barracks ×45 / Refuge ×10) and 5 (×0) the lava
 * spatter and 58-60 the smoke; 85-93 are the volcano's markers (none placed
 * in either .obj).
 */
export const BALGAS_EFFECT_ONLY_TYPES: readonly number[] = [
  2, 3, 5, 58, 59, 60, 85, 86, 87, 88, 89, 90, 91, 92, 93,
];

/** The lava vents (2) and the smoke columns (58-60). */
export const BALGAS_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  2: [{ kinds: ['fire1', 'fire2'], every: 3, light: [1, 0.5, 0.2] }],
  5: [{ kinds: ['fire1', 'fire2'], every: 3, light: [1, 0.5, 0.2] }],
  58: [{ kinds: ['smoke21'], every: 3 }],
  59: [{ kinds: ['smoke21'], every: 3 }],
  60: [{ kinds: ['smoke22'], every: 3 }],
};

/**
 * Type 3 (Barracks ×39, Refuge ×17), :79-85: `L = (rand%4+3)*0.1;
 * AddTerrainLight(x, y, (L, 0.6L, 0.2L), 3)` + hidden — the brazier, the
 * same recipe as Kanturu 61.
 */
export const BALGAS_LIGHTS: Partial<Record<number, readonly LightEmitter[]>> = {
  3: [
    {
      pointRange: 5,
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.3, max: 0.6, steps: 4 },
      },
      emissions: [{ kinds: ['fire1', 'fire3'], every: 2, jitter: 6 }],
    },
  ],
};
