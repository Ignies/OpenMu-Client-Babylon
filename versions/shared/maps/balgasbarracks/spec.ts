import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting/mapObjectLights';
import type { MeshAnimations } from '@/controllers/render';
import { saw } from '../shared/meshAnimation';

/**
 * Barracks of Balgass (`WD_41CHANGEUP3RD_1ST`, `World42`/`Object42`) and
 * Balgass' Refuge (`WD_42CHANGEUP3RD_2ND`, `World43`/`Object43`), the
 * plain-data half - one table set, because the C++ is one function:
 * `SEASON3A::CGM3rdChangeUp::MoveObject` (GM3rdChangeUp.cpp:63-116) tests
 * `IsBalgasBarrackMap() || IsBalgasRefugeMap()` and the two `Create*Object`
 * entries (:47-61) are bare `return true`s. `versions/shared/maps/balgasrefuge` imports
 * these.
 *
 * EncTerrain42.obj: 1531 objects, 61 types; EncTerrain43.obj: 354 objects,
 * 36 types. Object42/43 ship 82/84 models, every referenced type present.
 */

/** No `o->BlendMesh` writes; the 57 V scroll is in the `render.meshAnimations` rows. */
export const BALGAS_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject` :73-78 hides 2, 5, 58, 59, 60; :79-85 hides 3 (the brazier,
 * see `BALGAS_LIGHTS`); :103-113 hides 85-93. `RenderObjectVisual`
 * (:110-256) gives 2 (Barracks ×45 / Refuge ×10) the lava glow, 5 (×0)
 * smoke puffs and 58-60 (×0) waterfall drops; 85-93 are the volcano's markers, of which 85, 88,
 * 89 and 92 are placed and drawn (the Refuge places 92 five times; its fire sound is in `sound.ts`).
 */
export const BALGAS_EFFECT_ONLY_TYPES: readonly number[] = [
  2, 3, 5, 58, 59, 60, 85, 86, 87, 88, 89, 90, 91, 92, 93,
];

const EMBER: [number, number, number] = [0, 0, 0];

/** 89's `((rand() % 3) * 0.01 + 0.015, 0, 0)` (:221-222), one tuple refilled per spawn. */
function emberRed(): readonly [number, number, number] {
  EMBER[0] = Math.floor(Math.random() * 3) * 0.01 + 0.015;
  return EMBER;
}

/**
 * The lava vents (2): a `BITMAP_SMOKE` SubType 13 glow one tick in three (:119-125). 5 (:133-153):
 * two `rand_fps_check(2)` a tick each step `o->Timer`; on 2 (mod 4) the first makes
 * `BITMAP_ADV_SMOKE + 1` and `BITMAP_ADV_SMOKE` SubType 0, on 0 the second `BITMAP_CLOUD` SubType 6
 * and `BITMAP_ADV_SMOKE` SubType 1: each pair one tick in eight. White, and none reads the scale.
 * 58-60 (:173-186), white at `o->Scale`: `BITMAP_WATERFALL_1` SubType 2 one tick in two,
 * `BITMAP_WATERFALL_2` SubType 1 one in three, `BITMAP_WATERFALL_3` SubType 3 every tick.
 *
 * The volcano (Barracks 85 ×6, 88 ×4, 89 ×50; Refuge 88 ×1, 89 ×4), at `o->Scale`. 85 (:187-210)
 * walks `o->Timer` as 5 does: on 2 (mod 4) `BITMAP_ADV_SMOKE + 1` SubType 1 behind one more
 * `rand_fps_check(2)` (one tick in sixteen) and `BITMAP_ADV_SMOKE` SubType 2, on 0 `BITMAP_CLOUD`
 * SubType 14 (dark) and ADV_SMOKE SubType 2 at twice the scale; each move overwrites the light it is
 * made with. 88 (:211-217) a dark `BITMAP_CLOUD` SubType 10 and 89 (:218-225) a faint red SubType 11,
 * each one tick in four. 92 is the fire pillar, `BalgasFirePillarObject`.
 */
export const BALGAS_EMISSIONS: Partial<Record<number, readonly Emission[]>> = {
  2: [{ kinds: ['smoke13'], every: 3 }],
  5: [
    { kinds: ['fi02_0'], every: 8 },
    { kinds: ['fi01_0'], every: 8 },
    { kinds: ['cloud6'], every: 8 },
    { kinds: ['fi01_1'], every: 8 },
  ],
  58: [{ kinds: ['waterfall1_2'], every: 2 }],
  59: [{ kinds: ['waterfall2_1'], every: 3 }],
  60: [{ kinds: ['waterfall3_3'], every: 1 }],
  85: [
    { kinds: ['fi02_1'], every: 16 },
    { kinds: ['fi01_2'], every: 8 },
    { kinds: ['cloud14'], every: 8 },
    { kinds: ['fi01_2'], every: 8, scale: 2 },
  ],
  88: [{ kinds: ['cloud10'], every: 4 }],
  89: [{ kinds: ['cloud11'], every: 4, light: emberRed }],
};

/**
 * Type 3 (Barracks ×39, Refuge ×17), :79-85: `L = (rand%4+3)*0.1;
 * AddTerrainLight(x, y, (L, 0.6L, 0.2L), 3)` + hidden - the brazier, the
 * same recipe as Kanturu 61: `RenderObjectVisual` :126-132 adds a
 * `BITMAP_TRUE_FIRE` particle one tick in three (`trueFire`).
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
      emissions: [{ kinds: ['trueFire'], every: 3 }],
    },
  ],
};

/** Balgas Barracks / Refuge (GM3rdChangeUp.cpp:87-89): the lava sheet. */
export const BALGAS_MESH_ANIMATIONS: MeshAnimations = {
  57: { mesh: 0, kind: 'blend', v: saw(10000, 0.0002) },
};
